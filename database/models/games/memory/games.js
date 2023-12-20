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

const flippedCardSchema = new mongoose.Schema({
	cardId: { type: mongoose.Schema.Types.ObjectId, ref: "memory_cards" },
	url: { type: String },
	position: { type: Number },
});

const roundSchema = new mongoose.Schema({
	playedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	nextPlayer: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	flippedCards: [flippedCardSchema],
	cardFound: { type: mongoose.Schema.Types.ObjectId, ref: "memory_cards" } || null,
	roundNumber: { type: Number },
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

gameSchema.statics.restartGame = async function (gameId, cardPool) {
	try {
		const query = { _id: gameId };
		const update = {
			$set: {
				scores: [],
				initialPool: { cards: [...cardPool] },
				roundHistory: [],
				startedAt: dayjs().toDate(),
				endedAt: null,
			},
		};

		const game = await this.findOneAndUpdate(query, update);

		return game;
	} catch (error) {
		throw error;
	}
};

gameSchema.statics.logProgression = async function (gameId, uid, flippedCards) {
	try {
		if (flippedCards.length !== 2) {
			throw new Error("Wrong number of cards flipped");
		}

		const game = await this.findById(gameId).populate("players");

		/* -------------------- Recherche de la partie -------------------- */

		if (!game) {
			throw new Error("No game found");
		}

		/* ------------------ Recherche du joueur actuel ------------------ */

		const currentPlayer = game.players.find((player) => player.uid === uid);

		if (!currentPlayer) {
			throw new Error("No player found");
		}

		const currentPlayersIndex = game.players.indexOf(currentPlayer);
		const currentPlayersId = currentPlayer._id;

		/* ------------------ Recherche du joueur suivant ----------------- */

		let nextPlayersId = null;
		if (currentPlayersIndex === game.players.length - 1) {
			nextPlayersId = game.players[0]._id;
		} else {
			nextPlayersId = game.players[currentPlayersIndex + 1]._id;
		}

		/* -------------------- Check if card is found -------------------- */

		const flippedCardA = flippedCards[0];
		const flippedCardB = flippedCards[1];
		let cardJustFound = null;

		if (flippedCardA.cardId === flippedCardB.cardId) {
			cardJustFound = new ObjectId(flippedCardA.cardId);
		}

		/* -------------------- Calculate round number -------------------- */

		const { roundHistory } = game;
		const roundNumber = roundHistory.filter((round) => String(round.playedBy) === String(currentPlayersId)).length + 1;

		/* ------------------------ Calculate score ----------------------- */

		let notFoundCardLength = roundHistory.filter((round) => round.cardFound === null && String(round.playedBy) === String(currentPlayersId)).length;
		let foundCardLength = roundHistory.filter((round) => round.cardFound !== null && String(round.playedBy) === String(currentPlayersId)).length;

		if (cardJustFound) {
			foundCardLength += 1;
		} else {
			notFoundCardLength += 1;
		}

		const isFoundMultiplier = 100;
		const isNotFoundMultiplier = 25;

		const score = foundCardLength * isFoundMultiplier - notFoundCardLength * isNotFoundMultiplier;

		/* ----------------------- Update game data ----------------------- */

		const scoreExists = game.scores.some((score) => String(score.userId) === String(currentPlayersId));

		const query = { _id: gameId };
		const arrayFilters = [{ "elem.userId": currentPlayersId }];
		let update = {};
		let updatedGame = {};

		if (!scoreExists) {
			update = {
				$push: {
					roundHistory: { playedBy: currentPlayersId, nextPlayer: nextPlayersId, flippedCards, cardFound: cardJustFound, roundNumber },
					scores: { userId: currentPlayersId, score: score, lastPlayedAt: dayjs().toDate() },
				},
			};

			updatedGame = await this.findOneAndUpdate(query, update, { new: true });
		} else {
			update = {
				$push: { roundHistory: { playedBy: currentPlayersId, nextPlayer: nextPlayersId, flippedCards, cardFound: cardJustFound, roundNumber } },
				$set: { "scores.$[elem].userId": currentPlayersId, "scores.$[elem].score": score, "scores.$[elem].lastPlayedAt": dayjs().toDate() },
			};

			updatedGame = await this.findOneAndUpdate(query, update, { arrayFilters, new: true });
		}

		/* ------ Compile up-to-date data to send back to the client ------ */

		const roundCount = Math.floor(updatedGame.roundHistory.length / updatedGame.players.length);

		const runningScore = updatedGame.scores.map((score) => {
			const { userId, score: userScore } = score;
			const uid = game.players.find((player) => String(player._id) === String(userId)).uid;

			return { uid, score: userScore };
		});

		const foundCards = updatedGame.roundHistory
			.filter((round) => round.cardFound !== null)
			.map((round) => {
				if (round.cardFound === null) {
					return [];
				}
				const { cardFound } = round;
				return cardFound;
			});

		return { roundCount, runningScore, foundCards, cardJustFound };
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
