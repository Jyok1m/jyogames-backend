const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const db = require("../database/db");

const generateRefreshToken = async (userId) => {
  try {
    // Revoke previous refresh tokens
    const query = { user: new ObjectId(userId), type: "refresh", revoked: false };
    const update = { $set: { revoked: true } };
    await db.jwts.updateOne(query, update);

    return jwt.sign(
      { user: userId }, // Payload
      process.env.JWT_REFRESH_SECRET, // Secret key
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRATION, // Expiration time
      },
    );
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
  }
};

const generateAccessToken = (userId) => {
  try {
    return jwt.sign(
      { user: userId }, // Payload
      process.env.JWT_ACCESS_SECRET, // Secret key
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRATION, // Expiration time
      },
    );
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
  }
};

module.exports = { generateRefreshToken, generateAccessToken };
