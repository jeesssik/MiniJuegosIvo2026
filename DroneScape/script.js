// ============================================================
//  DroneScape — Lógica del juego
//  Conceptos: algoritmos, secuencias, planificación
// ============================================================

// ── Levels ──────────────────────────────────────────────────
// 1 = muro (firewall), 0 = camino libre
// start / exit son coordenadas { r, c }

const LEVELS = [
  {
    number: 1,
    title:  'Calibración Básica',
    description:
      'El drone inicia su primer vuelo de prueba. ' +
      'Programa la secuencia de movimientos para alcanzar la salida (⊙).',
    maxCmds: 7,
    grid: [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ],
    start: { r: 1, c: 1 },
    exit:  { r: 4, c: 5 },
    // Solución: → → → → ↓ ↓ ↓
  },
  {
    number: 2,
    title:  'Protocolo Delta',
    description:
      'El firewall es más denso. Debes girar con precisión. ' +
      'Planifica cada paso antes de ejecutar.',
    maxCmds: 8,
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 1, 1, 1],
      [1, 1, 1, 0, 1, 1, 1, 1],
      [1, 1, 1, 0, 0, 0, 1, 1],
      [1, 1, 1, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    start: { r: 1, c: 1 },
    exit:  { r: 5, c: 5 },
    // Solución: → → ↓ ↓ → → ↓ ↓
  },
  {
    number: 3,
    title:  'Nodo Omega',
    description:
      'El núcleo del firewall. Máxima concentración: ' +
      'cada comando cuenta. ¡El sistema no perdonará errores!',
    maxCmds: 13,
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    start: { r: 1, c: 1 },
    exit:  { r: 7, c: 8 },
    // Solución: → → ↓ ↓ → → → ↓ ↓ → → ↓ ↓
  },
];

// ── Direction map ────────────────────────────────────────────
const DIRS = {
  UP:    { dr: -1, dc:  0, arrow: '↑' },
  DOWN:  { dr:  1, dc:  0, arrow: '↓' },
  LEFT:  { dr:  0, dc: -1, arrow: '←' },
  RIGHT: { dr:  0, dc:  1, arrow: '→' },
};

