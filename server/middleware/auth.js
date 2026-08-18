const jwt = require("jsonwebtoken");
const userModel = require("../models/user");

function getToken(request) {
  const header = request.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

async function requireAuth(request, response, next) {
  try {
    const token = getToken(request);
    if (!token) return response.status(401).json({ error: "Authentication required." });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(payload.userId).select("_id username firstName lastName");
    if (!user) return response.status(401).json({ error: "User account not found." });

    request.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return response.status(401).json({ error: "Invalid or expired authentication token." });
    }
    next(error);
  }
}

module.exports = { requireAuth };
