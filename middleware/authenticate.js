const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../database/db");
const { ObjectId } = require("mongodb");
const { generateAccessToken } = require("../modules/jwt");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = await authHeader.split(" ")[1];

    if (token === "null") return res.sendStatus(401); // User not authenticated

    try {
      const decodedToken = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const userId = decodedToken?.user || null;

      req.userId = userId; // User ID
      next();
    } catch (error) {
      console.error(error);
      return res.sendStatus(403);
    }
  } else {
    let refreshToken = req.cookies["refresh-token"];
    let accessToken = req.cookies["access-token"];

    if (!accessToken && !refreshToken) return res.sendStatus(401); // User not authenticated

    if (accessToken) {
      try {
        // Decode access token
        const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);

        // If access token is valid, continue
        req.userId = decoded.user; // User ID
        next();
      } catch (error) {
        console.error(error);
        return next();
      }
    } else if (refreshToken) {
      try {
        // Decode refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const userId = decoded.user;

        // Find user token in database
        const userToken = await db.jwts.findOne({ user: new ObjectId(userId), type: "refresh", revoked: false });

        // If token is not found, return 403
        if (!userToken) return res.sendStatus(404);
        const { token: hashedToken } = userToken;

        // If token is found, compare it with the one in the cookie
        const isMatch = await bcrypt.compare(refreshToken, hashedToken);
        if (!isMatch) return res.sendStatus(403);

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
        return res.sendStatus(403);
      }
    } else {
      return res.sendStatus(401); // User not authenticated
    }
  }
};

module.exports = { authenticate };
