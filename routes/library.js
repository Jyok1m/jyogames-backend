const express = require("express");
const router = express.Router();
const db = require("../database/db.js");
const { isValidObjectId } = require("mongoose");

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

router.get("/verify-game/:gameId", async function (req, res) {
  const { gameId } = req.params;

  try {
    if (!isValidObjectId(gameId)) {
      throw new Error("Game ID is incorrect or missing");
    }

    const gameFound = await db.gameLibrary.findOne({ _id: gameId });

    if (!gameFound) {
      throw new Error("Game not found");
    }

    res.json({ message: "Game is valid" });
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
