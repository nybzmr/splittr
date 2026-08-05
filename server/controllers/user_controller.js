const userModel = require("../models/user");
const userDebtModel = require("../models/user_debt");
const debtModel = require("../models/debt");
const expenseModel = require("../models/expense");
const helpers = require("./helpers");

// Get all users.
exports.getUsers = async (_, response) => {
  const users = await userModel.find({});
  response.json(users);
};

exports.getUserByUsername = async (request, response) => {
  const username = request.params.username.toLowerCase();
  const user = await userModel.findOne({ username });
  if (!user) {
    return response.status(404).json({ error: "User not found." });
  }
  response.json(user);
};

exports.addUser = async (request, response) => {
  const user = await helpers.withTransaction(async (session) => {
    const [createdUser] = await userModel.create([{
      username: request.body.username,
      firstName: request.body.firstName,
      lastName: request.body.lastName,
    }], { session });
    await userDebtModel.create([{
      username: request.body.username,
      netDebt: 0,
    }], { session });
    return createdUser;
  });
  response.status(201).json(user);
};

exports.deleteUser = async (request, response) => {
  const username = request.params.username.toLowerCase();
  const user = await userModel.findOne({ username });
  if (!user) {
    return response.status(404).json({ error: "User not found." });
  }

  const [debt, expense] = await Promise.all([
    debtModel.findOne({ $or: [{ from: username }, { to: username }] }),
    expenseModel.findOne({
      $or: [
        { author: username },
        { lender: username },
        {
          borrowers: {
            $elemMatch: {
              $elemMatch: { $eq: username },
            },
          },
        },
      ],
    }),
  ]);
  if (debt || expense) {
    return response.status(409).json({
      error: "A user with expense history or outstanding debts cannot be deleted.",
    });
  }

  await helpers.withTransaction(async (session) => {
    await userModel.deleteOne({ username }, { session });
    await userDebtModel.deleteOne({ username }, { session });
  });
  response.status(204).end();
};
