const express = require("express");
const { asyncHandler, errorHandler } = require("../middleware/errors");
const { requireAuth } = require("../middleware/auth");
const groupController = require("../controllers/group_controller");

const router = express.Router();
router.use(requireAuth);
router.get("/groups", asyncHandler(groupController.listGroups));
router.post("/groups", asyncHandler(groupController.createGroup));
router.post("/groups/join", asyncHandler(groupController.joinGroup));
router.get("/groups/:groupId", asyncHandler(groupController.getGroup));
router.get("/groups/:groupId/dashboard", asyncHandler(groupController.getGroupDashboard));
router.use(errorHandler);
module.exports = router;
