// finalizeExpiredMatchups.js
import admin from "firebase-admin";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function finalizeExpiredMatchups() {
  console.log("⏱ Checking for expired matchups...");

  const cutoff = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours old
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

  console.log(`Found ${snapshot.size} expired matchups...`);
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

    // Initialize missing fields
    const initFighter = f => ({
      wins: f.wins || 0,
      losses: f.losses || 0,
      ties: f.ties || 0,
      votesFor: f.votesFor || 0,
      votesAgainst: f.votesAgainst || 0,
    });

    const f1Stats = initFighter(f1);
    const f2Stats = initFighter(f2);

    // Add votes
    f1Stats.votesFor += v1;
    f1Stats.votesAgainst += v2;
    f2Stats.votesFor += v2;
    f2Stats.votesAgainst += v1;

    // Determine winner/tie
    if (v1 > v2) {
      f1Stats.wins++;
      f2Stats.losses++;
    } else if (v2 > v1) {
      f2Stats.wins++;
      f1Stats.losses++;
    } else {
      f1Stats.ties++;
      f2Stats.ties++;
    }

    f1Stats.voteDifferential = f1Stats.votesFor - f1Stats.votesAgainst;
    f2Stats.voteDifferential = f2Stats.votesFor - f2Stats.votesAgainst;

    // Update both fighters and the matchup
    batch.update(f1Ref, f1Stats);
    batch.update(f2Ref, f2Stats);
    batch.update(docSnap.ref, { completed: true });

    console.log(
      `🏁 Finalized ${data.fighter1} (${v1}) vs ${data.fighter2} (${v2})`
    );
  }

  await batch.commit();
  console.log("✅ Finalization complete. Fighter records updated.");
}

finalizeExpiredMatchups().catch(err => console.error("❌ Error finalizing matchups:", err));