const DRONE_IMG_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#9ff6ff"/>
          <stop offset="100%" stop-color="#00d4ff"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="8" fill="none" stroke="url(#g)" stroke-width="3"/>
      <circle cx="48" cy="16" r="8" fill="none" stroke="url(#g)" stroke-width="3"/>
      <circle cx="16" cy="48" r="8" fill="none" stroke="url(#g)" stroke-width="3"/>
      <circle cx="48" cy="48" r="8" fill="none" stroke="url(#g)" stroke-width="3"/>
      <line x1="22" y1="20" x2="42" y2="20" stroke="#8fefff" stroke-width="2"/>
      <line x1="22" y1="44" x2="42" y2="44" stroke="#8fefff" stroke-width="2"/>
      <line x1="20" y1="22" x2="20" y2="42" stroke="#8fefff" stroke-width="2"/>
      <line x1="44" y1="22" x2="44" y2="42" stroke="#8fefff" stroke-width="2"/>
      <rect x="24" y="24" width="16" height="16" rx="4" fill="#0c1b2c" stroke="#7ee8ff" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="3.2" fill="#00d4ff"/>
    </svg>
  `);

function getDroneMarkup() {
  return `<img class="cell-icon drone-icon" src="${DRONE_IMG_SRC}" alt="Drone" />`;
}

// ── Game state ───────────────────────────────────────────────
let currentLevelIdx = 0;
let dronePos        = { r: 0, c: 0 };
let sequence        = [];
let isRunning       = false;

// ── DOM refs ─────────────────────────────────────────────────
const mazeEl         = document.getElementById('maze');
const sequenceEl     = document.getElementById('sequence');
const levelDisplayEl = document.getElementById('level-display');
const levelTitleEl   = document.getElementById('level-title');
const levelDescEl    = document.getElementById('level-desc');
const cmdCountEl     = document.getElementById('cmd-count');
const cmdMaxEl       = document.getElementById('cmd-max');
const statusMsgEl    = document.getElementById('status-msg');
const btnExecute     = document.getElementById('btn-execute');
const btnUndo        = document.getElementById('btn-undo');
const btnReset       = document.getElementById('btn-reset');
const overlay        = document.getElementById('overlay');
const overlayTitle   = document.getElementById('overlay-title');
const overlayMsg     = document.getElementById('overlay-msg');
const overlayIcon    = document.getElementById('overlay-icon');
const statCmds       = document.getElementById('stat-cmds');
const statLvl        = document.getElementById('stat-lvl');
const btnNext        = document.getElementById('btn-next');

// ── Init level ───────────────────────────────────────────────
function initLevel(idx) {
  currentLevelIdx = idx;
  const lvl = LEVELS[idx];

  dronePos = { ...lvl.start };
  sequence = [];
  isRunning = false;

  // Update header info
  levelDisplayEl.textContent = String(lvl.number).padStart(2, '0');
  levelTitleEl.textContent   = lvl.title;
  levelDescEl.textContent    = lvl.description;
  cmdMaxEl.textContent       = lvl.maxCmds;
  cmdCountEl.textContent     = '0';

  renderMaze();
  renderSequence();
  setStatus('', '');
  setControlsEnabled(true);
}

// ── Render maze ──────────────────────────────────────────────
function renderMaze() {
  const lvl  = LEVELS[currentLevelIdx];
  const rows = lvl.grid.length;
  const cols = lvl.grid[0].length;

  mazeEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
  mazeEl.innerHTML = '';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      if (lvl.grid[r][c] === 1) {
        cell.classList.add('wall');
      } else {
        cell.classList.add('path');
      }

      // Exit marker
      if (r === lvl.exit.r && c === lvl.exit.c) {
        cell.classList.add('exit');
        cell.innerHTML = '<span class="cell-icon exit-icon">⊙</span>';
      }

      // Drone starting position
      if (r === dronePos.r && c === dronePos.c) {
        cell.classList.add('drone');
        cell.innerHTML = getDroneMarkup();
      }

      mazeEl.appendChild(cell);
    }
  }
}

// ── Cell helpers ─────────────────────────────────────────────
function getCell(r, c) {
  return mazeEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

function moveDrone(oldR, oldC, newR, newC) {
  const lvl     = LEVELS[currentLevelIdx];
  const oldCell = getCell(oldR, oldC);
  const newCell = getCell(newR, newC);

  if (oldCell) {
    oldCell.classList.remove('drone');
    oldCell.innerHTML = '';

    // Mark as visited (unless it's the exit)
    if (!(oldR === lvl.exit.r && oldC === lvl.exit.c)) {
      oldCell.classList.add('visited');
      oldCell.innerHTML = '<span class="cell-icon visited-dot">·</span>';
    }
  }

  if (newCell) {
    const isExit = newR === lvl.exit.r && newC === lvl.exit.c;
    newCell.classList.remove('visited');
    newCell.innerHTML = getDroneMarkup();
    newCell.classList.add('drone');
    if (isExit) newCell.classList.add('on-exit');
  }
}

// ── Render sequence bar ───────────────────────────────────────
function renderSequence() {
  sequenceEl.innerHTML = '';
  cmdCountEl.textContent = sequence.length;

  if (sequence.length === 0) {
    const ph    = document.createElement('span');
    ph.className = 'seq-placeholder';
    ph.textContent = '— sin comandos —';
    sequenceEl.appendChild(ph);
    return;
  }

  sequence.forEach((dir, i) => {
    const el = document.createElement('div');
    el.className = 'seq-arrow';
    el.textContent = DIRS[dir].arrow;
    el.dataset.seqIndex = i;
    sequenceEl.appendChild(el);
  });
}

// ── Add / undo commands ───────────────────────────────────────
function addCommand(dir) {
  if (isRunning) return;
  const lvl = LEVELS[currentLevelIdx];

  if (sequence.length >= lvl.maxCmds) {
    setStatus(`Límite de ${lvl.maxCmds} comandos alcanzado.`, 'error');
    return;
  }

  sequence.push(dir);
  renderSequence();
  setStatus('', '');
}

function undoCommand() {
  if (isRunning || sequence.length === 0) return;
  sequence.pop();
  renderSequence();
  setStatus('', '');
}

function resetLevel() {
  if (isRunning) return;
  initLevel(currentLevelIdx);
}

// ── Execute ───────────────────────────────────────────────────
function execute() {
  if (isRunning || sequence.length === 0) return;

  isRunning = true;
  setControlsEnabled(false);
  setStatus('Ejecutando secuencia…', 'info');

  const lvl    = LEVELS[currentLevelIdx];
  const arrows = sequenceEl.querySelectorAll('.seq-arrow');
  let step     = 0;

  function runStep() {
    if (step >= sequence.length) {
      // All commands used — drone did not reach exit
      isRunning = false;
      setControlsEnabled(true);
      setStatus('Secuencia incompleta. El drone no llegó a la salida.', 'error');
      return;
    }

    const dir  = sequence[step];
    const { dr, dc } = DIRS[dir];
    const newR = dronePos.r + dr;
    const newC = dronePos.c + dc;

    // Highlight current arrow
    if (arrows[step]) arrows[step].classList.add('active');

    setTimeout(() => {
      // Check bounds and wall collision
      const outOfBounds = newR < 0 || newC < 0 ||
                          newR >= lvl.grid.length ||
                          newC >= lvl.grid[0].length;
      const isWall = outOfBounds || lvl.grid[newR][newC] === 1;

      if (isWall) {
        // Mark arrow as failed
        if (arrows[step]) {
          arrows[step].classList.remove('active');
          arrows[step].classList.add('fail');
        }
        // Flash the wall cell
        const wallCell = getCell(newR, newC);
        if (wallCell) {
          wallCell.classList.add('wall-hit');
          setTimeout(() => wallCell.classList.remove('wall-hit'), 450);
        }
        isRunning = false;
        setControlsEnabled(true);
        setStatus('¡COLISIÓN! El drone chocó contra el firewall.', 'error');
        return;
      }

      // Move drone
      const oldR = dronePos.r;
      const oldC = dronePos.c;
      dronePos = { r: newR, c: newC };
      moveDrone(oldR, oldC, newR, newC);

      if (arrows[step]) {
        arrows[step].classList.remove('active');
        arrows[step].classList.add('done');
      }

      // Check if reached exit
      if (newR === lvl.exit.r && newC === lvl.exit.c) {
        setTimeout(() => showVictory(), 450);
        return;
      }

      step++;
      setTimeout(runStep, 380);
    }, 320);
  }

  // Small initial delay for player to see the first highlight
  setTimeout(runStep, 250);
}

// ── Victory ───────────────────────────────────────────────────
function showVictory() {
  isRunning = false;
  const lvl         = LEVELS[currentLevelIdx];
  const isLast      = currentLevelIdx === LEVELS.length - 1;
  const stepsUsed   = sequence.length;

  overlayIcon.textContent  = '✓';
  overlayTitle.textContent = '¡FIREWALL EVADIDO!';
  overlayMsg.textContent   = isLast
    ? 'El drone completó todos los niveles. ¡Sistema comprometido con éxito!'
    : `Nivel ${lvl.number} superado. ¿Listo para el siguiente desafío?`;

  statCmds.textContent = stepsUsed;
  statLvl.textContent  = String(lvl.number).padStart(2, '0');

  btnNext.textContent = isLast ? '↺ JUGAR DE NUEVO' : 'SIGUIENTE NIVEL →';

  overlay.classList.remove('hidden');
}

// ── Status message ────────────────────────────────────────────
function setStatus(msg, type) {
  statusMsgEl.textContent = msg;
  statusMsgEl.className   = 'status-msg';
  if (type) statusMsgEl.classList.add(type);
}

// ── Enable / disable controls ─────────────────────────────────
function setControlsEnabled(enabled) {
  btnExecute.disabled = !enabled;
  btnUndo.disabled    = !enabled;
  btnReset.disabled   = !enabled;
  document.querySelectorAll('.dpad-btn').forEach(b => (b.disabled = !enabled));
}

// ── Event listeners ───────────────────────────────────────────

// D-Pad buttons
document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('click', () => addCommand(btn.dataset.dir));
});

// Action buttons
btnExecute.addEventListener('click', execute);
btnUndo.addEventListener('click', undoCommand);
btnReset.addEventListener('click', resetLevel);

// Overlay "Next / Restart"
btnNext.addEventListener('click', () => {
  overlay.classList.add('hidden');
  const next = currentLevelIdx + 1;
  initLevel(next < LEVELS.length ? next : 0);
});

// Keyboard support
document.addEventListener('keydown', e => {
  if (isRunning) return;
  const map = {
    ArrowUp:    'UP',
    ArrowDown:  'DOWN',
    ArrowLeft:  'LEFT',
    ArrowRight: 'RIGHT',
  };
  if (map[e.key]) {
    e.preventDefault();
    addCommand(map[e.key]);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    execute();
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    undoCommand();
  } else if (e.key.toLowerCase() === 'r') {
    resetLevel();
  }
});

// ── Start ─────────────────────────────────────────────────────
initLevel(0);
