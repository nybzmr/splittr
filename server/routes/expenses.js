const express = require("express");
const expenseController = require("../controllers/expense_controller");
const { asyncHandler, errorHandler } = require("../middleware/errors");
const { validateExpense, validateExpenseUpdate } = require("../middleware/validation");
const { requireAuth } = require("../middleware/auth");
const { ensureGroupMember } = require("../controllers/group_controller");
const app = express();

app.use(requireAuth);
app.get("/groups/:groupId/expenses", ensureGroupMember, asyncHandler(expenseController.getExpenses));
app.post("/groups/:groupId/expenses", ensureGroupMember, validateExpense, asyncHandler(expenseController.addExpense));
app.patch("/groups/:groupId/expenses/:expenseId", ensureGroupMember, validateExpenseUpdate, asyncHandler(expenseController.updateExpense));
app.delete("/groups/:groupId/expenses/:expenseId", ensureGroupMember, asyncHandler(expenseController.deleteExpense));
app.use(errorHandler);
module.exports = app;
