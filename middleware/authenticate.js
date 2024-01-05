const jwt = require("jsonwebtoken");
const db = require("../database/db");
const { ObjectId } = require("mongodb");
const { generateAccessToken } = require("../modules/jwt");

const authenticate = async (req, res, next) => {
  const refreshToken = req.cookies["refresh-token"];
  const accessToken = req.cookies["access-token"];
  const authHeader = req.headers["authorization"];

  const hasCookies = refreshToken || accessToken;

  if (hasCookies) {
    if (accessToken) {
      try {
        // Decode access token
        const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
        const { user: userId } = decoded;

        // If access token is valid, continue
        req.userId = userId; // User ID
        next();
      } catch (error) {
        console.error(error);
        return next();
      }
    } else {
      try {
        // Decode refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const { user: userId } = decoded;

        // Find user token in database
        const userToken = await db.jwts.findOne({ user: new ObjectId(userId), token: refreshToken, revoked: false });

        // If token is not found, return 404
        if (!userToken) return res.status(404).json({ error: "Token not found." });

        // If tokens match, generate new access token
        const accessToken = generateAccessToken(userId);
        const accessExp = process.env.JWT_ACCESS_EXPIRATION;
        const accessExpNum = parseInt(accessExp.slice(0, accessExp.length - 1));

        // Update refresh token expiration date
        res.cookie("access-token", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: accessExpNum * 60 * 1000,
        });

        req.userId = userId; // User ID
        next();
      } catch (error) {
        console.error(error);
        return res.status(403).json({ error: error.message });
      }
    }
  } else if (authHeader) {
    const token = authHeader.split(" ")[1];
    if (token === "null") return res.status(404).json({ error: "User not authenticated." });

    try {
      let decodedToken;
      let userId;

      if (req.path !== "/reset-password") {
        decodedToken = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      } else {
        decodedToken = jwt.verify(token, process.env.JWT_PASSWORD_SECRET);

        const resetToken = db.jwts.findOne({ user: new ObjectId(userId), token, revoked: false });
        if (!resetToken) return res.status(404).json({ error: "Token not found." });
      }

      req.userId = decodedToken?.user || null;

      next();
    } catch (error) {
      console.error(error);
      return res.status(403).json({ error: error.message });
    }
  } else {
    return res.status(401).json({ error: "User not authenticated." });
  }
};

module.exports = { authenticate };
