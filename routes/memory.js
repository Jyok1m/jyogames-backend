var express = require("express");
var router = express.Router();

const db = require("../database/db");
const { getCloudFolderContent } = require("../modules/cloudinary.js");

/* ---------------------------------------------------------------- */
/*                          Create new game                         */
/* ---------------------------------------------------------------- */

router.post("/new-game", async function (req, res) {
	const { uids } = req.body;
	try {
		const cardPool = await db.memoryCards.generateCards();
		const createdGame = await db.memoryGames.createGame(uids, cardPool);

		res.json({ message: "Game created", gameData: createdGame });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: error.message });
	}
});

/* ---------------------------------------------------------------- */
/*                        Get existing games                        */
/* ---------------------------------------------------------------- */

router.get("/current-games/:uid", async function (req, res) {
	const { uid } = req.params;
	try {
		const games = await db.memoryGames.getUsersGames(uid);
		res.json({ message: "Games found", currentGames: games });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: error.message });
	}
});

/* ---------------------------------------------------------------- */
/*                           Continue game                          */
/* ---------------------------------------------------------------- */

router.get("/continue-game/:gameId", async function (req, res) {
	const { gameId } = req.params;
	try {
		const game = await db.memoryGames.findById(gameId).populate("players");

		if (!game) {
			throw new Error("No game found");
		}

		const roundCount = Math.floor(game.roundHistory.length / game.players.length);

		const runningScore = game.scores.map((score) => {
			const { userId, score: userScore } = score;
			const uid = game.players.find((player) => String(player._id) === String(userId)).uid;

			return { uid, score: userScore };
		});

		const foundCards = game.roundHistory
			.filter((round) => round.cardFound !== null)
			.map((round) => {
				if (round.cardFound === null) {
					return [];
				}
				const { cardFound } = round;
				return cardFound;
			});

		res.json({ message: "Game found", gameData: game, roundCount, runningScore, foundCards });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: error.message });
	}
});

/* ---------------------------------------------------------------- */
/*                           Restart game                           */
/* ---------------------------------------------------------------- */

router.put("/restart-game/:gameId", async function (req, res) {
	const { gameId } = req.params;
	try {
		const game = await db.memoryGames.findById(gameId);

		if (!game) {
			throw new Error("No game found");
		}

		const cardPool = await db.memoryCards.generateCards();
		const updatedGame = await db.memoryGames.restartGame(gameId, cardPool);

		res.json({ message: "Game restarted", gameData: updatedGame });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: error.message });
	}
});

/* ---------------------------------------------------------------- */
/*                          Log progression                         */
/* ---------------------------------------------------------------- */

router.put("/log-progression/:gameId", async function (req, res) {
	const { gameId } = req.params;
	const { uid, flippedCards } = req.body;

	try {
		const { roundCount, runningScore, foundCards } = await db.memoryGames.logProgression(gameId, uid, flippedCards);

		res.json({ message: "Progression logged", roundCount, runningScore, foundCards });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: error.message });
	}
});

/* ---------------------------------------------------------------- */
/*                Update cards in DB from cloudinary                */
/* ---------------------------------------------------------------- */

router.put("/update-cards", async function (req, res) {
	try {
		const cloudCards = await getCloudFolderContent("games/memory/card-images");
		const bulkOps = cloudCards.map((card) => ({
			updateOne: {
				filter: { assetId: card.asset_id },
				update: {
					assetId: card.asset_id,
					filename: card.filename,
					format: card.format,
					bytes: card.bytes,
					width: card.width,
					height: card.height,
					aspectRatio: card.aspect_ratio,
					pixels: card.pixels,
					url: card.url,
					status: card.status,
					accessMode: card.access_mode,
				},
				upsert: true,
			},
		}));

		await db.memoryCards.bulkWrite(bulkOps);

		res.json({ message: "Cards updated" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

module.exports = router;
