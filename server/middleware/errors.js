function asyncHandler(handler) {
  return async function (request, response, next) {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

class RequestValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "RequestValidationError";
    this.statusCode = 400;
  }
}

function errorHandler(error, _, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error.name === "ValidationError") {
    response.status(400).json({ error: error.message });
    return;
  }

  if (error.name === "RequestValidationError") {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error.code === 11000) {
    const keyPattern = error.keyPattern || {};
    const duplicateFields = Object.keys(keyPattern);

    if (duplicateFields.includes("inviteCode")) {
      response.status(409).json({ error: "Invite code collision. Please retry creating the group." });
      return;
    }

    if (duplicateFields.includes("username") && duplicateFields.includes("groupId")) {
      response.status(409).json({ error: "This user already has a balance record for this group. The database indexes may need migration." });
      return;
    }

    if (duplicateFields.includes("from") && duplicateFields.includes("to") && duplicateFields.includes("groupId")) {
      response.status(409).json({ error: "This debt already exists. Refresh the group and try again." });
      return;
    }

    response.status(409).json({
      error: duplicateFields.length
        ? `Duplicate resource: ${duplicateFields.join(", ")}.`
        : "Resource already exists.",
    });
    return;
  }

  if (error.type === "entity.parse.failed") {
    response.status(400).json({ error: "Request body must be valid JSON." });
    return;
  }

  response.status(500).json({ error: "Internal server error." });
}

module.exports = {
  asyncHandler,
  errorHandler,
  RequestValidationError,
};
