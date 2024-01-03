const express = require("express");
const router = express.Router();
const db = require("../database/db");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const { signUpRules, signInRules, forgotPwdRules, validateRules } = require("../middleware/checkFields");
const { authenticate } = require("../middleware/authenticate");
const { checkUser } = require("../middleware/checkUser");
const { generateRefreshToken, generateAccessToken } = require("../modules/jwt");
const bcrypt = require("bcrypt");
const uid2 = require("uid2");
const dayjs = require("dayjs");
const jwt = require("jsonwebtoken");

/* ---------------------------------------------------------------- */
/*              Authenticate user upon each path change             */
/* ---------------------------------------------------------------- */

router.get("/auth", authenticate, async function (req, res) {
  try {
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

/* ---------------------------------------------------------------- */
/*                           Sign up user                           */
/* ---------------------------------------------------------------- */

router.post("/sign-up", ...signUpRules(), validateRules, checkUser, async function (req, res) {
  const { username, email, password } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = new db.users({
      username,
      email,
      password: hash,
    });

    await newUser.save();

    res.status(201).json({ message: "User created" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

/* ---------------------------------------------------------------- */
/*                           Sign in user                           */
/* ---------------------------------------------------------------- */

router.post("/sign-in", ...signInRules(), validateRules, checkUser, async function (req, res) {
  const { userId } = req;

  try {
    // Update User Status
    const query = { _id: userId };
    const update = { $set: { status: "active", lastLogin: dayjs() } };
    await db.users.updateOne(query, update);

    // Generate Refresh Token
    const refreshToken = await generateRefreshToken(userId);
    const refreshExp = process.env.JWT_REFRESH_EXPIRATION;
    const refreshExpNum = parseInt(refreshExp.slice(0, refreshExp.length - 1));

    // Store Refresh Token in DB
    const newJwt = new db.jwt({
      user: userId,
      refreshToken: bcrypt.hashSync(refreshToken, 10),
      expirationDate: dayjs().add(refreshExpNum, "day").toDate(),
      createdAt: dayjs().toDate(),
      revoked: false,
    });

    await newJwt.save();

    // Generate Access Token
    const accessToken = generateAccessToken(userId);
    const accessExp = process.env.JWT_ACCESS_EXPIRATION;
    const accessExpNum = parseInt(accessExp.slice(0, accessExp.length - 1));

    res.cookie("refresh-token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: refreshExpNum * 24 * 60 * 60 * 1000,
    });

    res.cookie("access-token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: accessExpNum * 60 * 1000,
    });

    res.cookie("connected", true, {
      secure: process.env.NODE_ENV === "production",
      maxAge: refreshExpNum * 24 * 60 * 60 * 1000,
    });

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

/* ---------------------------------------------------------------- */
/*                           Sign out user                          */
/* ---------------------------------------------------------------- */

router.get("/sign-out", authenticate, checkUser, async function (req, res) {
  const { userId } = req;

  try {
    await db.users.updateOne({ _id: new Object(userId) }, { status: "inactive" });

    res.cookie("refresh-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
    });

    res.cookie("access-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
    });

    res.cookie("connected", "", {
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
    });

    res.status(200).json({ message: "User signed out." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

/* ---------------------------------------------------------------- */
/*                          Forgot password                         */
/* ---------------------------------------------------------------- */

router.post("/forgot-password/:lang", ...forgotPwdRules(), validateRules, checkUser, async function (req, res) {
  try {
    const { lang } = req.params;

    // Vérif token
    const existingResetToken = await db.resetTokens.findOne({
      user: existingUser._id,
    });
    if (existingResetToken) {
      await existingResetToken.deleteOne();
    }

    // Création token
    const resetToken = uid2(32);
    const expirationDate = dayjs().add(30, "minutes").toDate();

    const newResetToken = await new db.resetTokens({
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
});

/* ---------------------------------------------------------------- */
/*                          Reset password                          */
/* ---------------------------------------------------------------- */

/*
router.patch(
  "/reset-password",
  body("resetToken").if(body("email").notEmpty()).isLength({ min: 32, max: 32 }).escape(),
  body("token").if(body("username").notEmpty()).isLength({ min: 32, max: 32 }).escape(),
  oneOf([body("resetToken").notEmpty(), body("token").notEmpty()]),
  body("password")
    .notEmpty()
    .trim()
    .escape()
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/),
  async function (req, res) {
    if (!validationResult(req).isEmpty()) {
      console.error({ errors: validationResult(req).array() });
      return res.status(400).json({ error: "Invalid Token or token." });
    }

    try {
      const { token, resetToken, password } = req.body;
      let existingUser;

      if (token) {
        // Vérif user
        existingUser = await db.users.findOne({ token });
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

      await db.users.updateOne({ _id: existingUser._id }, { password: hash, token: uid2(32) });

      // Delete reset token
      if (resetToken) {
        await db.resetTokens.deleteOne({ token: resetToken });
      }

      res.status(200).json({ message: "Password reset successfully." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  },
);

 */

module.exports = router;
