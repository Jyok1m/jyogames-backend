const mongoose = require("mongoose").default;
const { ObjectId } = require("mongodb");
const dayjs = require("dayjs");

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  rating: { type: Number },
  comment: { type: String },
});

const gameSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, required: true },
    categories: [{ type: String }],
    description: { type: String, required: true },
    releaseDate: { type: Date, default: () => dayjs().toDate() },
    reviews: [reviewSchema] || [],
    games: [{ type: mongoose.Schema.Types.ObjectId, ref: "games" }],
    thumbnails: [{ type: String }],
  },
  { timestamps: true },
);

gameSchema.statics.addNewGame = async function (title, categories, description, releaseDate) {
  const gameFound = await this.findOne({ title });
  if (gameFound) throw new Error("Game already exists");

  const newGame = new this({ _id: new ObjectId(), title, categories, description, releaseDate: dayjs(releaseDate).toDate() });
  const createdGame = await newGame.save();

  return createdGame;
};

module.exports = mongoose.models.games || new mongoose.model("games", gameSchema);
