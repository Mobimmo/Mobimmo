const express = require("express");
const router = express.Router();

// === MODELS ===
const SearchRequest = require("../models/SearchRequest");
const ListingProposal = require("../models/ListingProposal");
const ContactRequest = require("../models/ContactRequest");

// === CONFIG PAYS (CG) ===
const CURRENCY = "FCFA";
const COUNTRY = process.env.COUNTRY || "CG";
const CFG_CG = {
  cities: [
    {
      name: "Brazzaville",
      zones: [
        "Makélékélé",
        "Bacongo",
        "Poto-Poto",
        "Moungali",
        "Ouenzé",
        "Talangaï",
        "Mfilou",
        "Madibou",
        "Djiri",
      ],
    },
    {
      name: "Pointe-Noire",
      zones: ["Lumumba", "Mvoumvou", "Tié-Tié", "Loandjili", "Mongo-Poukou", "Ngoyo"],
    },
    { name: "Dolisie", zones: ["Centre-ville", "Loubomo", "Tsiamba", "Mavoula"] },
  ],
};
const CFG = CFG_CG; // (Option 2: 1 backend par pays → ici Congo)

// === HELPERS ===
const splitInput = (t) => (t ? t.split("*").filter(Boolean) : []);
const lvl = (t) => splitInput(t).length;
const at = (arr, i) => arr[i - 1]; // 1-based
const isNum = (s) => /^[0-9]+$/.test(String(s || "").trim());
const cityName = (i) => CFG.cities[i]?.name || null;
const zoneName = (ci, zi) => CFG.cities[ci]?.zones?.[zi] || null;
const listCities = () => CFG.cities.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
const listZones = (cityIdx) =>
  CFG.cities[cityIdx].zones.map((z, i) => `${i + 1}. ${z}`).join("\n");
const genId = () => {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rnd = "";
  for (let i = 0; i < 6; i++) rnd += chars[Math.floor(Math.random() * chars.length)];
  return `MOB-${year}-${rnd}`;
};

