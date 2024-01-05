const db = {
  gameLibrary: require("./models/games"),
  jwts: require("./models/jwts"),
  memoryCards: require("./models/games/memory/cards"),
  memoryGames: require("./models/games/memory/games"),
  users: require("./models/users")
};

module.exports = db;
