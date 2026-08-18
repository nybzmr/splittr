const models = [
  require("../models/group"),
  require("../models/user_debt"),
  require("../models/debt"),
  require("../models/optimised_debt"),
  require("../models/expense"),
];

async function syncDatabaseIndexes() {
  // The group-aware schema introduced compound indexes such as
  // (groupId, username) and (groupId, from, to). Older databases may still
  // contain the pre-group global unique indexes. syncIndexes removes indexes
  // no longer represented by the current schemas and creates the new ones.
  for (const model of models) {
    await model.syncIndexes();
  }
}

module.exports = { syncDatabaseIndexes };
