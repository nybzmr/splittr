const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, "Group name must have 50 characters or fewer."],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  }],
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  creationDatetime: {
    type: Date,
    default: Date.now,
  },
});

groupSchema.index({ members: 1 });

module.exports = mongoose.model("group", groupSchema);
