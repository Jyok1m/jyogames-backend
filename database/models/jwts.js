const mongoose = require("mongoose").default;

const jwtSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    refreshToken: { type: String, required: true },
    expirationDate: { type: Date, required: true },
    createdAt: { type: Date, required: true },
    revoked: { type: Boolean, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.jwts || new mongoose.model("jwts", jwtSchema);
