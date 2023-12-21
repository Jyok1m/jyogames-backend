var express = require("express");
var router = express.Router();
const { ObjectId } = require("mongodb");
const db = require("../database/db.js");

/* ---------------------------------------------------------------- */
/*                       Add game to catalogue                      */
/* ---------------------------------------------------------------- */

router.post("/add-game", async function (req, res) {
	const { title, categories, description, releaseDate } = req.body;

	try {
		const createdGame = await db.gameLibrary.addNewGame(title, categories, description, releaseDate);

		res.json({ message: "Game added to catalogue", createdGame });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: error.message });
	}
});

/* ---------------------------------------------------------------- */
/*                   Check if game is in catalogue                  */
/* ---------------------------------------------------------------- */

router.get("/load-game/:guid", async function (req, res) {
	const { guid } = req.params;

	try {
		if (!guid || guid.length !== 24) {
			throw new Error("Game ID is missing");
		}

		const gameFound = await db.gameLibrary.findOne({ _id: guid });

		if (!gameFound) {
			throw new Error("Game not found");
		}

		res.json({ message: "Game found", gameFound });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: error.message });
	}
});

/* ---------------------------------------------------------------- */
/*                        Get library content                       */
/* ---------------------------------------------------------------- */

router.get("/", async function (req, res) {
	try {
		const games = await db.gameLibrary.find();

		res.json({ message: "Games found", games });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;
