// app.js – GymTracker sovelluksen logiikka ja UI
// Lukee harjoitusohjelman program.js:stä (WORKOUT_PROGRAM)

const STORAGE_KEY = 'gymtracker_history';
const REST_DURATION = 90; // sekuntia

// ── State ────────────────────────────────────────────────────────────────────
let state = {
  view: 'dashboard',           // 'dashboard' | 'workout' | 'history'
  workout: null,               // { type: 'A'|'B', exercises: [...] }
  exerciseOrder: [],           // indeksit, skip siirtää loppuun
  currentExerciseIdx: 0,
  currentSetIdx: 0,
  completedSets: {},           // { exIdx: [{ weight, reps }] }
  restTimer: null,             // { interval, remaining }
};

// ── Storage ──────────────────────────────────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function getLastWorkoutType() {
  const history = loadHistory();
  if (!history.length) return null;
  return history[history.length - 1].type;
}

function getNextWorkoutType() {
  const last = getLastWorkoutType();
  if (!last || last === 'B') return 'A';
  return 'B';
}

// Palauttaa viimeksi käytetyn painon harjoitukselle (tai null)
function getWeightSuggestion(exerciseName) {
  const history = loadHistory();
  for (let i = history.length - 1; i >= 0; i--) {
    const session = history[i];
    const ex = session.exercises.find(e => e.name === exerciseName);
    if (ex && ex.sets.length > 0) {
      const lastSet = ex.sets[ex.sets.length - 1];
      if (lastSet.weight != null) return lastSet.weight;
    }
  }
  return null;
}

function saveWorkoutSession(workoutType, exercises) {
  const history = loadHistory();
  const session = {
    id: Date.now().toString(),
    type: workoutType,
    date: new Date().toISOString(),
    exercises: exercises
  };
  history.push(session);
  saveHistory(history);
}

// ── Timer ────────────────────────────────────────────────────────────────────
function startRestTimer(onComplete) {
  stopRestTimer();
  state.restTimer = { remaining: REST_DURATION };
  renderRestTimer();

  state.restTimer.interval = setInterval(() => {
    state.restTimer.remaining--;
    if (state.restTimer.remaining <= 0) {
      stopRestTimer();
      onComplete();
    } else {
      renderRestTimer();
    }
  }, 1000);
}

function stopRestTimer() {
  if (state.restTimer && state.restTimer.interval) {
    clearInterval(state.restTimer.interval);
  }
  state.restTimer = null;
}

// ── Workout logic ────────────────────────────────────────────────────────────
function startWorkout(type) {
  const program = WORKOUT_PROGRAM[type];
  const exerciseCount = program.exercises.length;
  state.workout = { type, exercises: program.exercises };
  state.exerciseOrder = Array.from({ length: exerciseCount }, (_, i) => i);
  state.currentExerciseIdx = 0;
  state.currentSetIdx = 0;
  state.completedSets = {};
  stopRestTimer();
  setView('workout');
}

function getCurrentExercise() {
  const realIdx = state.exerciseOrder[state.currentExerciseIdx];
  return state.workout.exercises[realIdx];
}

function getCurrentRealIdx() {
  return state.exerciseOrder[state.currentExerciseIdx];
}

function skipCurrentExercise() {
  if (state.exerciseOrder.length <= 1) return;
  const skipped = state.exerciseOrder.splice(state.currentExerciseIdx, 1)[0];
  state.exerciseOrder.push(skipped);
  state.currentSetIdx = 0;
  stopRestTimer();
  renderWorkoutView();
}

function completeSet(weight, reps) {
  const realIdx = getCurrentRealIdx();
  if (!state.completedSets[realIdx]) state.completedSets[realIdx] = [];
  state.completedSets[realIdx].push({ weight, reps });
  state.currentSetIdx++;

  const ex = getCurrentExercise();
  const targetSets = ex.setsMax;
  if (state.currentSetIdx >= targetSets) {
    // Kaikki sarjat tehty – näytä lepotauko ja tarjoa siirtyä seuraavaan
    startRestTimer(() => {
      renderWorkoutView(); // Ajastin loppui → normaali näkymä
    });
    renderWorkoutAfterSet(true);
  } else {
    startRestTimer(() => {
      renderWorkoutView();
    });
    renderWorkoutAfterSet(false);
  }
}

