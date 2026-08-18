const helpers = require("./helpers/index");
const expenseModel = require("../models/expense");

exports.addExpense = async (request, response) => {
  const { groupId } = request;
  const expense = await helpers.withTransaction(async (session) => {
    await helpers.assertUsersInGroup(groupId, [request.body.lender, ...request.body.borrowers.map(([username]) => username)], session);

    const expense = new expenseModel({
      groupId,
      title: request.body.title,
      author: request.user.username,
      lender: request.body.lender,
      borrowers: request.body.borrowers,
      amount: request.body.amount,
    });
    await expense.save({ session });

    for (const [borrower, owedAmount] of request.body.borrowers) {
      await helpers.processNewDebt(groupId, borrower, request.body.lender, owedAmount, session);
    }
    await helpers.simplifyDebts(groupId, session);
    return expense;
  });
  response.status(201).json(expense);
};

exports.getExpenses = async (request, response) => {
  const expenses = await expenseModel.find({ groupId: request.groupId }).sort({ creationDatetime: -1 });
  response.json(expenses);
};
