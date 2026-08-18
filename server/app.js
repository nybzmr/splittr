const express = require("express");
const cors = require("cors");
const authRouter = require("./routes/auth.js");
const groupsRouter = require("./routes/groups.js");
const expensesRouter = require("./routes/expenses.js");
const debtsRouter = require("./routes/debts.js");
const { errorHandler } = require("./middleware/errors");

function createApp({ corsOrigin = "http://localhost:3000" } = {}) {
  const app = express();
  app.use(express.json());
  app.use(cors({ origin: corsOrigin }));
  app.get("/health", (_, response) => response.json({ status: "ok" }));
  app.use(authRouter);
  app.use(groupsRouter);
  app.use(expensesRouter);
  app.use(debtsRouter);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
