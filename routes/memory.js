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
		const initialCardPool = await db.memoryCards.generateCards();
		const createdGame = await db.memoryGames.createGame(uids, initialCardPool);

		res.json({ message: "Game created", newGame: createdGame });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal Server Error" });
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
