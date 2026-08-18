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


exports.updateExpense = async (request, response) => {
  const { groupId } = request;
  const expense = await expenseModel.findOne({ _id: request.params.expenseId, groupId });
  if (!expense) return response.status(404).json({ error: "Expense not found." });
  if (expense.author !== request.user.username) return response.status(403).json({ error: "Only the expense author can edit this expense." });

  const updated = await helpers.withTransaction(async (session) => {
    await helpers.assertUsersInGroup(
      groupId,
      [request.body.lender, ...request.body.borrowers.map(([username]) => username)],
      session,
    );
    expense.title = request.body.title;
    expense.lender = request.body.lender;
    expense.borrowers = request.body.borrowers;
    expense.amount = request.body.amount;
    await expense.save({ session });
    await helpers.rebuildGroupLedger(groupId, session);
    return expense;
  });

  response.json(updated);
};

exports.deleteExpense = async (request, response) => {
  const { groupId } = request;
  const expense = await expenseModel.findOne({ _id: request.params.expenseId, groupId });
  if (!expense) return response.status(404).json({ error: "Expense not found." });
  if (expense.author !== request.user.username) return response.status(403).json({ error: "Only the expense author can delete this expense." });

  await helpers.withTransaction(async (session) => {
    await expenseModel.deleteOne({ _id: expense._id, groupId }).session(session);
    await helpers.rebuildGroupLedger(groupId, session);
  });

  response.json({ message: "Expense deleted successfully." });
};
