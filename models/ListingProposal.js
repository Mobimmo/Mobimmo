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

const ListingProposalSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  phone: { type: String, required: true },

  typeBien: { type: String, required: true },         // "Maison", "Bureau", "Terrain"
  operation: { type: String, required: true },        // "Location" ou "Vente"
  meuble: { type: String },                           // "Meublé" / "Non meublé" / null

  ville: { type: String, required: true },
  zone: { type: String, required: true },

  loyerOuPrix: { type: Number, required: true },      // Prix ou Loyer en FCFA
  caution: { type: Number },                          // Seulement si location

  country: { type: String, default: process.env.COUNTRY || "CG" },

  createdAtISO: { type: Date, default: Date.now },
  createdAtLocal: { type: String, default: () => formatLocalDate() }
});

module.exports = mongoose.model("ListingProposal", ListingProposalSchema);
