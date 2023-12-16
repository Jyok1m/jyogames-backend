const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const dayjs = require("dayjs");

const scoreSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	score: { type: Number },
	lastPlayedAt: { type: Date, default: () => dayjs().toDate() },
});

const poolSchema = new mongoose.Schema({
	cards: [
		{
			cardId: { type: mongoose.Schema.Types.ObjectId, ref: "memory_cards" },
			url: { type: String },
			position: { type: Number },
		},
	],
	firstDrawAt: { type: Date, default: () => dayjs().toDate() },
});

const roundSchema = new mongoose.Schema({
	playedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	nextPlayer: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	cardFound: { type: mongoose.Schema.Types.ObjectId, ref: "memory_cards" },
	date: { type: Date, default: () => dayjs().toDate() },
});

const gameSchema = new mongoose.Schema(
	{
		players: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
		scores: [scoreSchema] || [],
		initialPool: poolSchema,
		roundHistory: [roundSchema] || [],
		startedAt: { type: Date, default: dayjs() },
		endedAt: { type: Date, default: null },
	},
	{ timestamps: true }
);

/* ---------------------------------------------------------------- */
/*                             Méthodes                             */
/* ---------------------------------------------------------------- */

gameSchema.statics.createGame = async function (uids, initialPool) {
	try {
		const users = await mongoose.models.users.find({ uid: { $in: uids } }).select("_id");

		if (users.length === 0) {
			throw new Error("No user found");
		}

		const players = users.map((user) => {
			return user._id;
		});
		const game = await this.create({ players, initialPool: { cards: [...initialPool] } });
		return game;
	} catch (error) {
		throw error;
	}
};

gameSchema.statics.getUsersGames = async function (uid) {
	try {
		const user = await mongoose.models.users.findOne({ uid }).select("_id");
		if (!user) {
			throw new Error("No user found");
		}

		const games = await this.find({ players: user._id, endedAt: null }).lean();
		const currentGames = games.map((game) => {
			const { _id, players, startedAt } = game;
			return { _id, players, startedAt };
		});

		return currentGames;
	} catch (error) {
		throw error;
	}
};

module.exports = mongoose.models.memory_games || new mongoose.model("memory_games", gameSchema);
