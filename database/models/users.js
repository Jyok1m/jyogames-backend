const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
	{
		avatar: { type: String, default: "" },
		email: { type: String, required: true },
		favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: "games", default: [] }],
		friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "users", default: [] }],
		games: [{ type: mongoose.Schema.Types.ObjectId, ref: "games", default: [] }],
		lastLogin: { type: Date, default: null },
		password: { type: String, required: true },
		role: { type: String, default: "user" }, // admin, user
		status: { type: String, default: "inactive" }, // active, inactive, banned
		uid: { type: String, required: true }, // token
		username: { type: String, required: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.models.users || new mongoose.model("users", userSchema);
