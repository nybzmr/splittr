const mongoose = require("mongoose");

const userDebtSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "group",
    required: true,
    index: true,
  },
  username: {
    type: String,
    lowercase: true,
    maxlength: [30, "Username must be within 30 characters."],
    required: true,
  },
  netDebt: {
    type: Number,
    required: true,
  },
});

userDebtSchema.index({ groupId: 1, username: 1 }, { unique: true });

module.exports = mongoose.model("user_debt", userDebtSchema);
