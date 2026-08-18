const express = require("express");
const { asyncHandler, errorHandler } = require("../middleware/errors");
const { validateRegistration } = require("../middleware/validation");
const { requireAuth } = require("../middleware/auth");
const authController = require("../controllers/auth_controller");

const router = express.Router();
router.post("/auth/register", validateRegistration, asyncHandler(authController.register));
router.post("/auth/login", asyncHandler(authController.login));
router.get("/auth/me", requireAuth, asyncHandler(authController.me));
router.use(errorHandler);
module.exports = router;
