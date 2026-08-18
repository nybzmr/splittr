const express = require("express");
const expenseController = require("../controllers/expense_controller");
const { asyncHandler, errorHandler } = require("../middleware/errors");
const { validateExpense } = require("../middleware/validation");
const { requireAuth } = require("../middleware/auth");
const { ensureGroupMember } = require("../controllers/group_controller");
const app = express();

app.use(requireAuth);
app.get("/groups/:groupId/expenses", ensureGroupMember, asyncHandler(expenseController.getExpenses));
app.post("/groups/:groupId/expenses", ensureGroupMember, validateExpense, asyncHandler(expenseController.addExpense));
app.use(errorHandler);
module.exports = app;
