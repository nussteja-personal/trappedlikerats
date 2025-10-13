// setup.js
const admin = require("firebase-admin");

// TODO: replace with path to your service account key JSON
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // optional: databaseURL if needed
});

const db = admin.firestore();

async function seedFighters() {
  const fighters = [
    { id: "fighter1", name: "Fighter 1", image: "images/fighter1.webp" },
    { id: "fighter2", name: "Fighter 2", image: "images/fighter2.webp" },
    // … list all 36 fighters here ...
    { id: "fighter36", name: "Fighter 36", image: "images/fighter36.webp" },
  ];

  const batch = db.batch();
  fighters.forEach(f => {
    const docRef = db.collection("fighters").doc(f.id);
    batch.set(docRef, {
      name: f.name,
      image: f.image
    });
  });
  await batch.commit();
  console.log("Fighters seeded.");
}

async function seedMatchups(date) {
  // Example: create 5 sample matchups for the given date
  const matchups = [
    { fighter1: "fighter1", fighter2: "fighter2" },
    { fighter1: "fighter3", fighter2: "fighter4" },
    { fighter1: "fighter5", fighter2: "fighter6" },
    { fighter1: "fighter7", fighter2: "fighter8" },
    { fighter1: "fighter9", fighter2: "fighter10" },
  ];

  const batch = db.batch();
  matchups.forEach((m, i) => {
    const id = `${date}-matchup${i + 1}`;  // e.g. "2025-09-24-matchup1"
    const docRef = db.collection("matchups").doc(id);
    batch.set(docRef, {
      date,
      fighter1: m.fighter1,
      fighter2: m.fighter2,
      votes: {
        [m.fighter1]: 0,
        [m.fighter2]: 0
      }
    });
  });
  await batch.commit();
  console.log("Matchups seeded for date:", date);
}

async function main() {
  await seedFighters();
  const today = new Date().toISOString().split("T")[0];  // "YYYY-MM-DD"
  await seedMatchups(today);
  console.log("Done.");
}
main().catch(err => {
  console.error("Error seeding:", err);
});
