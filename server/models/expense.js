const mongoose = require("mongoose");

function isValidBorrowers(borrowers) {
  return (
    Array.isArray(borrowers) &&
    borrowers.length > 0 &&
    borrowers.every((borrower) => {
      return (
        Array.isArray(borrower) &&
        borrower.length === 2 &&
        typeof borrower[0] === "string" &&
        borrower[0].length > 0 &&
        borrower[0].length <= 30 &&
        Number.isInteger(borrower[1]) &&
        borrower[1] > 0
      );
    })
  );
}

const expenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "group",
    required: true,
    index: true,
  },
  title: {
    type: String,
    maxlength: [50, "Title must have 50 characters or fewer."],
    required: true,
  },
  author: {
    type: String,
    lowercase: true,
    required: true,
  },
  creationDatetime: {
    type: Date,
    default: Date.now,
  },
  lender: {
    type: String,
    lowercase: true,
    required: true,
  },
  borrowers: {
    // Each tuple represents a non-lender borrower and the amount they owe in paise.
    type: [[mongoose.Schema.Types.Mixed]],
    required: true,
    validate: {
      validator: isValidBorrowers,
      message: "Borrowers must contain username and positive paise tuples.",
    },
  },
  amount: {
    type: Number,
    required: true,
    min: [1, "Amount must be greater than 0 paise."],
    max: [100000000, "Amount must be less than 100000000 paise."],
  },
});

module.exports = mongoose.model("expense", expenseSchema);
