var express = require("express");
var router = express.Router();
const db = require("../database/db");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const { body, param, oneOf, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const uid2 = require("uid2");
const dayjs = require("dayjs");

/* ---------------------------------------------------------------- */
/*                           POST: /sign-up                         */
/* ---------------------------------------------------------------- */

router.post(
	"/sign-up",
	body("username").notEmpty().trim().escape(),
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
			return res.status(400).json({ error: "Invalid field(s)." });
		}
		try {
			const { username, email, password } = req.body;

			// Vérif user
			const emailExists = await db.users.findOne({ email });
			if (emailExists) {
				return res.status(409).json({ error: "Email already exists", field: "email" });
			}

			const usernameExists = await db.users.findOne({ username });
			if (usernameExists) {
				return res.status(409).json({ error: "Username already exists", field: "username" });
			}

			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(password, salt);
			const uid = uid2(32);

			const newUser = new db.users({ username, email, password: hash, uid: uid });

			await newUser.save();

			res.status(201).json({ message: "User created" });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ error: error.message });
		}
	}
);

/* ---------------------------------------------------------------- */
/*                           POST: /sign-in                          */
/* ---------------------------------------------------------------- */

router.post("/sign-in", body(["emailOrUsername", "password"]).notEmpty().trim().escape(), async function (req, res) {
	if (!validationResult(req).isEmpty()) {
		console.error({ errors: validationResult(req).array() });
		return res.status(400).json({ error: "Invalid field(s)." });
	}

	try {
		const { emailOrUsername, password } = req.body;

		// Vérif user
		const existingUser = await db.users.findOne({ $or: [{ email: emailOrUsername }, { username: emailOrUsername }] });
		if (!existingUser) {
			return res.status(404).json({ error: "User not found." });
		}

		// Vérif password
		const isPasswordValid = await bcrypt.compare(password, existingUser.password);
		if (!isPasswordValid) {
			return res.status(401).json({ error: "Incorrect password." });
		}

		// Reset token
		const uid = uid2(32);

		await existingUser.updateOne({ $set: { uid, status: "active", lastLogin: dayjs() } });

		res.status(200).json({ uid });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: error.message });
	}
});

/* ---------------------------------------------------------------- */
/*                          POST: /sign-out                         */
/* ---------------------------------------------------------------- */

router.post("/sign-out", body("uid").notEmpty().isLength(32).escape(), async function (req, res) {
	if (!validationResult(req).isEmpty()) {
		console.error({ errors: validationResult(req).array() });
		return res.status(400).json({ error: "Invalid uid." });
	}

	try {
		const { uid } = req.body;

		// Vérif user
		const existingUser = await db.users.findOne({ uid });
		if (!existingUser) {
			return res.status(404).json({ error: "User not found." });
		} else if (existingUser.status === "inactive") {
			// Vérif status
			return res.status(401).json({ error: "User already signed out." });
		}

		await existingUser.updateOne({ status: "inactive" });
		res.status(200).json({ message: "User signed out." });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: error.message });
	}
});

/* ---------------------------------------------------------------- */
/*                   POST: /forgot-password/:lang                   */
/* ---------------------------------------------------------------- */

router.post(
	"/forgot-password/:lang",
	body("email").notEmpty().isEmail().escape(),
	param("lang").notEmpty().isLocale().escape(),
	async function (req, res) {
		if (!validationResult(req).isEmpty()) {
			console.error({ errors: validationResult(req).array() });
			return res.status(400).json({ error: "Invalid query." });
		}

		try {
			const { email } = req.body;
			const { lang } = req.params;

			// Vérif user
			const existingUser = await db.users.findOne({ email });
			if (!existingUser) {
				return res.status(404).json({ error: "User not found." });
			}

			// Vérif token
			const existingResetToken = await db.resetTokens.findOne({ user: existingUser._id });
			if (existingResetToken) {
				await existingResetToken.deleteOne();
			}

			// Création token
			const resetToken = uid2(32);
			const expirationDate = dayjs().add(30, "minutes").toDate();

			const newResetToken = new db.resetTokens({
				user: existingUser._id,
				token: resetToken,
				expirationDate: expirationDate,
			});

			await newResetToken.save();

			// Envoi mail
			const transporter = nodemailer.createTransport({
				service: "gmail",
				auth: {
					user: process.env.NODEMAILER_EMAIL,
					pass: process.env.NODEMAILER_PASSWORD,
				},
			});

			const resetLink = process.env.FRONTEND_URL + "/reset-password/" + resetToken;
			const templatePath = path.join(__dirname, `../templates/emails/forgotPassword${lang.toUpperCase()}.hbs`);
			const source = fs.readFileSync(templatePath, "utf8");
			const template = handlebars.compile(source);

			const mailOptions = {
				from: process.env.NODEMAILER_EMAIL,
				to: existingUser.email,
				subject: lang === "en" ? "Resetting your Jyogames password" : "Réinitialisation de votre mot de passe Jyogames",
				html: template({ username: existingUser.username, resetLink }),
			};

			await transporter.sendMail(mailOptions);

			res.status(200).json({ resetToken });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ error: error.message });
		}
	}
);

/* ---------------------------------------------------------------- */
/*                      PATCH: /reset-password                      */
/* ---------------------------------------------------------------- */

router.patch(
	"/reset-password",
	body("resetToken").if(body("email").notEmpty()).isLength(32).escape(),
	body("uid").if(body("username").notEmpty()).isLength(32).escape(),
	oneOf([body("resetToken").notEmpty(), body("uid").notEmpty()]),
	body("password")
		.notEmpty()
		.trim()
		.escape()
		.isLength({ min: 8 })
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/),
	async function (req, res) {
		if (!validationResult(req).isEmpty()) {
			console.error({ errors: validationResult(req).array() });
			return res.status(400).json({ error: "Invalid Token or UID." });
		}

		try {
			const { uid, resetToken, password } = req.body;
			let existingUser;

			if (uid) {
				// Vérif user
				existingUser = await db.users.findOne({ uid });
			} else if (resetToken) {
				// Vérif token
				const existingResetToken = await db.resetTokens.findOne({ token: resetToken }).populate("user");
				if (!existingResetToken) {
					return res.status(404).json({ error: "Token not found." });
				}

				// Vérif token expiration
				if (dayjs().isAfter(existingResetToken.expirationDate)) {
					return res.status(401).json({ error: "Token expired." });
				}

				existingUser = existingResetToken.user;
			}

			if (!existingUser) {
				return res.status(404).json({ error: "User not found." });
			}

			// Vérif password
			const isPasswordSame = await bcrypt.compare(password, existingUser.password);
			if (isPasswordSame) {
				return res.status(401).json({ error: "Passwords must be different." });
			}

			// Reset password
			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(password, salt);

			await db.users.updateOne({ _id: existingUser._id }, { password: hash, uid: uid2(32) });

			// Delete reset token
			if (resetToken) {
				await db.resetTokens.deleteOne({ token: resetToken });
			}

			res.status(200).json({ message: "Password reset successfully." });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ error: error.message });
		}
	}
);

module.exports = router;
