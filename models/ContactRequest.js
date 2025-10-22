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

const ContactRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  phone: { type: String, required: true },

  country: { type: String, default: process.env.COUNTRY || "CG" },

  createdAtISO: { type: Date, default: Date.now },
  createdAtLocal: { type: String, default: () => formatLocalDate() }
});

module.exports = mongoose.model("ContactRequest", ContactRequestSchema);
