
// import { onSchedule } from "firebase-functions/v2/scheduler";
// import admin from "firebase-admin";
// import { generateSwissMatchups, resetAndSeedFighters } from "./seedLogic.js";

// const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));
// const fighters = JSON.parse(readFileSync("./fighters.json", "utf8"));


// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const db = admin.firestore();
// const { Timestamp } = admin.firestore;

// // finalizeExpiredMatchups.js

// async function finalizeExpiredMatchups() {
//   console.log("⏱ Checking for expired matchups...");

//   const cutoff = admin.firestore.Timestamp.fromDate(
//     new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours old
//   );

//   const snapshot = await db
//     .collection("matchups")
//     .where("completed", "==", false)
//     .where("createdAt", "<=", cutoff)
//     .get();

//   if (snapshot.empty) {
//     console.log("✅ No matchups to finalize.");
//     return;
//   }

//   console.log(`Found ${snapshot.size} expired matchups...`);
//   const batch = db.batch();

//   for (const docSnap of snapshot.docs) {
//     const data = docSnap.data();
//     const f1Ref = db.collection("fighters").doc(data.fighter1);
//     const f2Ref = db.collection("fighters").doc(data.fighter2);

//     const v1 = data.votes?.[data.fighter1] ?? 0;
//     const v2 = data.votes?.[data.fighter2] ?? 0;

//     const [f1Doc, f2Doc] = await Promise.all([f1Ref.get(), f2Ref.get()]);
//     const f1 = f1Doc.data() || {};
//     const f2 = f2Doc.data() || {};

//     // Initialize missing fields
//     const initFighter = f => ({
//       wins: f.wins || 0,
//       losses: f.losses || 0,
//       ties: f.ties || 0,
//       votesFor: f.votesFor || 0,
//       votesAgainst: f.votesAgainst || 0,
//     });

//     const f1Stats = initFighter(f1);
//     const f2Stats = initFighter(f2);

//     // Add votes
//     f1Stats.votesFor += v1;
//     f1Stats.votesAgainst += v2;
//     f2Stats.votesFor += v2;
//     f2Stats.votesAgainst += v1;

//     // Determine winner/tie
//     if (v1 > v2) {
//       f1Stats.wins++;
//       f2Stats.losses++;
//     } else if (v2 > v1) {
//       f2Stats.wins++;
//       f1Stats.losses++;
//     } else {
//       f1Stats.ties++;
//       f2Stats.ties++;
//     }

//     f1Stats.voteDifferential = f1Stats.votesFor - f1Stats.votesAgainst;
//     f2Stats.voteDifferential = f2Stats.votesFor - f2Stats.votesAgainst;

//     // Update both fighters and the matchup
//     batch.update(f1Ref, f1Stats);
//     batch.update(f2Ref, f2Stats);
//     batch.update(docSnap.ref, { completed: true });

//     console.log(
//       `🏁 Finalized ${data.fighter1} (${v1}) vs ${data.fighter2} (${v2})`
//     );
//   }

//   await batch.commit();
//   console.log("✅ Finalization complete. Fighter records updated.");
// }

// finalizeExpiredMatchups().catch(err => console.error("❌ Error finalizing matchups:", err));

// // seed.js

// async function resetAndSeedFighters() {
//   const fightersCol = db.collection("fighters");
//   const existing = await fightersCol.get();
//   const batch = db.batch();

//   existing.forEach(doc => batch.delete(doc.ref));
//   fighters.forEach(f => batch.set(fightersCol.doc(f.id), f));

//   await batch.commit();
//   console.log(`✅ Fighters collection reset with ${fighters.length} fighters`);
// }

// async function getMatchups() {
//   const snapshot = await db.collection("matchups").get();
//   return snapshot.docs.map(doc => ({
//     id: doc.id,
//     ...doc.data(),
//   }));
// }

// function calculateRecords(fighters, matchups) {
//   matchups.forEach(m => {
//     const f1 = fighters.find(f => f.id === m.fighter1);
//     const f2 = fighters.find(f => f.id === m.fighter2);
//     if (!f1 || !f2) return;

//     const v1 = m.votes?.[m.fighter1] ?? 0;
//     const v2 = m.votes?.[m.fighter2] ?? 0;

//     if (v1 > v2) {
//       f1.wins = (f1.wins ?? 0) + 1;
//       f2.losses = (f2.losses ?? 0) + 1;
//     } else if (v2 > v1) {
//       f2.wins = (f2.wins ?? 0) + 1;
//       f1.losses = (f1.losses ?? 0) + 1;
//     } else {
//       f1.ties = (f1.ties ?? 0) + 1;
//       f2.ties = (f2.ties ?? 0) + 1;
//     }
//   });

//   return fighters.sort((a, b) => {
//     const winsA = a.wins ?? 0, winsB = b.wins ?? 0;
//     const lossesA = a.losses ?? 0, lossesB = b.losses ?? 0;
//     const tiesA = a.ties ?? 0, tiesB = b.ties ?? 0;

//     if (winsB !== winsA) return winsB - winsA;
//     if (lossesA !== lossesB) return lossesA - lossesB;
//     return tiesA - tiesB;
//   });
// }

