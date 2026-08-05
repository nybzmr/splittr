const { RequestValidationError } = require("./errors");

const MAX_USERNAME_LENGTH = 30;
const MAX_NAME_LENGTH = 30;
const MAX_TITLE_LENGTH = 50;
const PAISE_EPSILON = 1e-6;

function normaliseRequiredString(value, fieldName, maxLength) {
  if (typeof value !== "string") {
    throw new RequestValidationError(`${fieldName} must be a string.`);
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    throw new RequestValidationError(`${fieldName} is required.`);
  }

  if (trimmedValue.length > maxLength) {
    throw new RequestValidationError(
      `${fieldName} must have ${maxLength} characters or fewer.`,
    );
  }

  return trimmedValue;
}

function normaliseUsername(value, fieldName = "Username") {
  return normaliseRequiredString(
    value,
    fieldName,
    MAX_USERNAME_LENGTH,
  ).toLowerCase();
}

function normalisePositivePaise(value, fieldName = "Amount") {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new RequestValidationError(
      `${fieldName} must be a finite number of paise.`,
    );
  }

  if (typeof value === "string" && value.trim().length === 0) {
    throw new RequestValidationError(
      `${fieldName} must be a finite number of paise.`,
    );
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw new RequestValidationError(
      `${fieldName} must be a finite number of paise.`,
    );
  }

  const roundedAmount = Math.round(amount);
  if (Math.abs(amount - roundedAmount) > PAISE_EPSILON) {
    throw new RequestValidationError(
      `${fieldName} must be an integer number of paise.`,
    );
  }

  if (roundedAmount <= 0) {
    throw new RequestValidationError(
      `${fieldName} must be greater than 0 paise.`,
    );
  }

  return roundedAmount;
}

function normaliseBorrowers(borrowers) {
  if (!Array.isArray(borrowers) || borrowers.length === 0) {
    throw new RequestValidationError("Borrowers must be a non-empty array.");
  }

  return borrowers.map((borrower, index) => {
    if (!Array.isArray(borrower) || borrower.length !== 2) {
      throw new RequestValidationError(
        `Borrower ${index + 1} must contain a username and amount.`,
      );
    }

    return [
      normaliseUsername(borrower[0], `Borrower ${index + 1} username`),
      normalisePositivePaise(borrower[1], `Borrower ${index + 1} amount`),
    ];
  });
}

function validateUser(request, _, next) {
  request.body = {
    username: normaliseUsername(request.body.username),
    firstName: normaliseRequiredString(
      request.body.firstName,
      "First name",
      MAX_NAME_LENGTH,
    ),
    lastName: normaliseRequiredString(
      request.body.lastName,
      "Last name",
      MAX_NAME_LENGTH,
    ),
  };
  next();
}

function validateDebt(request, _, next) {
  request.body = {
    from: normaliseUsername(request.body.from, "From username"),
    to: normaliseUsername(request.body.to, "To username"),
    amount: normalisePositivePaise(request.body.amount),
  };
  if (request.body.from === request.body.to) {
    throw new RequestValidationError(
      "A debt must be between two different users.",
    );
  }
  next();
}

function validateExpense(request, _, next) {
  const borrowers = normaliseBorrowers(request.body.borrowers);
  const amount = normalisePositivePaise(request.body.amount);
  const borrowerSum = borrowers.reduce((sum, borrower) => sum + borrower[1], 0);

  if (borrowerSum > amount) {
    throw new RequestValidationError(
      "The sum of amounts owed cannot exceed the total expense amount.",
    );
  }

  const lender = normaliseUsername(request.body.lender, "Lender username");
  const borrowerNames = new Set();
  for (const [username] of borrowers) {
    if (username === lender) {
      throw new RequestValidationError("The lender cannot also be a borrower.");
    }
    if (borrowerNames.has(username)) {
      throw new RequestValidationError("Each borrower can only be included once.");
    }
    borrowerNames.add(username);
  }

  request.body = {
    title: normaliseRequiredString(
      request.body.title,
      "Title",
      MAX_TITLE_LENGTH,
    ),
    author: normaliseUsername(request.body.author, "Author username"),
    lender,
    borrowers,
    amount,
  };
  next();
}

module.exports = {
  validateDebt,
  validateExpense,
  validateUser,
};
