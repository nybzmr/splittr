const express = require("express");
const debtController = require("../controllers/debt_controller");
const { asyncHandler, errorHandler } = require("../middleware/errors");
const { validateDebt } = require("../middleware/validation");
const { requireAuth } = require("../middleware/auth");
const { ensureGroupMember } = require("../controllers/group_controller");
const app = express();

app.use(requireAuth);
app.get("/groups/:groupId/debts", ensureGroupMember, asyncHandler(debtController.getDebts));
app.get("/groups/:groupId/optimisedDebts", ensureGroupMember, asyncHandler(debtController.getOptimisedDebts));
app.post("/groups/:groupId/debts/add", ensureGroupMember, validateDebt, asyncHandler(debtController.addDebt));
app.post("/groups/:groupId/debts/settle", ensureGroupMember, validateDebt, asyncHandler(debtController.settleDebt));
app.delete("/groups/:groupId/debts/:from/:to", ensureGroupMember, asyncHandler(debtController.deleteDebtBetweenUsers));
app.use(errorHandler);
module.exports = app;
