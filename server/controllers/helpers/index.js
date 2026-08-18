const mongoose = require("mongoose");
const Heap = require("heap");
const debtModel = require("../../models/debt");
const userDebtModel = require("../../models/user_debt");
const optimisedDebtModel = require("../../models/optimised_debt");
const userModel = require("../../models/user");

const MAX_TRANSACTION_ATTEMPTS = 5;

function getSessionOptions(session) {
  return session ? { session } : {};
}

function withSession(query, session) {
  return session ? query.session(session) : query;
}

function isTransientTransactionError(error) {
  return typeof error.hasErrorLabel === "function" && error.hasErrorLabel("TransientTransactionError");
}

exports.withTransaction = async function (work) {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt++) {
    try {
      return await mongoose.connection.transaction(work);
    } catch (error) {
      if (attempt === MAX_TRANSACTION_ATTEMPTS || !isTransientTransactionError(error)) throw error;
    }
  }
};

exports.adjustUserDebt = async function (groupId, username, amount, session) {
  await userDebtModel.findOneAndUpdate(
    { groupId, username },
    { $inc: { netDebt: amount } },
    { new: true, runValidators: true, upsert: true, ...getSessionOptions(session) },
  );
};

exports.assertUsersExist = async function (groupId, usernames, session = null) {
  const uniqueUsernames = [...new Set(usernames)];
  const users = await withSession(
    userModel.find({ username: { $in: uniqueUsernames } }).select("username"),
    session,
  );
  const found = new Set(users.map((user) => user.username));
  const missing = uniqueUsernames.filter((username) => !found.has(username));
  if (missing.length > 0) {
    const error = new Error(`Unknown group member${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`);
    error.name = "RequestValidationError";
    error.statusCode = 400;
    throw error;
  }
};

exports.assertUsersInGroup = async function (groupId, usernames, session = null) {
  const uniqueUsernames = [...new Set(usernames)];
  const users = await withSession(
    userModel.find({ username: { $in: uniqueUsernames } }).select("username _id"),
    session,
  );
  const found = new Set(users.map((user) => user.username));
  const missing = uniqueUsernames.filter((username) => !found.has(username));
  if (missing.length > 0) {
    const error = new Error(`User${missing.length === 1 ? "" : "s"} must belong to this group: ${missing.join(", ")}.`);
    error.name = "RequestValidationError";
    error.statusCode = 400;
    throw error;
  }
};

async function incrementDebt(groupId, from, to, amount, session) {
  await debtModel.findOneAndUpdate(
    { groupId, from, to },
    { $inc: { amount } },
    { new: true, runValidators: true, upsert: true, ...getSessionOptions(session) },
  );
}

exports.processNewDebt = async function (groupId, from, to, amount, session = null) {
  await exports.adjustUserDebt(groupId, from, amount, session);
  await exports.adjustUserDebt(groupId, to, -amount, session);

  const reverseDebt = await withSession(debtModel.findOne({ groupId, from: to, to: from }), session);
  let debtAmount = amount;

  if (reverseDebt && reverseDebt.amount > amount) {
    await debtModel.findOneAndUpdate(
      { groupId, from: to, to: from },
      { $inc: { amount: -amount } },
      getSessionOptions(session),
    );
    debtAmount = 0;
  } else if (reverseDebt && reverseDebt.amount <= amount) {
    debtAmount -= reverseDebt.amount;
    await withSession(debtModel.findOneAndDelete({ groupId, from: to, to: from }), session);
  }

  if (debtAmount === 0) {
    return `The new debt was used to cancel out a reverse debt.`;
  }

  await incrementDebt(groupId, from, to, debtAmount, session);
  return `Debt from '${from}' to '${to}' was updated successfully.`;
};

exports.simplifyDebts = async function (groupId, session = null) {
  const minHeapDebt = new Heap((a, b) => a.amount - b.amount);
  const minHeapCredit = new Heap((a, b) => a.amount - b.amount);

  for await (const userDebt of withSession(userDebtModel.find({ groupId }), session)) {
    if (userDebt.netDebt > 0) minHeapDebt.push({ username: userDebt.username, amount: userDebt.netDebt });
    else if (userDebt.netDebt < 0) minHeapCredit.push({ username: userDebt.username, amount: -userDebt.netDebt });
  }

  const optimisedDebts = [];
  while (!minHeapDebt.empty() && !minHeapCredit.empty()) {
    const smallestDebt = minHeapDebt.pop();
    const smallestCredit = minHeapCredit.pop();
    const transactionAmount = Math.min(smallestDebt.amount, smallestCredit.amount);
    optimisedDebts.push({ groupId, from: smallestDebt.username, to: smallestCredit.username, amount: transactionAmount });

    if (transactionAmount < smallestDebt.amount) minHeapDebt.push({ username: smallestDebt.username, amount: smallestDebt.amount - transactionAmount });
    if (transactionAmount < smallestCredit.amount) minHeapCredit.push({ username: smallestCredit.username, amount: smallestCredit.amount - transactionAmount });
  }

  await optimisedDebtModel.deleteMany({ groupId }, getSessionOptions(session));
  if (optimisedDebts.length > 0) {
    await optimisedDebtModel.insertMany(optimisedDebts, { session, ordered: true });
  }
};
