const mongoose = require("mongoose");

const optimisedDebtSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "group",
    required: true,
    index: true,
  },
  from: {
    type: String,
    lowercase: true,
    maxlength: [30, "Username must be within 30 characters."],
    required: true,
  },
  to: {
    type: String,
    lowercase: true,
    maxlength: [30, "Username must be within 30 characters."],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [1, "Amount must be greater than 0 paise."],
  },
});

optimisedDebtSchema.index({ groupId: 1, from: 1, to: 1 }, { unique: true });

module.exports = mongoose.model("optimised_debt", optimisedDebtSchema);