// === ROUTE USSD ===
router.post("/", async (req, res) => {
  res.set("Content-Type", "text/plain; charset=utf-8");

  const { text = "", phoneNumber = "" } = req.body;
  const p = splitInput(text);

  // MENU PRINCIPAL
  if (text === "") {
    return res.send(
`CON Bienvenue sur MobIMMO
1. Rechercher un bien
2. Proposer un bien
3. Être contacté
4. Aide / Contact`
    );
  }

  /* -----------------------------------------
     1) RECHERCHER UN BIEN
     Flux:
       1 → typeBien (1 Maison, 2 Bureau, 3 Terrain)
       2 → operation (1 Location, 2 Achat)
       3 → si Maison → (1 Meublé, 2 Non meublé), sinon → Ville
       4 → si Maison → Ville, sinon → Zone
       5 → si Maison → Zone, sinon → Budget
       6 → si Maison → Budget, sinon → Enregistrement
       7 → Enregistrement (Maison)
  ------------------------------------------ */
  if (at(p, 1) === "1") {
    // 1) Type de bien
    if (lvl(text) === 1) {
      return res.send(
`CON Quel type de bien recherchez-vous ?
1. Maison / Appartement
2. Bureau / Local commercial
3. Terrain`
      );
    }

    // 2) Opération
    if (lvl(text) === 2) {
      return res.send(
`CON Type d’opération :
1. Location
2. Achat`
      );
    }

    // 3) Si Maison → Meublé/Non ; sinon → Ville
    if (lvl(text) === 3) {
      const typeBien = at(p, 2);
      if (typeBien === "1") {
        return res.send(
`CON Meublé ou Non ?
1. Meublé
2. Non meublé`
        );
      }
      return res.send(`CON Dans quelle ville ?
${listCities()}`);
    }

    // 4) Si Maison → Ville ; sinon → Zone
    if (lvl(text) === 4) {
      const typeBien = at(p, 2);
      if (typeBien === "1") {
        return res.send(`CON Dans quelle ville ?
${listCities()}`);
      } else {
        const cityIdx = Number(at(p, 3)) - 1;
        const c = cityName(cityIdx);
        if (!c) return res.send(`CON Choix invalide. Ville :
${listCities()}`);
        return res.send(`CON Choisissez la zone (${c}) :
${listZones(cityIdx)}`);
      }
    }

    // 5) Si Maison → Zone ; sinon → Budget
    if (lvl(text) === 5) {
      const typeBien = at(p, 2);
      if (typeBien === "1") {
        const cityIdx = Number(at(p, 4)) - 1;
        const c = cityName(cityIdx);
        if (!c) return res.send(`CON Choix invalide. Ville :
${listCities()}`);
        return res.send(`CON Choisissez la zone (${c}) :
${listZones(cityIdx)}`);
      } else {
        return res.send(
`CON Entrez votre budget maximum (en ${CURRENCY}) :
Ex: 300000`
        );
      }
    }

    // 6) Si Maison → Budget ; sinon → Enregistrement (Bureau/Terrain)
    if (lvl(text) === 6) {
      const typeBien = at(p, 2);
      if (typeBien === "1") {
        return res.send(
`CON Entrez votre budget maximum (en ${CURRENCY}) :
Ex: 300000`
        );
      } else {
        // ENREGISTREMENT Bureau/Terrain
        const op = at(p, 3) === "1" ? "Location" : "Achat";
        const cityIdx = Number(at(p, 3)) - 1;
        const zoneIdx = Number(at(p, 4)) - 1;
        const budgetMax = Number(at(p, 5));
        const c = cityName(cityIdx);
        const z = zoneName(cityIdx, zoneIdx);

        if (!c || !z || !isNum(at(p, 5))) {
          return res.send("END Saisie invalide. Merci de réessayer.");
        }

        const requestId = genId();
        try {
          const doc = await SearchRequest.create({
            requestId,
            phone: phoneNumber,
            typeBien: at(p, 2) === "2" ? "Bureau" : "Terrain",
            operation: op,
            meuble: null,
            ville: c,
            zone: z,
            budgetMax,
            country: COUNTRY,
          });
          console.log(`[SEARCH] ${requestId} | ${phoneNumber} | ${doc.typeBien} ${doc.operation} | ${doc.ville}/${doc.zone} | ${doc.budgetMax} ${CURRENCY}`);
        } catch (e) {
          console.error("❌ SAVE SearchRequest:", e.message);
        }

        return res.send(
`END ✅ Requête enregistrée !
ID : ${requestId}
Un agent MobIMMO vous contactera bientôt par SMS.`
        );
      }
    }

    // 7) ENREGISTREMENT Maison
    if (lvl(text) === 7) {
      const typeBien = "Maison";
      const op = at(p, 3) === "1" ? "Location" : "Achat";
      const meuble = at(p, 3) === "1" ? "Meublé" : "Non meublé"; // ATTENTION: ici p[2] = meuble/non; cf flux
      // Correction: dans le flux, p[3] = meuble/non uniquement si typeBien=1 (maison)
      const meubleChoice = at(p, 3) === "1" ? "Meublé" : "Non meublé";

      const cityIdx = Number(at(p, 4)) - 1;
      const zoneIdx = Number(at(p, 5)) - 1;
      const budgetMax = Number(at(p, 6));

      const c = cityName(cityIdx);
      const z = zoneName(cityIdx, zoneIdx);
      if (!c || !z || !isNum(at(p, 6))) {
        return res.send("END Saisie invalide. Merci de réessayer.");
      }

      const requestId = genId();
      try {
        const doc = await SearchRequest.create({
          requestId,
          phone: phoneNumber,
          typeBien,
          operation: op,
          meuble: meubleChoice,
          ville: c,
          zone: z,
          budgetMax,
          country: COUNTRY,
        });
        console.log(`[SEARCH] ${requestId} | ${phoneNumber} | ${doc.typeBien} ${doc.operation} ${doc.meuble} | ${doc.ville}/${doc.zone} | ${doc.budgetMax} ${CURRENCY}`);
      } catch (e) {
        console.error("❌ SAVE SearchRequest:", e.message);
      }

      return res.send(
`END ✅ Requête enregistrée !
ID : ${requestId}
Un agent MobIMMO vous contactera bientôt par SMS.`
      );
    }
  }

  /* -----------------------------------------
     2) PROPOSER UN BIEN
     Flux:
       1 → typeBien
       2 → operation (1 Location, 2 Vente)
       3 → si Maison → Meublé/Non ; sinon → Ville
       4 → si Maison → Ville ; sinon → Zone
       5 → si Maison → Zone ; sinon → Loyer/Prix
       6 → si Maison + Vente → enreg ; si Maison + Location → saisir caution
       7 → (Maison + Location) enreg
  ------------------------------------------ */
  if (at(p, 1) === "2") {
    // 1
    if (lvl(text) === 1) {
      return res.send(
`CON Quel type de bien proposez-vous ?
1. Maison / Appartement
2. Bureau / Local commercial
3. Terrain`
      );
    }

    // 2
    if (lvl(text) === 2) {
      return res.send(
`CON Type d’opération :
1. Location
2. Vente`
      );
    }

    // 3
    if (lvl(text) === 3) {
      const typeBien = at(p, 2);
      if (typeBien === "1") {
        return res.send(
`CON Meublé ou Non ?
1. Meublé
2. Non meublé`
        );
      }
      return res.send(`CON Dans quelle ville ?
${listCities()}`);
    }

    // 4
    if (lvl(text) === 4) {
      const typeBien = at(p, 2);
      if (typeBien === "1") {
        return res.send(`CON Dans quelle ville ?
${listCities()}`);
      } else {
        const cityIdx = Number(at(p, 3)) - 1;
        const c = cityName(cityIdx);
        if (!c) return res.send(`CON Choix invalide. Ville :
${listCities()}`);
        return res.send(`CON Choisissez la zone (${c}) :
${listZones(cityIdx)}`);
      }
    }

    // 5
    if (lvl(text) === 5) {
      const typeBien = at(p, 2);
      if (typeBien === "1") {
        const cityIdx = Number(at(p, 4)) - 1;
        const c = cityName(cityIdx);
        if (!c) return res.send(`CON Choix invalide. Ville :
${listCities()}`);
        return res.send(`CON Choisissez la zone (${c}) :
${listZones(cityIdx)}`);
      } else {
        const isLoc = at(p, 3) === "1";
        return res.send(
`CON Entrez le ${isLoc ? "loyer" : "prix"} (en ${CURRENCY}) :
Ex: 150000`
        );
      }
    }

    // 6
    if (lvl(text) === 6) {
      const typeBien = at(p, 2);
      const isLoc = at(p, 3) === "1";

      if (typeBien !== "1") {
        // Enregistrement direct (non-maison)
        const cityIdx = Number(at(p, 3)) - 1;
        const zoneIdx = Number(at(p, 4)) - 1;
        const montant = Number(at(p, 5));
        const c = cityName(cityIdx);
        const z = zoneName(cityIdx, zoneIdx);

        if (!c || !z || !isNum(at(p, 5))) {
          return res.send("END Saisie invalide. Merci de réessayer.");
        }

        const requestId = genId();
        try {
          const doc = await ListingProposal.create({
            requestId,
            phone: phoneNumber,
            typeBien: at(p, 2) === "2" ? "Bureau" : "Terrain",
            operation: isLoc ? "Location" : "Vente",
            meuble: null,
            ville: c,
            zone: z,
            loyerOuPrix: montant,
            caution: null,
            country: COUNTRY,
          });
          console.log(`[LISTING] ${requestId} | ${phoneNumber} | ${doc.typeBien} ${doc.operation} | ${doc.ville}/${doc.zone} | ${doc.loyerOuPrix} ${CURRENCY}`);
        } catch (e) {
          console.error("❌ SAVE ListingProposal (non-maison):", e.message);
        }

        return res.send(
`END ✅ Bien enregistré !
ID : ${requestId}
Un agent MobIMMO vous contactera si besoin.`
        );
      }

      // MAISON
      if (isLoc) {
        // Demander caution
        return res.send(
`CON Nombre de mois de caution :
Ex: 2`
        );
      } else {
        // Vente → enregistrement direct
        const cityIdx = Number(at(p, 4)) - 1;
        const zoneIdx = Number(at(p, 5)) - 1;
        const prix = Number(at(p, 6));
        const c = cityName(cityIdx);
        const z = zoneName(cityIdx, zoneIdx);
        if (!c || !z || !isNum(at(p, 6))) {
          return res.send("END Saisie invalide. Merci de réessayer.");
        }

        const requestId = genId();
        try {
          const doc = await ListingProposal.create({
            requestId,
            phone: phoneNumber,
            typeBien: "Maison",
            operation: "Vente",
            meuble: at(p, 3) === "1" ? "Meublé" : "Non meublé",
            ville: c,
            zone: z,
            loyerOuPrix: prix,
            caution: null,
            country: COUNTRY,
          });
          console.log(`[LISTING] ${requestId} | ${phoneNumber} | ${doc.typeBien} ${doc.operation} ${doc.meuble} | ${doc.ville}/${doc.zone} | ${doc.loyerOuPrix} ${CURRENCY}`);
        } catch (e) {
          console.error("❌ SAVE ListingProposal (maison-vente):", e.message);
        }

        return res.send(
`END ✅ Bien enregistré !
ID : ${requestId}
Un agent MobIMMO vous contactera si besoin.`
        );
      }
    }

    // 7) Maison + Location → enregistrer loyer + caution
    if (lvl(text) === 7) {
      const cityIdx = Number(at(p, 4)) - 1;
      const zoneIdx = Number(at(p, 5)) - 1;
      const loyer = Number(at(p, 6));
      const cautionMois = Number(at(p, 7));
      const c = cityName(cityIdx);
      const z = zoneName(cityIdx, zoneIdx);

      if (!c || !z || !isNum(at(p, 6)) || !isNum(at(p, 7))) {
        return res.send("END Saisie invalide. Merci de réessayer.");
      }

      const requestId = genId();
      try {
        const doc = await ListingProposal.create({
          requestId,
          phone: phoneNumber,
          typeBien: "Maison",
          operation: "Location",
          meuble: at(p, 3) === "1" ? "Meublé" : "Non meublé",
          ville: c,
          zone: z,
          loyerOuPrix: loyer,
          caution: cautionMois,
          country: COUNTRY,
        });
        console.log(`[LISTING] ${requestId} | ${phoneNumber} | ${doc.typeBien} ${doc.operation} ${doc.meuble} | ${doc.ville}/${doc.zone} | ${doc.loyerOuPrix}/${doc.caution}caution`);
      } catch (e) {
        console.error("❌ SAVE ListingProposal (maison-location):", e.message);
      }

      return res.send(
`END ✅ Bien enregistré !
ID : ${requestId}
Un agent MobIMMO vous contactera si besoin.`
      );
    }
  }

  /* -----------------------------------------
     3) ÊTRE CONTACTÉ
  ------------------------------------------ */
  if (at(p, 1) === "3") {
    const requestId = genId();
    try {
      const doc = await ContactRequest.create({
        requestId,
        phone: phoneNumber,
        country: COUNTRY,
      });
      console.log(`[CALLBACK] ${requestId} | ${phoneNumber} | ${doc.country}`);
    } catch (e) {
      console.error("❌ SAVE ContactRequest:", e.message);
    }
    return res.send(
`END ✅ Demande enregistrée !
ID : ${requestId}`
    );
  }

  /* -----------------------------------------
     4) AIDE / CONTACT
  ------------------------------------------ */
  if (at(p, 1) === "4") {
    return res.send("END Merci de contacter le service client MobIMMO au 000.");
  }

  return res.send("END ❌ Option invalide. Veuillez réessayer.");
});

module.exports = router;
