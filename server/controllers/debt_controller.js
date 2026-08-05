const debtModel = require("../models/debt");
const expenseModel = require("../models/expense");
const optimisedDebtModel = require("../models/optimised_debt");
const helpers = require("./helpers/index");

// Get a list of all debts.
exports.getDebts = async (_, response) => {
  const debt = await debtModel.find({});
  response.json(debt);
};

// Get a list of all optimised debts.
exports.getOptimisedDebts = async (_, response) => {
  const optimisedDebt = await optimisedDebtModel.find({});
  response.json(optimisedDebt);
};

// Get a debt by lender and borrower.
exports.getDebtBetweenUsers = async (request, response) => {
  const from = request.params.from.toLowerCase();
  const to = request.params.to.toLowerCase();
  const debt = await debtModel.findOne({
    from,
    to,
  });
  if (!debt) {
    return response.status(404).json({ error: "Debt not found." });
  }
  response.json(debt);
};

// Add a debt between two users.
exports.addDebt = async (request, response) => {
  const message = await helpers.withTransaction(async (session) => {
    await helpers.assertUsersExist(
      [request.body.from, request.body.to],
      session,
    );
    const message = await helpers.processNewDebt(
      request.body.from,
      request.body.to,
      request.body.amount,
      session,
    );
    await helpers.simplifyDebts(session);
    return message;
  });

  response.status(201).json({ message });
};

// Settle a debt by ID.
exports.settleDebt = async (request, response) => {
  const result = await helpers.withTransaction(async (session) => {
    await helpers.assertUsersExist(
      [request.body.from, request.body.to],
      session,
    );
    // A settlement reduces the selected outstanding debt: `from` pays `to`.
    const existingDebt = await debtModel
      .findOne({
        from: request.body.from,
        to: request.body.to,
      })
      .session(session);

    if (!existingDebt || existingDebt.amount < request.body.amount) {
      return {
        status: 400,
        message: "You cannot settle more than the amount of the debt.",
      };
    }

    // If the existing debt is equal to the amount to be settled, then delete
    // the debt. Otherwise, reduce it.
    if (existingDebt.amount === request.body.amount) {
      await debtModel
        .findOneAndDelete({
          from: request.body.from,
          to: request.body.to,
        })
        .session(session);
    } else {
      await debtModel.findOneAndUpdate(
        {
          from: request.body.from,
          to: request.body.to,
        },
        {
          $inc: { amount: -request.body.amount },
        },
        { session },
      );
    }

    // The borrower owes less, and the lender is owed less.
    await helpers.adjustUserDebt(
      request.body.from,
      -request.body.amount,
      session,
    );
    await helpers.adjustUserDebt(
      request.body.to,
      request.body.amount,
      session,
    );

    // Recalculate debts to minimise the number of transactions, as this
    // settlement may have changed the optimal strategy.
    await helpers.simplifyDebts(session);

    const settlement = new expenseModel({
      title: "SETTLEMENT",
      author: request.body.from,
      lender: request.body.from,
      borrowers: [[request.body.to, request.body.amount]],
      amount: request.body.amount,
    });
    await settlement.save({ session });

    const settlementType =
      existingDebt.amount === request.body.amount ? "fully" : "partially";
    const settlementAction =
      existingDebt.amount === request.body.amount ? "deleted" : "reduced";

    return {
      status: 200,
      message: `Debt from '${request.body.from}' to '${request.body.to}' ${settlementType}\
        settled and ${settlementAction} successfully.`,
      settlement,
    };
  });

  if (result.status !== 200) {
    return response.status(result.status).json({ error: result.message });
  }

  response.status(result.status).json({
    message: result.message,
    settlement: result.settlement,
  });
};

// Delete a debt between a lender and borrower.
exports.deleteDebtBetweenUsers = async (request, response) => {
  const from = request.params.from.toLowerCase();
  const to = request.params.to.toLowerCase();
  const result = await helpers.withTransaction(async (session) => {
    // Find the debt first so we know the amount to adjust balances.
    const debt = await debtModel
      .findOne({
        from,
        to,
      })
      .session(session);

    if (!debt) {
      return {
        status: 404,
        message: "Debt not found.",
      };
    }

    // Delete the debt.
    await debtModel
      .deleteOne({
        from,
        to,
      })
      .session(session);

    // Update userDebt balances: the borrower owes less, the lender is owed less.
    await helpers.adjustUserDebt(from, -debt.amount, session);
    await helpers.adjustUserDebt(to, debt.amount, session);

    // Recalculate optimised debts.
    await helpers.simplifyDebts(session);
    return {
      status: 200,
      message: `Debt from '${from}' to '${to}' deleted\
        successfully.`,
    };
  });

  if (result.status !== 200) {
    return response.status(result.status).json({ error: result.message });
  }

  response.status(result.status).json({ message: result.message });
};
