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