function nextExercise() {
  state.currentExerciseIdx++;
  state.currentSetIdx = 0;
  stopRestTimer();
  if (state.currentExerciseIdx >= state.exerciseOrder.length) {
    finishWorkout();
  } else {
    renderWorkoutView();
  }
}

function finishWorkout() {
  const exercises = state.exerciseOrder.map(realIdx => {
    const ex = state.workout.exercises[realIdx];
    const sets = state.completedSets[realIdx] || [];
    return { name: ex.name, sets };
  });
  saveWorkoutSession(state.workout.type, exercises);
  setView('dashboard');
}

// ── Views ────────────────────────────────────────────────────────────────────
function setView(view) {
  state.view = view;
  stopRestTimer();
  render();
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  if (state.view === 'dashboard') renderDashboard(app);
  else if (state.view === 'workout') renderWorkoutView();
  else if (state.view === 'history') renderHistory(app);
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function renderDashboard(container) {
  const history = loadHistory();
  const nextType = getNextWorkoutType();
  const nextProgram = WORKOUT_PROGRAM[nextType];
  const lastSession = history.length ? history[history.length - 1] : null;

  const lastInfo = lastSession
    ? `Edellinen treeni: Treeni ${lastSession.type} – ${formatDate(lastSession.date)}`
    : 'Ei aiempia treenejä';

  container.innerHTML = `
    <div class="dashboard">
      <div class="header">
        <h1 class="app-title">💪 GymTracker</h1>
        <p class="app-subtitle">Seuraa, kehity, voita.</p>
      </div>

      <div class="next-workout-card">
        <div class="next-label">Seuraava treeni</div>
        <div class="next-type">Treeni ${nextType}</div>
        <div class="next-name">${nextProgram.name}</div>
        <div class="exercise-list-preview">
          ${nextProgram.exercises.map(e => `<span class="exercise-chip">${e.name}</span>`).join('')}
        </div>
        <button class="btn btn-primary btn-large" onclick="startWorkout('${nextType}')">
          Aloita treeni →
        </button>
      </div>

      <div class="last-workout-info">${lastInfo}</div>

      <div class="action-row">
        <button class="btn btn-secondary" onclick="setView('history')">
          📋 Historia
        </button>
        <button class="btn btn-secondary" onclick="chooseWorkout()">
          🔀 Valitse treeni
        </button>
      </div>

      ${renderWarmupCard()}
    </div>
  `;
}

function chooseWorkout() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="dashboard">
      <div class="header">
        <button class="btn-back" onclick="setView('dashboard')">← Takaisin</button>
        <h2>Valitse treeni</h2>
      </div>
      <div class="choose-cards">
        <button class="choose-card" onclick="startWorkout('A')">
          <div class="choose-type">Treeni A</div>
          <div class="choose-name">${WORKOUT_PROGRAM.A.name}</div>
          <div class="choose-exercises">${WORKOUT_PROGRAM.A.exercises.length} liikettä</div>
        </button>
        <button class="choose-card" onclick="startWorkout('B')">
          <div class="choose-type">Treeni B</div>
          <div class="choose-name">${WORKOUT_PROGRAM.B.name}</div>
          <div class="choose-exercises">${WORKOUT_PROGRAM.B.exercises.length} liikettä</div>
        </button>
      </div>
    </div>
  `;
}

function renderWarmupCard() {
  return `
    <div class="warmup-card">
      <div class="warmup-title">🔥 Muista lämmittely!</div>
      <div class="warmup-text">5–10 min soutulaite, crosstrainer tai reipas kävely + käsien/jalkojen pyörittelyt</div>
    </div>
  `;
}

// ── Workout view ─────────────────────────────────────────────────────────────
function renderWorkoutView() {
  const app = document.getElementById('app');
  const ex = getCurrentExercise();
  const realIdx = getCurrentRealIdx();
  const totalExercises = state.exerciseOrder.length;
  const exNum = state.currentExerciseIdx + 1;
  const completedSetsForEx = state.completedSets[realIdx] || [];
  const currentSet = state.currentSetIdx + 1;
  const totalSets = ex.setsMax;
  const allSetsDone = state.currentSetIdx >= totalSets;

  const suggestion = ex.type === 'weight' ? getWeightSuggestion(ex.name) : null;
  const weightPlaceholder = suggestion != null ? `${suggestion}` : '';
  const weightHint = suggestion != null ? `Viimeksi: ${suggestion} kg` : '';

  app.innerHTML = `
    <div class="workout-view">
      <div class="workout-header">
        <button class="btn-back" onclick="confirmEndWorkout()">✕</button>
        <div class="progress-info">
          <span class="ex-counter">${exNum} / ${totalExercises}</span>
          <div class="progress-bar-wrap">
            <div class="progress-bar" style="width:${(exNum/totalExercises)*100}%"></div>
          </div>
        </div>
      </div>

      <div class="exercise-card">
        <div class="exercise-header">
          <div>
            <h2 class="exercise-name">${ex.name}</h2>
            <div class="exercise-target">${ex.target}</div>
          </div>
          <button class="btn-skip" onclick="confirmSkip()" title="Laite varattu – ohita">
            ⏭ Ohita
          </button>
        </div>

        <div class="sets-info">
          ${ex.setsMin === ex.setsMax
            ? `${ex.setsMax} sarjaa`
            : `${ex.setsMin}–${ex.setsMax} sarjaa`}
          ×
          ${ex.repsMin === ex.repsMax
            ? (ex.type === 'time' ? `${ex.repsMax} sek` : `${ex.repsMax} toistoa`)
            : (ex.type === 'time' ? `${ex.repsMin}–${ex.repsMax} sek` : (ex.type === 'reps_per_side' ? `${ex.repsMin}–${ex.repsMax} / puoli` : `${ex.repsMin}–${ex.repsMax} toistoa`))
          }
        </div>

        ${completedSetsForEx.length > 0 ? `
          <div class="completed-sets">
            ${completedSetsForEx.map((s, i) => `
              <div class="completed-set">
                <span class="set-num">Sarja ${i + 1}</span>
                <span class="set-result">${formatSetResult(ex.type, s)}</span>
                <span class="set-check">✓</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${!allSetsDone ? `
          <div class="set-input-card" id="set-input-area">
            <div class="set-label">Sarja ${currentSet}</div>
            <div class="input-row">
              ${ex.type === 'weight' ? `
                <div class="input-group">
                  <label>Paino (kg)</label>
                  <input type="number" id="weight-input" inputmode="decimal"
                    placeholder="${weightPlaceholder}" min="0" step="0.5">
                  ${weightHint ? `<div class="input-hint">${weightHint}</div>` : ''}
                </div>
              ` : ''}
              <div class="input-group">
                <label>${ex.type === 'time' ? 'Sekuntia' : ex.type === 'reps_per_side' ? 'Toistoa / puoli' : 'Toistoa'}</label>
                <input type="number" id="reps-input" inputmode="numeric"
                  placeholder="${ex.repsMax}" min="0">
              </div>
            </div>
            <button class="btn btn-primary btn-complete" onclick="handleCompleteSet()">
              ✓ Sarja ${currentSet} valmis
            </button>
          </div>
        ` : `
          <div class="all-sets-done">
            Kaikki sarjat tehty! 🎉
          </div>
        `}

        ${ex.note ? `
          <div class="exercise-note">
            <span class="note-icon">💡</span> ${ex.note}
          </div>
        ` : ''}
      </div>

      ${allSetsDone && !state.restTimer ? `
        <button class="btn btn-primary btn-large btn-next" onclick="nextExercise()">
          ${state.currentExerciseIdx + 1 >= state.exerciseOrder.length
            ? 'Lopeta treeni ✓'
            : 'Seuraava liike →'}
        </button>
      ` : ''}

      <div id="rest-timer-area"></div>
    </div>
  `;

  if (state.restTimer) renderRestTimer();
}

function renderWorkoutAfterSet(allDone) {
  // Re-render ja näytä ajastin
  renderWorkoutView();
}

function renderRestTimer() {
  const area = document.getElementById('rest-timer-area');
  if (!area || !state.restTimer) return;

  const remaining = state.restTimer.remaining;
  const pct = (remaining / REST_DURATION) * 100;
  const isUrgent = remaining <= 10;
  const isDone = remaining <= 0;

  area.innerHTML = `
    <div class="rest-timer ${isUrgent ? 'urgent' : ''} ${isDone ? 'timer-done' : ''}">
      <div class="timer-label">${isDone ? 'Lepo ohi!' : 'Lepotauko'}</div>
      <div class="timer-circle">
        <svg viewBox="0 0 100 100" class="timer-svg">
          <circle class="timer-track" cx="50" cy="50" r="42"/>
          <circle class="timer-progress" cx="50" cy="50" r="42"
            stroke-dasharray="264"
            stroke-dashoffset="${264 - (264 * pct / 100)}"/>
        </svg>
        <div class="timer-number">${remaining}</div>
      </div>
      <button class="btn btn-ghost" onclick="skipRest()">Ohita lepo</button>
    </div>
  `;
}

function skipRest() {
  stopRestTimer();
  renderWorkoutView();
}

function handleCompleteSet() {
  const ex = getCurrentExercise();
  let weight = null;
  let reps = null;

  if (ex.type === 'weight') {
    const wInput = document.getElementById('weight-input');
    weight = wInput && wInput.value !== '' ? parseFloat(wInput.value) : null;
  }

  const rInput = document.getElementById('reps-input');
  reps = rInput && rInput.value !== '' ? parseInt(rInput.value, 10) : ex.repsMax;

  completeSet(weight, reps);
}

function formatSetResult(type, set) {
  if (type === 'weight') {
    const kg = set.weight != null ? `${set.weight} kg` : '–';
    return `${kg} × ${set.reps}`;
  }
  if (type === 'time') return `${set.reps} sek`;
  if (type === 'reps_per_side') return `${set.reps} / puoli`;
  return `${set.reps}`;
}

function confirmSkip() {
  if (state.exerciseOrder.length - state.currentExerciseIdx <= 1) {
    showToast('Viimeinen liike, ei voi ohittaa');
    return;
  }
  if (confirm('Laite varattu? Siirretään liike myöhemmäksi.')) {
    skipCurrentExercise();
  }
}

function confirmEndWorkout() {
  if (confirm('Lopetetaanko treeni? Suoritetut sarjat tallennetaan.')) {
    finishWorkout();
  }
}

// ── History ──────────────────────────────────────────────────────────────────
function renderHistory(container) {
  const history = loadHistory();

  container.innerHTML = `
    <div class="history-view">
      <div class="header">
        <button class="btn-back" onclick="setView('dashboard')">← Takaisin</button>
        <h2>Treenihistoria</h2>
      </div>
      ${history.length === 0
        ? '<div class="empty-state">Ei tallennettuja treenejä vielä.</div>'
        : [...history].reverse().map((session, i) => renderSessionCard(session, i)).join('')
      }
    </div>
  `;
}

function renderSessionCard(session, i) {
  const dateStr = formatDate(session.date);
  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);

  return `
    <div class="session-card" onclick="toggleSessionDetail('detail-${i}')">
      <div class="session-header">
        <div>
          <span class="session-type-badge type-${session.type}">Treeni ${session.type}</span>
          <span class="session-date">${dateStr}</span>
        </div>
        <span class="session-summary">${session.exercises.length} liikettä · ${totalSets} sarjaa</span>
      </div>
      <div class="session-detail" id="detail-${i}" style="display:none">
        ${session.exercises.map(ex => `
          <div class="history-exercise">
            <div class="history-ex-name">${ex.name}</div>
            <div class="history-sets">
              ${ex.sets.map((s, si) => `
                <span class="history-set">
                  S${si + 1}: ${s.weight != null ? s.weight + ' kg × ' : ''}${s.reps}
                </span>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function toggleSessionDetail(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  const days = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];
  const day = days[d.getDay()];
  const date = d.getDate();
  const months = ['tam', 'hel', 'maa', 'huh', 'tou', 'kes', 'hei', 'elo', 'syy', 'lok', 'mar', 'jou'];
  const month = months[d.getMonth()];
  return `${day} ${date}. ${month}`;
}

let toastTimeout;
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  render();
});
