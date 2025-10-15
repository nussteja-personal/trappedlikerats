// seedLogic.js
import admin from "firebase-admin";
const db = admin.firestore();
const { Timestamp } = admin.firestore;

/**
 * Safely merges fighter data without overwriting existing records.
 * Preserves stats, adds new fighters if needed.
 */
export async function resetAndSeedFighters() {
  const fightersCol = db.collection("fighters");

  // Load fighter list from Firestore (assuming a 'fightersConfig' collection or static source)
  // If you still want to source from a JSON file, you can move that to Firestore manually.
  const configSnap = await db.collection("fightersConfig").get();
  const fighters = configSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const existingSnap = await fightersCol.get();
  const existingMap = new Map(existingSnap.docs.map(doc => [doc.id, doc.data()]));
  const batch = db.batch();

  for (const f of fighters) {
    const existing = existingMap.get(f.id);

    if (existing) {
      // Merge — keep stats, update static fields
      const mergedData = {
        id: f.id,
        name: f.name,
        image: f.image,
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
      // New fighter
      batch.set(fightersCol.doc(f.id), {
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
      });
    }
  }

  await batch.commit();
  console.log(`✅ Fighter data merged safely (${fighters.length} fighters).`);
}

/**
 * Checks whether two fighters have previously faced each other.
 */
function haveFoughtBefore(f1, f2, matchups) {
  return matchups.some(
    m =>
      (m.fighter1 === f1 && m.fighter2 === f2) ||
      (m.fighter1 === f2 && m.fighter2 === f1)
  );
}

/**
 * Generates Swiss-style matchups based on previous records.
 */
export async function generateSwissMatchups(fighters, pastMatchups) {
  const today = new Date().toISOString().split("T")[0];
  const batch = db.batch();
  const paired = new Set();
  const pairs = [];

  // Sort fighters by points (win=1, tie=0.5)
  fighters.forEach(f => {
    const wins = f.wins || 0;
    const ties = f.ties || 0;
    f.points = wins + ties * 0.5;
  });

  fighters.sort((a, b) => b.points - a.points || (b.voteDifferential || 0) - (a.voteDifferential || 0));

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

  // Handle unpaired fighters (auto-win)
  const unpaired = fighters.filter(f => !paired.has(f.id));
  unpaired.forEach(f => {
    console.log(`⚠️ Bye assigned to ${f.name} (auto-win)`);
    f.wins = (f.wins ?? 0) + 1;
  });

  pairs.forEach((pair, idx) => {
    const [f1, f2] = pair;
    const indexStr = String(idx + 1).padStart(2, "0");
    const matchupId = `${today}-matchup-${indexStr}`;
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
