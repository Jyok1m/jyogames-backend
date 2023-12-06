const mongoose = require("mongoose");

const scoreSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	score: String,
	lastPlayed: Date,
});

const gameSchema = new mongoose.Schema(
	{
		category: String,
		description: String,
		name: String,
		rating: String,
		releaseDate: String,
		reviews: String,
		scores: [],
		thumbnail: String,
	},
	{ timestamps: true }
);

module.exports = mongoose.models.games || new mongoose.model("games", gameSchema);
