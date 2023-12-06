var express = require("express");
var router = express.Router();
const db = require("../database/db");
const { body, param, oneOf, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const uid2 = require("uid2");
const dayjs = require("dayjs");

/* ---------------------------------------------------------------- */
/*                           POST: Sign up                          */
/* ---------------------------------------------------------------- */

router.post(
	"/sign-up",
	body("nickname").notEmpty().trim().escape(),
	body("email").notEmpty().isEmail().trim().escape(),
	body("password")
		.notEmpty()
		.trim()
		.escape()
		.isLength({ min: 8 })
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/),
	async function (req, res) {
		if (!validationResult(req).isEmpty()) {
			console.error({ errors: validationResult(req).array() });
			return res.status(400).json({ errors: "Invalid field(s)." });
		}
		try {
			const { nickname, email, password } = req.body;
			const existingUser = await db.users.findOne({ email: email });

			if (existingUser) {
				return res.status(409).json({ error: "User already exists" });
			}

			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(password, salt);
			const uid = uid2(32);

			const newUser = new db.users({
				nickname: nickname,
				email: email,
				password: hash,
				uid: uid,
			});

			await newUser.save();

			res.sendStatus(201);
		} catch (error) {
			console.error(error);
			return res.status(500).json({ error: error.message });
		}
	}
);

/* ---------------------------------------------------------------- */
/*                           POST: Sign in                          */
/* ---------------------------------------------------------------- */

router.post(
	"/sign-in",
	body("email").if(body("email").notEmpty()).isEmail().trim().escape(),
	body("nickname").if(body("nickname").notEmpty()).trim().escape(),
	oneOf([body("email").notEmpty(), body("nickname").notEmpty()]),
	body("password")
		.notEmpty()
		.trim()
		.escape()
		.isLength({ min: 8 })
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/),
	async function (req, res) {
		if (!validationResult(req).isEmpty()) {
			console.error({ errors: validationResult(req).array() });
			return res.status(400).json({ errors: "Invalid field(s)." });
		}

		try {
			const { email, nickname, password } = req.body;

			const existingUser = await db.users.findOne({ $or: [{ email }, { nickname }] });
			if (!existingUser) {
				return res.status(404).json({ error: "User not found." });
			}

			const isPasswordValid = await bcrypt.compare(password, existingUser.password);
			if (!isPasswordValid) {
				return res.status(401).json({ error: "Wrong credentials." });
			}

			const uid = uid2(32);

			await existingUser.updateOne({ $set: { uid, status: "active", lastLogin: dayjs() } });

			res.status(200).json({ uid });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ error: error.message });
		}
	}
);

/* ---------------------------------------------------------------- */
/*                          POST: Sign out                          */
/* ---------------------------------------------------------------- */

router.post("/sign-out/:uid", param("uid").notEmpty().isLength(32).escape(), async function (req, res) {
	if (!validationResult(req).isEmpty()) {
		console.error({ errors: validationResult(req).array() });
		return res.status(400).json({ errors: "Invalid field(s)." });
	}

	try {
		const { uid } = req.params;

		const existingUser = await db.users.findOne({ uid: uid }).lean();

		if (!existingUser) {
			return res.status(404).json({ error: "User not found." });
		} else if (existingUser.status === "inactive") {
			return res.status(401).json({ error: "User already signed out." });
		}

		await db.users.updateOne({ uid: uid }, { status: "inactive" });
		res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: error.message });
	}
});

router.post("/forgot-password", function (req, res) {
	res.json({ message: "forgot-password" });
});

router.post("/reset-password", function (req, res) {
	res.json({ message: "reset-password" });
});

module.exports = router;
