const debtModel = require("../models/debt");
const expenseModel = require("../models/expense");
const optimisedDebtModel = require("../models/optimised_debt");
const helpers = require("./helpers/index");

exports.getDebts = async (request, response) => response.json(await debtModel.find({ groupId: request.groupId }));
exports.getOptimisedDebts = async (request, response) => response.json(await optimisedDebtModel.find({ groupId: request.groupId }));

exports.addDebt = async (request, response) => {
  const groupId = request.groupId;
  const message = await helpers.withTransaction(async (session) => {
    await helpers.assertUsersInGroup(groupId, [request.body.from, request.body.to], session);
    const message = await helpers.processNewDebt(groupId, request.body.from, request.body.to, request.body.amount, session);
    await helpers.simplifyDebts(groupId, session);
    return message;
  });
  response.status(201).json({ message });
};

exports.settleDebt = async (request, response) => {
  const groupId = request.groupId;
  const result = await helpers.withTransaction(async (session) => {
    await helpers.assertUsersInGroup(groupId, [request.body.from, request.body.to], session);
    const existingDebt = await debtModel.findOne({ groupId, from: request.body.from, to: request.body.to }).session(session);
    if (!existingDebt || existingDebt.amount < request.body.amount) {
      return { status: 400, message: "You cannot settle more than the amount of the debt." };
    }

    if (existingDebt.amount === request.body.amount) {
      await debtModel.findOneAndDelete({ groupId, from: request.body.from, to: request.body.to }).session(session);
    } else {
      await debtModel.findOneAndUpdate(
        { groupId, from: request.body.from, to: request.body.to },
        { $inc: { amount: -request.body.amount } },
        { session },
      );
    }

    await helpers.adjustUserDebt(groupId, request.body.from, -request.body.amount, session);
    await helpers.adjustUserDebt(groupId, request.body.to, request.body.amount, session);
    await helpers.simplifyDebts(groupId, session);

    const settlement = new expenseModel({
      groupId,
      title: "SETTLEMENT",
      author: request.user.username,
      lender: request.body.from,
      borrowers: [[request.body.to, request.body.amount]],
      amount: request.body.amount,
    });
    await settlement.save({ session });

    return {
      status: 200,
      message: `Debt from '${request.body.from}' to '${request.body.to}' settled successfully.`,
      settlement,
    };
  });

  if (result.status !== 200) return response.status(result.status).json({ error: result.message });
  response.json({ message: result.message, settlement: result.settlement });
};

exports.deleteDebtBetweenUsers = async (request, response) => {
  const groupId = request.groupId;
  const from = request.params.from.toLowerCase();
  const to = request.params.to.toLowerCase();
  if (request.user.username !== from && request.user.username !== to) {
    return response.status(403).json({ error: "Only a user involved in this debt can clear it." });
  }
  const result = await helpers.withTransaction(async (session) => {
    const debt = await debtModel.findOne({ groupId, from, to }).session(session);
    if (!debt) return { status: 404, message: "Debt not found." };
    await debtModel.deleteOne({ groupId, from, to }).session(session);
    await helpers.adjustUserDebt(groupId, from, -debt.amount, session);
    await helpers.adjustUserDebt(groupId, to, debt.amount, session);
    await helpers.simplifyDebts(groupId, session);
    return { status: 200, message: `Debt from '${from}' to '${to}' deleted successfully.` };
  });
  if (result.status !== 200) return response.status(result.status).json({ error: result.message });
  response.json({ message: result.message });
};
