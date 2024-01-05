const express = require("express");
const router = express.Router();
const db = require("../database/db");
const { ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const { signUpRules, signInRules, forgotPwdRules, resetPwdRules, validateRules } = require("../middleware/checkFields");
const { authenticate } = require("../middleware/authenticate");
const { checkUser } = require("../middleware/checkUser");
const { generateRefreshToken, generateAccessToken, generatePwdResetToken } = require("../modules/jwt");
const bcrypt = require("bcrypt");
const dayjs = require("dayjs");

/* ---------------------------------------------------------------- */
/*              Authenticate user upon each path change             */
/* ---------------------------------------------------------------- */

router.get("/auth", authenticate, async function (req, res) {
  try {
    res.json({ message: "User authentificated." });
  } catch (error) {
    console.error(error);
    return res.status(500).error({ error: error.message });
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
  const { userId, token } = req;

  try {
    // Update User Status
    const query = { _id: userId };
    const update = { $set: { status: "active", lastLogin: dayjs() } };
    await db.users.updateOne(query, update);

    let refreshToken;
    const refreshExp = process.env.JWT_REFRESH_EXPIRATION;
    const refreshExpNum = parseInt(refreshExp.slice(0, refreshExp.length - 1));

    if (token) {
      refreshToken = token;
    } else {
      // Generate Refresh Token
      refreshToken = await generateRefreshToken(userId);

      // Store Refresh Token in DB
      await db.jwts.create({
        user: new ObjectId(userId),
        token: refreshToken,
        type: "refresh",
        expirationDate: dayjs().add(refreshExpNum, "day").toDate(),
        createdAt: dayjs().toDate(),
        revoked: false,
      });
    }

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

    res.json({ message: "User successfully signed-in" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.mesage });
  }
});

/* ---------------------------------------------------------------- */
/*                           Sign out user                          */
/* ---------------------------------------------------------------- */

router.get("/sign-out", authenticate, async function (req, res) {
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

    res.json({ message: "User successfully signed-out" });
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
    const { userId, email, username } = req;
    const { lang } = req.params;

    // Generate new token
    const resetToken = await generatePwdResetToken(userId);
    const resetExp = process.env.JWT_PASSWORD_EXPIRATION;
    const resetExpNum = parseInt(resetExp.slice(0, resetExp.length - 1));

    // Store reset password Token in DB
    await db.jwts.create({
      user: new ObjectId(userId),
      token: resetToken,
      type: "password",
      expirationDate: dayjs().add(resetExpNum, "minutes").toDate(),
      createdAt: dayjs().toDate(),
      revoked: false,
    });

    // Revoke current refresh token
    await db.jwts.updateOne({ user: new ObjectId(userId), type: "refresh", revoked: false }, { $set: { revoked: true } });
    await db.users.updateOne({ _id: new ObjectId(userId) }, { status: "inactive" });

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
      to: email,
      subject: lang === "en" ? "Resetting your Jyogames password" : "Réinitialisation de votre mot de passe Jyogames",
      html: template({ username, resetLink }),
    };

    await transporter.sendMail(mailOptions);

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

    res.json({ message: "Reset instructions have been sent to your email" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

/* ---------------------------------------------------------------- */
/*                          Reset password                          */
/* ---------------------------------------------------------------- */

router.patch("/reset-password", ...resetPwdRules(), validateRules, authenticate, async function (req, res) {
  try {
    const { password: newPassword } = req.body;
    const { userId } = req;

    const user = await db.users.findById(userId).select("password");
    const { password: hashedPassword } = user;

    const pwdMatch = await bcrypt.compare(newPassword, hashedPassword);

    if (pwdMatch) {
      return res.status(401).json({ error: "Passwords must be different" });
    } else {
      const newHash = await bcrypt.hash(newPassword, 10);

      await user.updateOne({ $set: { password: newHash } });
      await db.jwts.updateOne({ user: new ObjectId(userId), type: "password", revoked: false }, { $set: { revoked: true } });
    }

    res.json({ message: "Password successfully reset" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
