import { db } from "./firebase.js";
import {
  collection, query, where, getDocs, doc, updateDoc, increment,
  onSnapshot, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const container = document.getElementById("matchupsContainer");
const standingsTable = document.querySelector("#standingsTable tbody");
const today = new Date().toISOString().split("T")[0]; // e.g. "2025-09-20"

const fightersCache = {};

async function getFighter(id) {
  if (fightersCache[id]) return fightersCache[id];
  const snap = await getDoc(doc(db, "fighters", id));
  if (!snap.exists()) return { name: id, image: "" };
  const data = snap.data();
  fightersCache[id] = data;
  return data;
}

function hasVoted(matchupId) {
  return localStorage.getItem(`voted_${matchupId}`) !== null;
}

function getVotedFor(matchupId) {
  return localStorage.getItem(`voted_${matchupId}`);
}

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

    const card = document.createElement("div");
    card.classList.add("matchup-card");
    card.innerHTML = `
      <div class="fighter">
        <img src="${fighter1.image}" alt="${fighter1.name}">
        <strong>${fighter1.name}</strong>
        <p id="${matchupId}-count-${matchup.fighter1}">${matchup.votes[matchup.fighter1]}</p>
        <button id="${matchupId}-btn-${matchup.fighter1}">
          Vote ${fighter1.name}
        </button>
      </div>
      <div class="vs">VS</div>
      <div class="fighter">
        <img src="${fighter2.image}" alt="${fighter2.name}">
        <strong>${fighter2.name}</strong>
        <p id="${matchupId}-count-${matchup.fighter2}">${matchup.votes[matchup.fighter2]}</p>
        <button id="${matchupId}-btn-${matchup.fighter2}">
          Vote ${fighter2.name}
        </button>
      </div>
    `;

    container.appendChild(card);

    // Disable if already voted
    if (getVotedFor(matchupId)) disableButtons(matchupId, matchup.fighter1, matchup.fighter2);

    document.getElementById(`${matchupId}-btn-${matchup.fighter1}`)
      .addEventListener("click", () => vote(matchupId, matchup.fighter1, matchup.fighter2));
    document.getElementById(`${matchupId}-btn-${matchup.fighter2}`)
      .addEventListener("click", () => vote(matchupId, matchup.fighter2, matchup.fighter1));

    onSnapshot(doc(db, "matchups", matchupId), (snap) => {
      if (!snap.exists()) return;
      const updated = snap.data();
      document.getElementById(`${matchupId}-count-${matchup.fighter1}`).textContent = updated.votes[matchup.fighter1];
      document.getElementById(`${matchupId}-count-${matchup.fighter2}`).textContent = updated.votes[matchup.fighter2];
      updateStandings(); // refresh standings live
    });
  }

  // Load standings after matchups initially
  updateStandings();
}

async function vote(matchupId, fighter, otherFighter) {
  if (hasVoted(matchupId)) {
    alert("You already voted on this matchup!");
    return;
  }

  try {
    await updateDoc(doc(db, "matchups", matchupId), {
      [`votes.${fighter}`]: increment(1)
    });

    localStorage.setItem(`voted_${matchupId}`, fighter);
    disableButtons(matchupId, fighter, otherFighter);
  } catch (err) {
    console.error("Vote failed:", err);
    alert("Error submitting vote — check console.");
  }
}

function disableButtons(matchupId, fighter1, fighter2) {
  const btn1 = document.getElementById(`${matchupId}-btn-${fighter1}`);
  const btn2 = document.getElementById(`${matchupId}-btn-${fighter2}`);
  if (btn1) btn1.disabled = true;
  if (btn2) btn2.disabled = true;
}

async function updateStandings() {
    const snapshot = await getDocs(collection(db, "matchups"));
    const records = {}; // fighterId -> { wins, losses, ties }
  
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const f1 = data.fighter1;
      const f2 = data.fighter2;
      const votes = data.votes;
  
      if (!records[f1]) records[f1] = { wins: 0, losses: 0, ties: 0 };
      if (!records[f2]) records[f2] = { wins: 0, losses: 0, ties: 0 };
  
      const v1 = votes[f1];
      const v2 = votes[f2];
  
      if (v1 > v2) {
        records[f1].wins++;
        records[f2].losses++;
      } else if (v2 > v1) {
        records[f2].wins++;
        records[f1].losses++;
      } else {
        records[f1].ties++;
        records[f2].ties++;
      }
    });
  
    renderStandings(records);
  }
  
  async function renderStandings(records) {
    standingsTable.innerHTML = "";
  
    // Sort fighters by wins desc, losses asc, ties asc
    const sorted = Object.entries(records).sort((a, b) => {
      const recA = a[1];
      const recB = b[1];
      if (recB.wins !== recA.wins) return recB.wins - recA.wins;
      if (recA.losses !== recB.losses) return recA.losses - recB.losses;
      return recA.ties - recB.ties;
    });
  
    // Determine highest win count (for leader highlighting)
    const highestWins = sorted.length > 0 ? sorted[0][1].wins : 0;
  
    for (const [fighterId, record] of sorted) {
      const fighter = await getFighter(fighterId);
      const row = document.createElement("tr");
  
      if (record.wins === highestWins && highestWins > 0) {
        row.classList.add("leader-row");
      }
  
      row.innerHTML = `
        <td>${fighter.name}</td>
        <td>${record.wins}</td>
        <td>${record.losses}</td>
        <td>${record.ties}</td>
      `;
      standingsTable.appendChild(row);
    }
  }
  

loadMatchups();