// function haveFoughtBefore(f1, f2, matchups) {
//   return matchups.some(m =>
//     (m.fighter1 === f1 && m.fighter2 === f2) ||
//     (m.fighter1 === f2 && m.fighter2 === f1)
//   );
// }

// async function generateSwissMatchups(fighters, pastMatchups) {
//   const today = new Date().toISOString().split("T")[0];
//   const batch = db.batch();
//   const paired = new Set();
//   const pairs = [];

//   for (let i = 0; i < fighters.length; i++) {
//     if (paired.has(fighters[i].id)) continue;

//     let opponentIndex = i + 1;
//     while (
//       opponentIndex < fighters.length &&
//       (paired.has(fighters[opponentIndex].id) ||
//         haveFoughtBefore(fighters[i].id, fighters[opponentIndex].id, pastMatchups))
//     ) {
//       opponentIndex++;
//     }

//     if (opponentIndex >= fighters.length) {
//       opponentIndex = fighters.findIndex(
//         (f, idx) => idx > i && !paired.has(f.id)
//       );
//       if (opponentIndex === -1) break;
//     }

//     const f1 = fighters[i];
//     const f2 = fighters[opponentIndex];
//     pairs.push([f1, f2]);

//     paired.add(f1.id);
//     paired.add(f2.id);
//   }

//   // Handle bye assignment
//   const unpaired = fighters.filter(f => !paired.has(f.id));
//   unpaired.forEach(fighter => {
//     console.log(`⚠️ Bye assigned to ${fighter.name} (auto-win)`);
//     fighter.wins = (fighter.wins ?? 0) + 1;
//   });

//   pairs.forEach((pair, idx) => {
//     const [f1, f2] = pair;
//     const matchupId = `${today}-matchup${idx + 1}`;
//     const docRef = db.collection("matchups").doc(matchupId);
//     batch.set(docRef, {
//       date: today,
//       fighter1: f1.id,
//       fighter2: f2.id,
//       votes: { [f1.id]: 0, [f2.id]: 0 },
//       createdAt: Timestamp.now(),
//       completed: false,
//     });
//   });

//   await batch.commit();
//   console.log(`✅ Created ${pairs.length} matchups for ${today}`);
// }

// async function main() {
//   await resetAndSeedFighters();

//   const pastMatchups = await getMatchups();
//   const rankedFighters = calculateRecords([...fighters], pastMatchups);

//   await generateSwissMatchups(rankedFighters, pastMatchups);
//   console.log("🎉 Seeding and matchup generation complete.");
// }

// main().catch(err => console.error("❌ Error:", err));

import { onSchedule } from "firebase-functions/v2/scheduler";
import admin from "firebase-admin";
import { generateSwissMatchups, resetAndSeedFighters } from "./seedLogic.js";

admin.initializeApp();
const db = admin.firestore();

/**
 * Automatically finalize expired matchups (runs hourly)
 */
export const finalizeExpiredMatchups = onSchedule("every 60 minutes", async () => {
  const cutoff = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  const snapshot = await db
    .collection("matchups")
    .where("completed", "==", false)
    .where("createdAt", "<=", cutoff)
    .get();

  if (snapshot.empty) {
    console.log("✅ No matchups to finalize.");
    return;
  }

  const batch = db.batch();
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const f1Ref = db.collection("fighters").doc(data.fighter1);
    const f2Ref = db.collection("fighters").doc(data.fighter2);

    const v1 = data.votes?.[data.fighter1] ?? 0;
    const v2 = data.votes?.[data.fighter2] ?? 0;

    const [f1Doc, f2Doc] = await Promise.all([f1Ref.get(), f2Ref.get()]);
    const f1 = f1Doc.data() || {};
    const f2 = f2Doc.data() || {};

    const updateFighter = (fighter, vFor, vAgainst, isWinner, isLoser, isTie) => {
      const updated = {
        wins: (fighter.wins || 0) + (isWinner ? 1 : 0),
        losses: (fighter.losses || 0) + (isLoser ? 1 : 0),
        ties: (fighter.ties || 0) + (isTie ? 1 : 0),
        votesFor: (fighter.votesFor || 0) + vFor,
        votesAgainst: (fighter.votesAgainst || 0) + vAgainst,
      };
      updated.voteDifferential = updated.votesFor - updated.votesAgainst;
      return updated;
    };

    const isTie = v1 === v2;
    const isF1Winner = v1 > v2;
    const isF2Winner = v2 > v1;

    batch.update(f1Ref, updateFighter(f1, v1, v2, isF1Winner, isF2Winner, isTie));
    batch.update(f2Ref, updateFighter(f2, v2, v1, isF2Winner, isF1Winner, isTie));
    batch.update(docSnap.ref, { completed: true });
  }

  await batch.commit();
  console.log(`🏁 Finalized ${snapshot.size} matchups and updated fighter stats.`);
});

/**
 * Automatically generate new matchups daily (runs at 12:00am UTC)
 */
export const generateDailyMatchups = onSchedule("0 0 * * *", async () => {
  console.log("🗓 Generating daily matchups...");
  await resetAndSeedFighters();
  const pastMatchups = await db.collection("matchups").get();
  const rankedFighters = await generateSwissMatchups(pastMatchups);
  console.log("✅ Daily matchups generated!");
});
