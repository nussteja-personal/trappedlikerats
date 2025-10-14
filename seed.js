// seed.js
import admin from "firebase-admin";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));
const fighters = JSON.parse(readFileSync("./fighters.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { Timestamp } = admin.firestore;

async function resetAndSeedFighters() {
  const fightersCol = db.collection("fighters");
  const existingSnap = await fightersCol.get();
  const existingMap = new Map(existingSnap.docs.map(doc => [doc.id, doc.data()]));
  const batch = db.batch();

  for (const f of fighters) {
    const existing = existingMap.get(f.id);

    if (existing) {
      // Fighter already exists — preserve stats and history
      const mergedData = {
        id: f.id,
        name: f.name,
        image: f.image,
        // Keep dynamic stats if they exist
        wins: existing.wins || 0,
        losses: existing.losses || 0,
        ties: existing.ties || 0,
        votesFor: existing.votesFor || 0,
        votesAgainst: existing.votesAgainst || 0,
        voteDifferential: existing.voteDifferential || 0,
        recentResults: existing.recentResults || [],
      };
      batch.set(fightersCol.doc(f.id), mergedData, { merge: true });
    } else {
      // New fighter — create fresh record
      const newFighter = {
        id: f.id,
        name: f.name,
        image: f.image,
        wins: 0,
        losses: 0,
        ties: 0,
        votesFor: 0,
        votesAgainst: 0,
        voteDifferential: 0,
        recentResults: [],
      };
      batch.set(fightersCol.doc(f.id), newFighter);
    }
  }

  await batch.commit();
  console.log(`✅ Fighter data merged safely (${fighters.length} total fighters).`);
}

async function getMatchups() {
  const snapshot = await db.collection("matchups").get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

function calculateRecords(fighters, matchups) {
  matchups.forEach(m => {
    const f1 = fighters.find(f => f.id === m.fighter1);
    const f2 = fighters.find(f => f.id === m.fighter2);
    if (!f1 || !f2) return;

    const v1 = m.votes?.[m.fighter1] ?? 0;
    const v2 = m.votes?.[m.fighter2] ?? 0;

    if (v1 > v2) {
      f1.wins = (f1.wins ?? 0) + 1;
      f2.losses = (f2.losses ?? 0) + 1;
    } else if (v2 > v1) {
      f2.wins = (f2.wins ?? 0) + 1;
      f1.losses = (f1.losses ?? 0) + 1;
    } else {
      f1.ties = (f1.ties ?? 0) + 1;
      f2.ties = (f2.ties ?? 0) + 1;
    }
  });

  return fighters.sort((a, b) => {
    const winsA = a.wins ?? 0, winsB = b.wins ?? 0;
    const lossesA = a.losses ?? 0, lossesB = b.losses ?? 0;
    const tiesA = a.ties ?? 0, tiesB = b.ties ?? 0;

    if (winsB !== winsA) return winsB - winsA;
    if (lossesA !== lossesB) return lossesA - lossesB;
    return tiesA - tiesB;
  });
}

function haveFoughtBefore(f1, f2, matchups) {
  return matchups.some(m =>
    (m.fighter1 === f1 && m.fighter2 === f2) ||
    (m.fighter1 === f2 && m.fighter2 === f1)
  );
}

async function generateSwissMatchups(fighters, pastMatchups) {
  const today = new Date().toISOString().split("T")[0];
  const batch = db.batch();
  const paired = new Set();
  const pairs = [];

  for (let i = 0; i < fighters.length; i++) {
    if (paired.has(fighters[i].id)) continue;

    let opponentIndex = i + 1;
    while (
      opponentIndex < fighters.length &&
      (paired.has(fighters[opponentIndex].id) ||
        haveFoughtBefore(fighters[i].id, fighters[opponentIndex].id, pastMatchups))
    ) {
      opponentIndex++;
    }

    if (opponentIndex >= fighters.length) {
      opponentIndex = fighters.findIndex(
        (f, idx) => idx > i && !paired.has(f.id)
      );
      if (opponentIndex === -1) break;
    }

    const f1 = fighters[i];
    const f2 = fighters[opponentIndex];
    pairs.push([f1, f2]);

    paired.add(f1.id);
    paired.add(f2.id);
  }

  // Handle bye assignment
  const unpaired = fighters.filter(f => !paired.has(f.id));
  unpaired.forEach(fighter => {
    console.log(`⚠️ Bye assigned to ${fighter.name} (auto-win)`);
    fighter.wins = (fighter.wins ?? 0) + 1;
  });

  pairs.forEach((pair, idx) => {
    const [f1, f2] = pair;
    const indexStr = String(idx + 1).padStart(2, "0");
    const matchupId = `${today}-matchup${indexStr}`;
    const docRef = db.collection("matchups").doc(matchupId);
    batch.set(docRef, {
      date: today,
      fighter1: f1.id,
      fighter2: f2.id,
      votes: { [f1.id]: 0, [f2.id]: 0 },
      createdAt: Timestamp.now(),
      completed: false,
    });
  });

  await batch.commit();
  console.log(`✅ Created ${pairs.length} matchups for ${today}`);
}

async function main() {
  await resetAndSeedFighters();

  const pastMatchups = await getMatchups();
  const rankedFighters = calculateRecords([...fighters], pastMatchups);

  await generateSwissMatchups(rankedFighters, pastMatchups);
  console.log("🎉 Seeding and matchup generation complete.");
}

main().catch(err => console.error("❌ Error:", err));
