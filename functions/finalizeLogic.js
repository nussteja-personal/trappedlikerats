import admin from "firebase-admin";
import { readFileSync } from "fs";

const db = admin.firestore();

async function finalizeExpiredMatchups() {
  try {
    console.log("🏁 Checking for expired matchups...");

    const cutoff = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000) // older than 24 hours
    );

    const snapshot = await db
      .collection("matchups")
      .where("completed", "==", false)
      .where("createdAt", "<=", cutoff)
      .get();

    if (snapshot.empty) {
      console.log("✅ No expired matchups found.");
      return;
    }

    const batch = db.batch();

    for (const docSnap of snapshot.docs) {
      const matchup = docSnap.data();
      const { fighter1, fighter2, votes = {} } = matchup;

      const f1Votes = votes[fighter1] || 0;
      const f2Votes = votes[fighter2] || 0;

      const f1Ref = db.collection("fighters").doc(fighter1);
      const f2Ref = db.collection("fighters").doc(fighter2);

      const [f1Doc, f2Doc] = await Promise.all([f1Ref.get(), f2Ref.get()]);
      const f1Data = f1Doc.data() || {};
      const f2Data = f2Doc.data() || {};

      const isTie = f1Votes === f2Votes;
      const f1Won = f1Votes > f2Votes;
      const f2Won = f2Votes > f1Votes;

      // Update fighter 1 stats
      const updatedF1 = {
        wins: (f1Data.wins || 0) + (f1Won ? 1 : 0),
        losses: (f1Data.losses || 0) + (f2Won ? 1 : 0),
        ties: (f1Data.ties || 0) + (isTie ? 1 : 0),
        votesFor: (f1Data.votesFor || 0) + f1Votes,
        votesAgainst: (f1Data.votesAgainst || 0) + f2Votes,
      };
      updatedF1.voteDifferential = updatedF1.votesFor - updatedF1.votesAgainst;

      // Update fighter 2 stats
      const updatedF2 = {
        wins: (f2Data.wins || 0) + (f2Won ? 1 : 0),
        losses: (f2Data.losses || 0) + (f1Won ? 1 : 0),
        ties: (f2Data.ties || 0) + (isTie ? 1 : 0),
        votesFor: (f2Data.votesFor || 0) + f2Votes,
        votesAgainst: (f2Data.votesAgainst || 0) + f1Votes,
      };
      updatedF2.voteDifferential = updatedF2.votesFor - updatedF2.votesAgainst;

      // Add match result history
      const resultF1 = {
        opponent: fighter2,
        outcome: isTie ? "Tie" : f1Won ? "Win" : "Loss",
        votesFor: f1Votes,
        votesAgainst: f2Votes,
        date: new Date().toISOString(),
      };

      const resultF2 = {
        opponent: fighter1,
        outcome: isTie ? "Tie" : f2Won ? "Win" : "Loss",
        votesFor: f2Votes,
        votesAgainst: f1Votes,
        date: new Date().toISOString(),
      };

      // Apply updates in batch
      batch.update(f1Ref, {
        ...updatedF1,
        recentResults: admin.firestore.FieldValue.arrayUnion(resultF1),
      });

      batch.update(f2Ref, {
        ...updatedF2,
        recentResults: admin.firestore.FieldValue.arrayUnion(resultF2),
      });

      // Mark matchup complete
      batch.update(docSnap.ref, { completed: true });
    }

    await batch.commit();
    console.log(`✅ Finalized ${snapshot.size} matchups and updated records.`);

  } catch (err) {
    console.error("❌ Error finalizing matchups:", err);
  }
}

finalizeExpiredMatchups();

export { finalizeExpiredMatchups };
