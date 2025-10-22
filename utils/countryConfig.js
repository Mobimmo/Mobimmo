const fs = require("fs");
const path = require("path");

function loadCountryConfig() {
  const code = (process.env.COUNTRY || "CG").toLowerCase();
  const p = path.join(__dirname, "..", "config", "countries", `${code}.json`);
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("⚠️ Impossible de charger le fichier pays :", p, e.message);
    return { code: "XX", currency: "FCFA", cities: {} };
  }
}

const CFG = loadCountryConfig();

function listCitiesMenu() {
  const cities = CFG.cities || {};
  return Object.entries(cities)
    .map(([k, v]) => `${k}. ${v.name}`)
    .join("\n");
}

function listZonesMenu(cityKey) {
  const c = CFG.cities?.[cityKey];
  if (!c) return "1. -";
  return Object.entries(c.zones || {})
    .map(([k, name]) => `${k}. ${name}`)
    .join("\n");
}

function getCityName(cityKey) {
  return CFG.cities?.[cityKey]?.name || null;
}

function getZoneName(cityKey, zoneKey) {
  return CFG.cities?.[cityKey]?.zones?.[zoneKey] || null;
}

module.exports = {
  loadCountryConfig,
  listCitiesMenu,
  listZonesMenu,
  getCityName,
  getZoneName,
  CFG
};
