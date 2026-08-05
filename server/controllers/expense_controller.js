const helpers = require("./helpers/index");
const expenseModel = require("../models/expense");

// Add an expense and create the related debts between lender and borrowers.
exports.addExpense = async (request, response) => {
  const expense = await helpers.withTransaction(async (session) => {
    await helpers.assertUsersExist(
      [request.body.author, request.body.lender].concat(
        request.body.borrowers.map(([username]) => username),
      ),
      session,
    );

    // Keep a record of the expense for the history.
    const expense = new expenseModel({
      title: request.body.title,
      author: request.body.author,
      lender: request.body.lender,
      borrowers: request.body.borrowers,
      amount: request.body.amount,
    });

    await expense.save({ session });

    // Loop through each borrower and create/update debts accordingly.
    for (const borrowerInfo of request.body.borrowers) {
      const borrower = borrowerInfo[0];
      // The amount they owe must be handled before this to account for different
      // methods of splitting the expense (e.g. specific amounts, by percentage,
      // etc.).
      const owedAmount = borrowerInfo[1];
      await helpers.processNewDebt(
        borrower,
        request.body.lender,
        owedAmount,
        session,
      );
    }

    // Recalculate debts to minimise the number of transactions, as this
    // settlement may have changed the optimal strategy.
    await helpers.simplifyDebts(session);
    return expense;
  });

  response.status(201).json(expense);
};

// Get all expenses.
exports.getExpenses = async (_, response) => {
  const expenses = await expenseModel.find({});
  response.json(expenses);
};
