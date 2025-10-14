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
        <button id="${matchupId}-btn-${matchup.fighter2}">
          Vote ${fighter2.name}
        </button>
        <img src="${fighter2.image}" alt="${fighter2.name}">
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

  // Calculate points dynamically
  fighters.forEach(f => {
    const wins = f.wins || 0;
    const ties = f.ties || 0;
    f.points = wins * 1 + ties * 0.5;
  });

  // Sort by: Points ↓, Vote Differential ↓, Losses ↑
  fighters.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if ((b.voteDifferential || 0) !== (a.voteDifferential || 0))
      return (b.voteDifferential || 0) - (a.voteDifferential || 0);
    return (a.losses || 0) - (b.losses || 0);
  });

  standingsTable.innerHTML = "";

  fighters.forEach((f, index) => {
    // Build tooltip content for recent results
    const tooltip = (f.recentResults || [])
    .slice(-5)
    .reverse()
    .map(r => {
      let color, label;
      if (r.outcome === "Win") {
        color = "#4CAF50"; // green
        label = "Win";
      } else if (r.outcome === "Loss") {
        color = "#F44336"; // red
        label = "Loss";
      } else {
        color = "#FFC107"; // yellow
        label = "Tie";
      }
      return `
        <span style="color:${color}; font-weight:bold;">${label}</span>
        — ${r.date.split("T")[0]} vs ${r.opponent}
        (${r.votesFor}-${r.votesAgainst})
      `;
    })
    .join("<br>");
  

    const row = document.createElement("tr");
    row.innerHTML = `
    <td>${index + 1}</td>
    <td class="fighter-cell">
      <span class="fighter-name">
        ${f.name}
        <span class="tooltip">${tooltip}</span>
      </span>
    </td>
    <td>${f.points.toFixed(1)}</td>
    <td>${f.wins || 0}</td>
    <td>${f.losses || 0}</td>
    <td>${f.ties || 0}</td>
    <td>${f.voteDifferential || 0}</td>
  `;
  

    // Highlight top 16
    if (index < 16) row.classList.add("top16");
    // Add cutoff line below 16th
    if (index === 15) row.classList.add("cutoff-line");

    standingsTable.appendChild(row);
  });
}

// Real-time listener for standings
onSnapshot(collection(db, "fighters"), () => updateStandings());

// Initialize page
loadMatchups();
updateStandings();

