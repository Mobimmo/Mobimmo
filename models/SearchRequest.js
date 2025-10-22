const mongoose = require("mongoose");

function formatLocalDate(date = new Date()) {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const SearchRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  phone: { type: String, required: true },

  typeBien: { type: String, required: true },       // Ex: "Maison", "Bureau", "Terrain"
  operation: { type: String, required: true },      // Ex: "Location", "Achat"
  meuble: { type: String },                         // "Meublé" / "Non meublé" / null

  ville: { type: String, required: true },          // Ex: "Brazzaville"
  zone: { type: String, required: true },           // Ex: "Makelekele"
  budgetMax: { type: Number, required: true },      // Ex: 300000

  country: { type: String, default: process.env.COUNTRY || "CG" },

  createdAtISO: { type: Date, default: Date.now },
  createdAtLocal: { type: String, default: () => formatLocalDate() }
});

module.exports = mongoose.model("SearchRequest", SearchRequestSchema);
