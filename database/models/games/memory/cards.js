const mongoose = require("mongoose").default;
const shuffleArray = require("../../../../functions/shuffleArray.js");

const cardSchema = new mongoose.Schema(
  {
    assetId: { type: String },
    filename: { type: String },
    format: { type: String },
    bytes: { type: Number },
    width: { type: Number },
    height: { type: Number },
    aspectRatio: { type: Number },
    pixels: { type: Number },
    url: { type: String },
    status: { type: String },
    accessMode: { type: String },
  },
  { timestamps: true },
);

/* ---------------------------------------------------------------- */
/*                             Méthodes                             */
/* ---------------------------------------------------------------- */

cardSchema.statics.generateCards = async function () {
  const originalSample = await this.aggregate([{ $sample: { size: 8 } }]);
  const shallowCopy = [...originalSample];
  const orderedCardPool = shallowCopy.concat(originalSample);
  const shuffledCardPool = shuffleArray(orderedCardPool);

  const finalCardPool = shuffledCardPool.map((card, index) => {
    return {
      cardId: card._id,
      url: card.url,
      position: index + 1,
    };
  });

  return finalCardPool;
};

module.exports = mongoose.models.memory_cards || new mongoose.model("memory_cards", cardSchema);
