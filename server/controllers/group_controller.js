const crypto = require("crypto");
const groupModel = require("../models/group");
const userModel = require("../models/user");
const userDebtModel = require("../models/user_debt");
const debtModel = require("../models/debt");
const optimisedDebtModel = require("../models/optimised_debt");
const expenseModel = require("../models/expense");
const { RequestValidationError } = require("../middleware/errors");
const helpers = require("./helpers");

function makeInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function uniqueInviteCode() {
  let code = makeInviteCode();
  while (await groupModel.exists({ inviteCode: code })) code = makeInviteCode();
  return code;
}

async function ensureUserDebt(groupId, username) {
  await userDebtModel.updateOne(
    { groupId, username },
    { $setOnInsert: { groupId, username, netDebt: 0 } },
    { upsert: true },
  );
}

async function getGroupForUser(groupId, userId) {
  const group = await groupModel.findOne({ _id: groupId, members: userId }).populate("members", "username firstName lastName");
  if (!group) {
    const error = new Error("You are not a member of this group.");
    error.name = "ForbiddenError";
    error.statusCode = 403;
    throw error;
  }
  return group;
}

async function getNetDebt(groupId, username) {
  const record = await userDebtModel.findOne({ groupId, username }).select("netDebt");
  return Number(record?.netDebt || 0);
}

async function allMembersSettled(groupId) {
  const debts = await userDebtModel.find({ groupId }).select("netDebt");
  return debts.every((item) => Number(item.netDebt) === 0);
}

exports.listGroups = async (request, response) => {
  const groups = await groupModel
    .find({ members: request.user._id })
    .select("name owner inviteCode creationDatetime members smartSplitEnabled")
    .sort({ creationDatetime: -1 });
  response.json(groups);
};

exports.createGroup = async (request, response) => {
  const name = String(request.body.name || "").trim();
  if (!name) throw new RequestValidationError("Group name is required.");

  const inviteCode = await uniqueInviteCode();
  const group = await groupModel.create({
    name,
    owner: request.user._id,
    members: [request.user._id],
    inviteCode,
    smartSplitEnabled: false,
  });

  await ensureUserDebt(group._id, request.user.username);
  response.status(201).json(group);
};

exports.joinGroup = async (request, response) => {
  const code = String(request.body.inviteCode || "").trim().toUpperCase();
  if (!code) throw new RequestValidationError("Invite code is required.");

  const group = await groupModel.findOne({ inviteCode: code });
  if (!group) return response.status(404).json({ error: "Group not found for this invite code." });

  if (group.members.some((memberId) => memberId.equals(request.user._id))) {
    return response.json(group);
  }

  group.members.push(request.user._id);
  await group.save();
  await ensureUserDebt(group._id, request.user.username);
  response.json(group);
};

exports.getGroup = async (request, response) => {
  const group = await getGroupForUser(request.params.groupId, request.user._id);
  response.json(group);
};

exports.updateSmartSplit = async (request, response) => {
  const group = await getGroupForUser(request.params.groupId, request.user._id);
  if (typeof request.body.enabled !== "boolean") {
    throw new RequestValidationError("Smart Split enabled state must be a boolean.");
  }
  group.smartSplitEnabled = request.body.enabled;
  await group.save();
  response.json({ enabled: group.smartSplitEnabled });
};

exports.leaveGroup = async (request, response) => {
  const group = await getGroupForUser(request.params.groupId, request.user._id);
  const username = request.user.username;
  const netDebt = await getNetDebt(group._id, username);
  if (netDebt !== 0) {
    return response.status(400).json({ error: "You can leave a group only when your net balance is ₹0.00." });
  }

  if (group.owner.equals(request.user._id)) {
    if (group.members.length > 1) {
      return response.status(400).json({ error: "The group owner cannot leave while other members remain. Transfer ownership or delete the group." });
    }
    return response.status(400).json({ error: "Use Delete group to remove an empty group." });
  }

  group.members = group.members.filter((member) => !member.equals(request.user._id));
  await group.save();
  await userDebtModel.deleteOne({ groupId: group._id, username });
  response.json({ message: "You left the group successfully." });
};

exports.deleteGroup = async (request, response) => {
  const group = await getGroupForUser(request.params.groupId, request.user._id);
  if (!group.owner.equals(request.user._id)) {
    return response.status(403).json({ error: "Only the group owner can delete this group." });
  }

  if (!(await allMembersSettled(group._id))) {
    return response.status(400).json({ error: "The group can be deleted only when every member has a net balance of ₹0.00." });
  }

  await Promise.all([
    expenseModel.deleteMany({ groupId: group._id }),
    debtModel.deleteMany({ groupId: group._id }),
    optimisedDebtModel.deleteMany({ groupId: group._id }),
    userDebtModel.deleteMany({ groupId: group._id }),
  ]);
  await groupModel.deleteOne({ _id: group._id });
  response.json({ message: "Group deleted successfully." });
};

exports.getGroupDashboard = async (request, response) => {
  const group = await getGroupForUser(request.params.groupId, request.user._id);
  const groupId = group._id;
  const [users, expenses, debts, optimisedDebts, userDebts] = await Promise.all([
    userModel.find({ _id: { $in: group.members } }).select("username firstName lastName"),
    expenseModel.find({ groupId }).sort({ creationDatetime: -1 }),
    debtModel.find({ groupId }),
    optimisedDebtModel.find({ groupId }),
    userDebtModel.find({ groupId }),
  ]);
  response.json({ group, users, expenses, debts, optimisedDebts, userDebts });
};

exports.ensureGroupMember = async (request, _, next) => {
  await getGroupForUser(request.params.groupId, request.user._id);
  request.groupId = request.params.groupId;
  next();
};
