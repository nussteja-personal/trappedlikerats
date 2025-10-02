import { db } from "./firebase.js";
import {
  collection, query, where, getDocs, doc, updateDoc, increment,
  onSnapshot, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const container = document.getElementById("matchupsContainer");
const standingsTable = document.querySelector("#standingsTable tbody");
const today = new Date().toISOString().split("T")[0]; // e.g. "2025-09-20"

const fightersCache = {};


// Clear local votes for previous days
Object.keys(localStorage).forEach(key => {
  if (key.startsWith("voted_") && !key.includes(today)) {
    localStorage.removeItem(key);
  }
});

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
  
      const completed = matchup.completed ?? false;
  
      const card = document.createElement("div");
      card.classList.add("matchup-card");
  
      card.innerHTML = `
      <div class="fighter">
        <button id="${matchupId}-btn-${matchup.fighter1}">
          Vote ${fighter1.name}
        </button>
        <img src="${fighter1.image}" alt="${fighter1.name}">
        <!-- <strong>${fighter1.name}</strong>  -->
        <!-- <p id="${matchupId}-count-${matchup.fighter1}">${matchup.votes[matchup.fighter1]}</p> -->
      </div>
      <div class="vs">VS</div>
      <div class="fighter">
        <img src="${fighter2.image}" alt="${fighter2.name}">
        <!-- <strong>${fighter2.name}</strong>  -->
        <!-- <p id="${matchupId}-count-${matchup.fighter1}">${matchup.votes[matchup.fighter1]}</p> -->
        <button id="${matchupId}-btn-${matchup.fighter2}">
          Vote ${fighter2.name}
        </button>
      </div>
    `;

    container.appendChild(card);

    if (!completed) {
      // Attach listeners for voting only if matchup is open
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

  // Load standings after matchups initially
  updateStandings();


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

// import { query, where, getDocs } from "firebase/firestore";

async function updateStandings() {
    const q = query(collection(db, "matchups"), where("completed", "==", true));
    const snapshot = await getDocs(q);
    const records = {};
  
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const f1 = data.fighter1;
      const f2 = data.fighter2;
      const votes = data.votes;
  
      if (!records[f1]) records[f1] = { wins: 0, losses: 0, ties: 0, votesFor: 0, votesAgainst: 0 };
      if (!records[f2]) records[f2] = { wins: 0, losses: 0, ties: 0, votesFor: 0, votesAgainst: 0 };
  
      const v1 = votes[f1] ?? 0;
      const v2 = votes[f2] ?? 0;
  
      // Win/Loss/Tie results (1 per matchup)
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
  
      // Tally votes for differential
      records[f1].votesFor += v1;
      records[f1].votesAgainst += v2;
  
      records[f2].votesFor += v2;
      records[f2].votesAgainst += v1;
    });
  
    // renderStandings(records);
  }
  
  async function renderStandings(records) {
    standingsTable.innerHTML = "";
  
    const sorted = Object.entries(records).sort((a, b) => {
      const [idA, recA] = a;
      const [idB, recB] = b;
  
      if (recB.wins !== recA.wins) return recB.wins - recA.wins;
      if (recA.losses !== recB.losses) return recA.losses - recB.losses;
  
      const diffA = recA.votesFor - recA.votesAgainst;
      const diffB = recB.votesFor - recB.votesAgainst;
      if (diffB !== diffA) return diffB - diffA; // higher differential first
  
      return recA.ties - recB.ties;
    });
  
    for (const [fighterId, record] of sorted) {
      const fighter = await getFighter(fighterId);
      const voteDiff = record.votesFor - record.votesAgainst;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${fighter.name}</td>
        <td>${record.wins}</td>
        <td>${record.losses}</td>
        <td>${record.ties}</td>
        <td>${voteDiff}</td>
      `;
      standingsTable.appendChild(row);
    }
  }
  renderStandings(records);
