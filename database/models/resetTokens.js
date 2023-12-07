const mongoose = require("mongoose");

const resetTokenSchema = new mongoose.Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
		token: { type: String, required: true }, // active, inactive, banned
		expirationDate: { type: Date, required: true }, // token
	},
	{ timestamps: true }
);

module.exports = mongoose.models.reset_tokens || new mongoose.model("reset_tokens", resetTokenSchema);
