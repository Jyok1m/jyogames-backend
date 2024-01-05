const { ObjectId } = require("mongodb");
const db = require("../database/db");
const bcrypt = require("bcrypt");

const checkUser = async (req, res, next) => {
  const { username, email, emailOrUsername, password } = req.body;
  const { userId: reqUserId } = req;

  try {
    let query = {};

    switch (req.path) {
      case "/sign-up":
        query = { $or: [{ email }, { username }] };
        break;
      case "/sign-in":
        query = { $or: [{ email: emailOrUsername }, { username: emailOrUsername }] };
        break;
      case "/sign-out":
        query = { _id: new ObjectId(reqUserId) };
        break;
      case "/forgot-password":
        query = { email };
        break;
      default:
        break;
    }

    const user = await db.users.findOne(query);

    if (!user) {
      if (req.path === "/sign-up") {
        return next();
      } else {
        return res.status(404).json({ error: "User not found." });
      }
    }

    const { email: userEmail, username: userUsername, _id: userId, password: userPassword, status } = user;

    switch (req.path) {
      case "/sign-up":
        if (userEmail === email) return res.status(409).json({ error: "Email already exists" });
        if (userUsername === username) return res.status(409).json({ error: "Username already exists" });
        break;
      case "/sign-in":
        // Check if passwords match
        const passwordsMatch = await bcrypt.compare(password, userPassword);
        if (!passwordsMatch) return res.status(401).json({ error: "Incorrect password." }); // User not authenticated

        // Check if a refreshToken already exists
        const refreshToken = await db.jwts.findOne({ user: userId, type: "refresh", revoked: false });
        if (refreshToken) req.token = refreshToken.token;

        break;
      case "/sign-out":
        if (status === "inactive") return res.status(401).json({ error: "User already signed out." });
        break;
      default:
        break;
    }

    req.username = userUsername;
    req.email = userEmail;
    req.userId = userId;
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { checkUser };
