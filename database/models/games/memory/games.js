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
	const players = uids.map((uid) => new ObjectId(uid));
	const game = await this.create({ players, initialPool: { cards: [...initialPool] } });
	return game;
};

module.exports = mongoose.models.memory_games || new mongoose.model("memory_games", gameSchema);
