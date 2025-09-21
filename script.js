const characters = Array.from(document.querySelectorAll('.character'));

let p1Index = 0;
let p2Index = characters.length - 1;

const p1Panel = document.getElementById('p1-panel');
const p2Panel = document.getElementById('p2-panel');

const moveSound = document.getElementById('move-sound');
const selectSound = document.getElementById('select-sound');
const vsSound = document.getElementById('vs-sound');

let p1Locked = false;
let p2Locked = false;

// Update player panel
function updatePanel(panel, character) {
  panel.querySelector('.portrait').style.backgroundImage = `url(${character.dataset.image})`;
  panel.querySelector('.name').textContent = character.dataset.name;
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
  if (!p1Locked) {
    if (e.key === 'f') { // lock in
      p1Locked = true;
      selectSound.play();
      updatePanel(p1Panel, characters[p1Index]);
      checkBothLocked();
    }
  }

  if (!p2Locked) {
    if (e.key === 'Enter') { // lock in
      p2Locked = true;
      selectSound.play();
      updatePanel(p2Panel, characters[p2Index]);
      checkBothLocked();
    }
  }
});

// Click to select
characters.forEach((char, i) => {
  char.addEventListener('click', () => {
    if (!p1Locked) {
      p1Index = i;
      updatePanel(p1Panel, char);
      selectSound.play();
      p1Locked = true;
      checkBothLocked();
    } else if (!p2Locked) {
      p2Index = i;
      updatePanel(p2Panel, char);
      selectSound.play();
      p2Locked = true;
      checkBothLocked();
    }
  });
});

function checkBothLocked() {
  if (p1Locked && p2Locked) {
    vsSound.play();
  }
}

// Apply each character’s unique background
document.querySelectorAll('.character').forEach(char => {
  const bg = char.dataset.bg;
  if (bg) {
    char.style.backgroundImage = `url(${bg})`;
  }
});






// // === Fighter Data ===
// // You can reuse this array from your original page
// const fighters = [
//   { name: "Jin", image: "images/jin.webp", wins: 0, losses: 0 },
//   { name: "Kazuya", image: "images/kazuya.webp", wins: 0, losses: 0 },
//   { name: "Paul", image: "images/paul.webp", wins: 0, losses: 0 },
//   { name: "King", image: "images/king.webp", wins: 0, losses: 0 }
// ];

// // === Load any saved data from localStorage ===
// const savedStats = JSON.parse(localStorage.getItem("fighterStats"));
// if (savedStats) {
//   fighters.forEach(f => {
//     const saved = savedStats.find(s => s.name === f.name);
//     if (saved) {
//       f.wins = saved.wins;
//       f.losses = saved.losses;
//     }
//   });
// }

// // === DOM References ===
// const fighterEls = [document.getElementById("fighter1"), document.getElementById("fighter2")];
// const standingsTable = document.querySelector("#standings tbody");

// let currentMatchup = [];

// // === Utility: Pick Two Random Fighters ===
// function pickMatchup() {
//   let i = Math.floor(Math.random() * fighters.length);
//   let j;
//   do {
//     j = Math.floor(Math.random() * fighters.length);
//   } while (j === i);

//   currentMatchup = [fighters[i], fighters[j]];
//   renderMatchup();
// }

// // === Render the Matchup to the Page ===
// function renderMatchup() {
//   fighterEls.forEach((el, index) => {
//     const fighter = currentMatchup[index];
//     el.querySelector("img").src = fighter.image;
//     el.querySelector("img").alt = fighter.name;
//     el.querySelector(".fighter-name").textContent = fighter.name;
//     el.querySelector("button").textContent = `Vote ${fighter.name}`;
//   });
// }

// // === Handle a Vote ===
// function vote(index) {
//   const winner = currentMatchup[index];
//   const loser = currentMatchup[index === 0 ? 1 : 0];

//   winner.wins++;
//   loser.losses++;

//   saveStats();
//   renderLeaderboard();
//   pickMatchup();
// }

// // === Save Stats to localStorage ===
// function saveStats() {
//   localStorage.setItem("fighterStats", JSON.stringify(fighters));
// }

// // === Render Leaderboard Table ===
// function renderLeaderboard() {
//   // Sort fighters by wins (descending)
//   const sorted = [...fighters].sort((a, b) => b.wins - a.wins);

//   standingsTable.innerHTML = "";
//   sorted.forEach(f => {
//     const totalMatches = f.wins + f.losses;
//     const winPct = totalMatches > 0 ? ((f.wins / totalMatches) * 100).toFixed(1) + "%" : "-";
//     const row = document.createElement("tr");
//     row.innerHTML = `
//       <td>${f.name}</td>
//       <td>${f.wins}</td>
//       <td>${f.losses}</td>
//       <td>${winPct}</td>
//     `;
//     standingsTable.appendChild(row);
//   });
// }

// // === Initialize Page ===
// renderLeaderboard();
// pickMatchup();