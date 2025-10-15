import { onSchedule } from "firebase-functions/v2/scheduler";
import admin from "firebase-admin";
import { finalizeExpiredMatchups } from "./finalizeLogic.js";
import { resetAndSeedFighters, generateSwissMatchups } from "./seedLogic.js";

admin.initializeApp();
const db = admin.firestore();

/**
 * Writes an entry to the Firestore `logs` collection.
 * Each run includes timestamp, status, and summary info.
 */
async function logToFirestore(type, status, details = {}) {
  const logEntry = {
    type, // "finalize", "seed", "generate", or "nightly"
    status, // "success" or "error"
    details,
    timestamp: admin.firestore.Timestamp.now(),
  };
  await db.collection("logs").add(logEntry);
  console.log(`📝 Logged: ${type} (${status})`);
}

/**
 * Scheduled function that runs every night at midnight ET.
 */
export const generateDailyMatchups = onSchedule(
  {
    schedule: "0 0 * * *", // 12:00 AM UTC → 8:00 PM ET (adjust via timeZone)
    timeZone: "America/New_York", // local midnight Eastern
  },
  async () => {
    console.log("🕛 Starting nightly finalize + seed job...");
    const startTime = Date.now();

    try {
      // Step 1: finalize yesterday’s matchups
      console.log("🏁 Finalizing previous day matchups...");
      await finalizeExpiredMatchups();
      await logToFirestore("finalize", "success");

      // Step 2: reseed fighters (merge-safe)
      console.log("🌱 Resetting & merging fighter data...");
      await resetAndSeedFighters();
      await logToFirestore("seed", "success");

      // Step 3: generate new matchups
      console.log("⚔️ Generating new matchups...");
      const pastMatchupsSnap = await db.collection("matchups").get();
      const pastMatchups = pastMatchupsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const fightersSnap = await db.collection("fighters").get();
      const fighters = fightersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      await generateSwissMatchups(fighters, pastMatchups);
      await logToFirestore("generate", "success", { totalFighters: fighters.length });

      // Step 4: final summary log
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      await logToFirestore("nightly", "success", { duration });
      console.log(`✅ Nightly job complete in ${duration}s`);

    } catch (error) {
      console.error("❌ Nightly job failed:", error);
      await logToFirestore("nightly", "error", { message: error.message, stack: error.stack });
    }
  }
);
