import { db } from "./firebase.js";

console.log("DB from firebase.js:", db);

import {
    doc, getDoc, onSnapshot, updateDoc, increment,
    collection, getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const matchupId = "matchup-1"; // match your Firestore doc ID
const matchupRef = doc(db, "matchups", matchupId);

// Load matchup and attach listener
async function initMatchup() {
  const snap = await getDoc(matchupRef);
  if (!snap.exists()) {
    document.querySelector(".matchup").innerHTML = "<p>No matchup found.</p>";
    return;
  }

  // Render initial data
  renderMatchup(snap.data());

  // Listen for live updates
  onSnapshot(matchupRef, (docSnap) => {
    if (docSnap.exists()) {
      renderMatchup(docSnap.data());
    }
  });
}

function renderMatchup(data) {
  const fighter1Div = document.getElementById("fighter1");
  const fighter2Div = document.getElementById("fighter2");

  fighter1Div.innerHTML = `
    <h3>${data.fighter1}</h3>
    <p>Votes: ${data.votes[data.fighter1]}</p>
    <button onclick="vote('${data.fighter1}')">Vote</button>
  `;
  fighter2Div.innerHTML = `
    <h3>${data.fighter2}</h3>
    <p>Votes: ${data.votes[data.fighter2]}</p>
    <button onclick="vote('${data.fighter2}')">Vote</button>
  `;
}

// Expose vote globally
window.vote = async function (fighter) {
  await updateDoc(matchupRef, {
    [`votes.${fighter}`]: increment(1)
  });
};

// Load simple standings
async function loadStandings() {
  const snapshot = await getDocs(collection(db, "matchups"));
  const standings = {};

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const f1 = data.fighter1;
    const f2 = data.fighter2;
    const votes = data.votes;

    if (!standings[f1]) standings[f1] = { wins: 0, losses: 0 };
    if (!standings[f2]) standings[f2] = { wins: 0, losses: 0 };

    // Pick winner if votes exist
    if (votes) {
      const winner = votes[f1] > votes[f2] ? f1 : (votes[f2] > votes[f1] ? f2 : null);
      if (winner) {
        const loser = winner === f1 ? f2 : f1;
        standings[winner].wins++;
        standings[loser].losses++;
      }
    }
  });

  renderStandings(standings);
}

function renderStandings(standings) {
  const tbody = document.querySelector("#standingsTable tbody");
  tbody.innerHTML = "";
  Object.entries(standings).forEach(([fighter, record]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${fighter}</td><td>${record.wins}</td><td>${record.losses}</td>`;
    tbody.appendChild(row);
  });
}

initMatchup();
loadStandings();
