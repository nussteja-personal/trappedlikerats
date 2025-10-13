// headtohead.js

import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  increment,
  onSnapshot,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const container = document.getElementById("matchupsContainer");
const standingsTable = document.querySelector("#standingsTable tbody");
const today = new Date().toISOString().split("T")[0]; // e.g. "2025-10-11"
const fightersCache = {};

/* -------------------------------
   Local vote tracking
--------------------------------*/
Object.keys(localStorage).forEach(key => {
  if (key.startsWith("voted_") && !key.includes(today)) {
    localStorage.removeItem(key);
  }
});

/* -------------------------------
   Fighter data caching
--------------------------------*/
async function getFighter(id) {
  if (fightersCache[id]) return fightersCache[id];
  const snap = await getDoc(doc(db, "fighters", id));
  if (!snap.exists()) return { name: id, image: "" };
  const data = snap.data();
  fightersCache[id] = data;
  return data;
}

/* -------------------------------
   Voting state helpers
--------------------------------*/
function hasVoted(matchupId) {
  return localStorage.getItem(`voted_${matchupId}`) !== null;
}

function getVotedFor(matchupId) {
  return localStorage.getItem(`voted_${matchupId}`);
}

/* -------------------------------
   Load and render today's matchups
--------------------------------*/
async function loadMatchups() {
  const q = query(collection(db, "matchups"), where("date", "==", today));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    container.innerHTML = "<p>No matchups found for today.</p>";
    return;
  }

  container.innerHTML = "";

  for (const docSnap of snapshot.docs) {
    const matchupId = docSnap.id;
    const matchup = docSnap.data();
    const fighter1 = await getFighter(matchup.fighter1);
    const fighter2 = await getFighter(matchup.fighter2);
    const completed = matchup.completed ?? false;

    const card = document.createElement("div");
    card.classList.add("matchup-card");

    card.innerHTML = `
      <div class="fighter">
        <img src="${fighter1.image}" alt="${fighter1.name}">
        <button id="${matchupId}-btn-${matchup.fighter1}">
          Vote ${fighter1.name}
        </button>
      </div>
      <div class="vs">VS</div>
      <div class="fighter">
        <img src="${fighter2.image}" alt="${fighter2.name}">
        <button id="${matchupId}-btn-${matchup.fighter2}">
          Vote ${fighter2.name}
        </button>
      </div>
    `;

    container.appendChild(card);

    if (!completed) {
      // Enable voting if matchup is open
      document
        .getElementById(`${matchupId}-btn-${matchup.fighter1}`)
        .addEventListener("click", () =>
          vote(matchupId, matchup.fighter1, matchup.fighter2)
        );

      document
        .getElementById(`${matchupId}-btn-${matchup.fighter2}`)
        .addEventListener("click", () =>
          vote(matchupId, matchup.fighter2, matchup.fighter1)
        );

      // Disable buttons if user already voted
      const votedFor = getVotedFor(matchupId);
      if (votedFor) {
        disableButtons(matchupId, matchup.fighter1, matchup.fighter2);
      }
    }
  }
}

/* -------------------------------
   Voting logic
--------------------------------*/
async function vote(matchupId, fighter, otherFighter) {
  if (hasVoted(matchupId)) {
    alert("You already voted on this matchup!");
    return;
  }

  try {
    await updateDoc(doc(db, "matchups", matchupId), {
      [`votes.${fighter}`]: increment(1),
    });

    localStorage.setItem(`voted_${matchupId}`, fighter);
    disableButtons(matchupId, fighter, otherFighter);
  } catch (err) {
    console.error("Vote failed:", err);
    alert("Error submitting vote — check console.");
  }
}

/* -------------------------------
   Disable vote buttons after voting
--------------------------------*/
function disableButtons(matchupId, fighter1, fighter2) {
  const btn1 = document.getElementById(`${matchupId}-btn-${fighter1}`);
  const btn2 = document.getElementById(`${matchupId}-btn-${fighter2}`);
  if (btn1) btn1.disabled = true;
  if (btn2) btn2.disabled = true;
}

/* -------------------------------
   Standings display (reads fighter stats)
--------------------------------*/
async function updateStandings() {
  const snapshot = await getDocs(collection(db, "fighters"));
  const fighters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Sort standings: Wins ↓, Losses ↑, Vote Differential ↓, Ties ↑
  fighters.sort((a, b) => {
    const winsA = a.wins || 0;
    const winsB = b.wins || 0;
    const lossesA = a.losses || 0;
    const lossesB = b.losses || 0;
    const diffA = a.voteDifferential || 0;
    const diffB = b.voteDifferential || 0;
    const tiesA = a.ties || 0;
    const tiesB = b.ties || 0;

    if (winsB !== winsA) return winsB - winsA;
    if (lossesA !== lossesB) return lossesA - lossesB;
    if (diffB !== diffA) return diffB - diffA;
    return tiesA - tiesB;
  });

  standingsTable.innerHTML = "";

  fighters.forEach((f, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${f.name}</td>
      <td>${f.wins || 0}</td>
      <td>${f.losses || 0}</td>
      <td>${f.ties || 0}</td>
      <td>${f.voteDifferential || 0}</td>
    `;

    // Highlight top 16
    if (index < 16) {
      row.classList.add("top16");
    }

    // Add cutoff line below 16th place
    if (index === 15) {
      row.classList.add("cutoff-line");
    }

    standingsTable.appendChild(row);
  });
}


/* -------------------------------
   Real-time standings updates
--------------------------------*/
onSnapshot(collection(db, "fighters"), () => updateStandings());

/* -------------------------------
   Initialize page
--------------------------------*/
loadMatchups();
updateStandings();
