const crypto = require("crypto");
const groupModel = require("../models/group");
const userModel = require("../models/user");
const userDebtModel = require("../models/user_debt");
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

exports.listGroups = async (request, response) => {
  const groups = await groupModel.find({ members: request.user._id }).select("name owner inviteCode creationDatetime members").sort({ creationDatetime: -1 });
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
  });

  await userDebtModel.create({ groupId: group._id, username: request.user.username, netDebt: 0 });
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
  await userDebtModel.create({ groupId: group._id, username: request.user.username, netDebt: 0 });
  response.json(group);
};

exports.getGroup = async (request, response) => {
  const group = await getGroupForUser(request.params.groupId, request.user._id);
  response.json(group);
};

exports.getGroupDashboard = async (request, response) => {
  const group = await getGroupForUser(request.params.groupId, request.user._id);
  const groupId = group._id;
  const [users, expenses, debts, optimisedDebts, userDebts] = await Promise.all([
    userModel.find({ _id: { $in: group.members } }).select("username firstName lastName"),
    require("../models/expense").find({ groupId }).sort({ creationDatetime: -1 }),
    require("../models/debt").find({ groupId }),
    require("../models/optimised_debt").find({ groupId }),
    userDebtModel.find({ groupId }),
  ]);
  response.json({ group, users, expenses, debts, optimisedDebts, userDebts });
};

exports.ensureGroupMember = async (request, _, next) => {
  await getGroupForUser(request.params.groupId, request.user._id);
  request.groupId = request.params.groupId;
  next();
};
