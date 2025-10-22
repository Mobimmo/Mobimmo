// -----------------------------
// Importations
// -----------------------------
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----------------------------
// Connexion MongoDB
// -----------------------------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connexion MongoDB OK"))
  .catch((err) => console.error("❌ Erreur MongoDB :", err));

// -----------------------------
// Route test
// -----------------------------
app.get("/", (req, res) => {
  res.send("Bienvenue sur MobIMMO_V2 🚀");
});

// -----------------------------
// Route USSD
// -----------------------------
app.use("/ussd", require("./routes/ussd"));

// -----------------------------
// Lancement du serveur
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Serveur en ligne sur le port ${PORT}`));
