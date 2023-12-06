var express = require("express");
var router = express.Router();
const db = require("../database/db");

router.post("/sign-up", function (req, res) {
	res.json({ message: "sign-up" });
});

router.post("/sign-in", function (req, res) {
	res.json({ message: "sign-in" });
});

router.post("/sign-out", function (req, res) {
	res.json({ message: "sign-out" });
});

router.post("/forgot-password", function (req, res) {
	res.json({ message: "forgot-password" });
});

router.post("/reset-password", function (req, res) {
	res.json({ message: "reset-password" });
});

module.exports = router;
