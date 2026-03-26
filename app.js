// app.js – GymTracker sovelluksen logiikka ja UI
// Lukee harjoitusohjelman program.js:stä (WORKOUT_PROGRAM)

const STORAGE_KEY = 'gymtracker_history';
const ACTIVE_KEY  = 'gymtracker_active';
const REST_DURATION = 90; // sekuntia

// ── State ────────────────────────────────────────────────────────────────────
let state = {
  view: 'dashboard',           // 'dashboard' | 'workout' | 'history'
  workout: null,               // { type: 'A'|'B', exercises: [...] }
  exerciseOrder: [],           // indeksit, skip siirtää loppuun
  currentExerciseIdx: 0,
  currentSetIdx: 0,
  completedSets: {},           // { exIdx: [{ weight, reps }] }
  restTimer: null,             // { interval, remaining, total }
  setTimer: null,              // { interval, remaining, total } – aikaharjoituksen sarja
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

// ── Active session persistence ────────────────────────────────────────────────
function saveActiveSession() {
  if (!state.workout) return;
  localStorage.setItem(ACTIVE_KEY, JSON.stringify({
    type: state.workout.type,
    exerciseOrder: state.exerciseOrder,
    currentExerciseIdx: state.currentExerciseIdx,
    currentSetIdx: state.currentSetIdx,
    completedSets: state.completedSets,
    startedAt: state.startedAt || new Date().toISOString()
  }));
}

function clearActiveSession() {
  localStorage.removeItem(ACTIVE_KEY);
}

function loadActiveSession() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_KEY)) || null;
  } catch { return null; }
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
// ── Audio ─────────────────────────────────────────────────────────────────────
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch(e) {}
}

// ── Set timer (aikaharjoitukset) ──────────────────────────────────────────────
function startSetTimer(duration) {
  stopSetTimer();
  state.setTimer = { remaining: duration, total: duration };
  renderSetTimerHTML();

  state.setTimer.interval = setInterval(() => {
    state.setTimer.remaining--;
    if (state.setTimer.remaining <= 0) {
      stopSetTimer();
      playBeep();
      if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
      completeSet(null, duration);
    } else {
      updateSetTimer();
    }
  }, 1000);
}

function stopSetTimer() {
  if (state.setTimer && state.setTimer.interval) {
    clearInterval(state.setTimer.interval);
  }
  state.setTimer = null;
}

function renderSetTimerHTML() {
  const area = document.getElementById('set-timer-area');
  if (!area) return;
  const r = 46;
  const circ = +(2 * Math.PI * r).toFixed(2);
  area.innerHTML = `
    <div class="set-timer-card" id="set-timer-card">
      <div class="timer-label">Sarja käynnissä</div>
      <div class="timer-circle">
        <svg viewBox="0 0 110 110" class="timer-svg">
          <circle class="timer-track" cx="55" cy="55" r="${r}"/>
          <circle class="set-timer-progress" id="set-timer-arc" cx="55" cy="55" r="${r}"
            stroke-dasharray="${circ}" stroke-dashoffset="0"/>
        </svg>
        <div class="timer-number" id="set-timer-num">${state.setTimer ? state.setTimer.remaining : 0}</div>
      </div>
      <button class="btn btn-ghost" onclick="stopSetTimerEarly()">Lopeta aikaistui</button>
    </div>
  `;
  updateSetTimer();
}

function updateSetTimer() {
  if (!state.setTimer) return;
  const remaining = state.setTimer.remaining;
  const r = 46;
  const circ = +(2 * Math.PI * r).toFixed(2);
  const pct = Math.max(0, remaining / state.setTimer.total);
  const arc = document.getElementById('set-timer-arc');
  const numEl = document.getElementById('set-timer-num');
  if (!arc || !numEl) return;
  arc.style.strokeDashoffset = `${circ * (1 - pct)}`;
  numEl.textContent = remaining;
  numEl.classList.remove('ticking');
  void numEl.offsetWidth;
  numEl.classList.add('ticking');
}

function stopSetTimerEarly() {
  if (!state.setTimer) return;
  const elapsed = state.setTimer.total - state.setTimer.remaining;
  stopSetTimer();
  completeSet(null, elapsed);
}

// ── Rest timer ────────────────────────────────────────────────────────────────
function startRestTimer(duration, onComplete) {
  stopRestTimer();
  state.restTimer = { remaining: duration, total: duration };

  state.restTimer.interval = setInterval(() => {
    state.restTimer.remaining--;
    if (state.restTimer.remaining <= 0) {
      stopRestTimer();
      onComplete();
    } else {
      updateRestTimer();
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
  state.startedAt = new Date().toISOString();
  stopRestTimer();
  saveActiveSession();
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
  saveActiveSession();
  renderWorkoutView();
}

function completeSet(weight, reps) {
  const realIdx = getCurrentRealIdx();
  if (!state.completedSets[realIdx]) state.completedSets[realIdx] = [];
  state.completedSets[realIdx].push({ weight, reps });
  state.currentSetIdx++;
  saveActiveSession();

  const ex = getCurrentExercise();
  const restDur = ex.restDuration || REST_DURATION;
  const targetSets = ex.setsMax;
  if (state.currentSetIdx >= targetSets) {
    startRestTimer(restDur, () => renderWorkoutView());
    renderWorkoutAfterSet(true);
  } else {
    startRestTimer(restDur, () => renderWorkoutView());
    renderWorkoutAfterSet(false);
  }
}

function nextExercise() {
  state.currentExerciseIdx++;
  state.currentSetIdx = 0;
  stopRestTimer();
  stopSetTimer();
  if (state.currentExerciseIdx >= state.exerciseOrder.length) {
    finishWorkout();
  } else {
    saveActiveSession();
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
  clearActiveSession();
  setView('dashboard');
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal({ title, message, confirmText = 'OK', cancelText = null, onConfirm, onCancel } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      ${title ? `<div class="modal-title">${title}</div>` : ''}
      ${message ? `<div class="modal-message">${message}</div>` : ''}
      <div class="modal-actions">
        <button class="btn btn-primary btn-large modal-confirm">${confirmText}</button>
        ${cancelText ? `<button class="btn btn-ghost btn-large modal-cancel">${cancelText}</button>` : ''}
      </div>
    </div>
  `;
  overlay.querySelector('.modal-confirm').addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
  if (cancelText) {
    overlay.querySelector('.modal-cancel').addEventListener('click', () => {
      overlay.remove();
      if (onCancel) onCancel();
    });
  }
  document.body.appendChild(overlay);
}

// ── Views ─────────────────────────────────────────────────────────────────────
function setView(view, pushHistory = true) {
  state.view = view;
  stopRestTimer();
  if (pushHistory) history.pushState({ view }, '');
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
  const lastSession = history.length ? history[history.length - 1] : null;

  const lastInfo = lastSession
    ? `Edellinen treeni: Treeni ${lastSession.type} – ${formatDate(lastSession.date)}`
    : 'Ei aiempia treenejä';

  // Järjestä kortit niin että suositeltu on ensin
  const types = nextType === 'A' ? ['A', 'B'] : ['B', 'A'];

  container.innerHTML = `
    <div class="dashboard">
      <div class="header">
        <h1 class="app-title">💪 GymTracker</h1>
        <p class="app-subtitle">Seuraa, kehity, voita.</p>
      </div>

      <div>
        <div class="swipe-wrapper" id="swipe-wrapper">
          <div class="swipe-track" id="swipe-track">
            ${[types[1], types[0], types[1], types[0]].map(t => renderWorkoutSwipeCard(t, t === nextType)).join('')}
          </div>
        </div>
        <div class="swipe-dots" id="swipe-dots">
          <div class="swipe-dot active" data-idx="0"></div>
          <div class="swipe-dot" data-idx="1"></div>
        </div>
      </div>

      <div class="last-workout-info">${lastInfo}</div>

      <button class="btn btn-secondary" onclick="setView('history')" style="width:100%">
        📋 Treenihistoria
      </button>

      ${renderWarmupCard()}
    </div>
  `;

  initSwipe(types);
}

function renderWorkoutSwipeCard(type, isRecommended) {
  const program = WORKOUT_PROGRAM[type];
  const label = isRecommended ? 'Seuraava treeni' : 'Vaihtoehtoinen treeni';
  return `
    <div class="swipe-card ${type === 'B' ? 'type-b' : ''}">
      <div class="next-label">${label}</div>
      <div class="next-type">Treeni ${type}</div>
      <div class="next-name">${program.name}</div>
      <div class="exercise-list-preview">
        ${program.exercises.map(e => `<span class="exercise-chip">${e.name}</span>`).join('')}
      </div>
      <button class="btn btn-primary btn-large" onclick="startWorkout('${type}')">
        Aloita treeni →
      </button>
    </div>
  `;
}

function initSwipe(types) {
  const wrapper = document.getElementById('swipe-wrapper');
  const track = document.getElementById('swipe-track');
  const dots = document.querySelectorAll('.swipe-dot');
  if (!wrapper || !track) return;

  // Layout: [clone_last, types[0], types[1], clone_first] → total 4 cards
  const total = 4;
  let currentIdx = 1; // start at first real card
  let isTracking = false;
  let startX = 0;
  let startY = 0;
  let isHorizontal = null;
  let dragDelta = 0;

  function updateDots(idx) {
    // real dot index: idx 1→dot 0, idx 2→dot 1, idx 0→dot 1, idx 3→dot 0
    const dotIdx = (idx - 1 + types.length) % types.length;
    dots.forEach((d, i) => d.classList.toggle('active', i === dotIdx));
  }

  function snapTo(idx, animate) {
    currentIdx = idx;
    if (!animate) {
      track.classList.add('no-transition');
      track.style.transform = `translateX(-${idx * 100}%)`;
      track.offsetHeight; // force reflow
      track.classList.remove('no-transition');
    } else {
      track.classList.remove('dragging');
      track.style.transform = `translateX(-${idx * 100}%)`;
    }
    updateDots(idx);
  }

  // After animated transition: if on a clone, silently jump to real counterpart
  track.addEventListener('transitionend', () => {
    if (currentIdx === 0) snapTo(total - 2, false);
    else if (currentIdx === total - 1) snapTo(1, false);
  });

  snapTo(1, false); // init without animation

  // Touch
  wrapper.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isTracking = true;
    isHorizontal = null;
    dragDelta = 0;
  }, { passive: true });

  wrapper.addEventListener('touchmove', e => {
    if (!isTracking) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (isHorizontal === null && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      isHorizontal = Math.abs(dx) >= Math.abs(dy);
    }
    if (!isHorizontal) return;
    e.preventDefault();
    dragDelta = dx;
    track.classList.add('dragging');
    track.style.transform = `translateX(calc(-${currentIdx * 100}% + ${dx}px))`;
  }, { passive: false });

  wrapper.addEventListener('touchend', () => {
    if (!isTracking) return;
    isTracking = false;
    isHorizontal = null;
    if (dragDelta < -50) snapTo(currentIdx + 1, true);
    else if (dragDelta > 50) snapTo(currentIdx - 1, true);
    else snapTo(currentIdx, true);
    dragDelta = 0;
  });

  // Mouse (desktop)
  wrapper.addEventListener('mousedown', e => {
    e.preventDefault();
    startX = e.clientX;
    isTracking = true;
    dragDelta = 0;
  });
  window.addEventListener('mousemove', e => {
    if (!isTracking) return;
    dragDelta = e.clientX - startX;
    track.classList.add('dragging');
    track.style.transform = `translateX(calc(-${currentIdx * 100}% + ${dragDelta}px))`;
  });
  window.addEventListener('mouseup', () => {
    if (!isTracking) return;
    isTracking = false;
    if (dragDelta < -50) snapTo(currentIdx + 1, true);
    else if (dragDelta > 50) snapTo(currentIdx - 1, true);
    else snapTo(currentIdx, true);
    dragDelta = 0;
  });

  // Dots
  dots.forEach(dot => {
    dot.addEventListener('click', () => snapTo(parseInt(dot.dataset.idx) + 1, true));
  });
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

        ${!allSetsDone ? (
          state.setTimer ? `<div id="set-timer-area"></div>` :
          ex.type === 'time' ? `
            <div class="set-input-card" id="set-input-area">
              <div class="set-label">Sarja ${currentSet} – ${ex.repsMin}–${ex.repsMax} sek</div>
              <button class="btn btn-primary btn-large" onclick="startSetTimer(${ex.repsMax})">
                ▶ Käynnistä ajastin
              </button>
            </div>
          ` : `
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
                  <label>${ex.type === 'reps_per_side' ? 'Toistoa / puoli' : 'Toistoa'}</label>
                  <input type="number" id="reps-input" inputmode="numeric"
                    placeholder="${ex.repsMax}" min="0">
                </div>
              </div>
              <button class="btn btn-primary btn-complete" onclick="handleCompleteSet()">
                ✓ Sarja ${currentSet} valmis
              </button>
            </div>
          `
        ) : `
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

      ${!allSetsDone && !state.setTimer ? `
        <button class="btn btn-skip-below" onclick="confirmSkip()">
          ⏭ Laite varattu – ohita liike
        </button>
      ` : ''}

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

  if (state.setTimer) renderSetTimerHTML();
  if (state.restTimer) renderRestTimerHTML();
}

function renderWorkoutAfterSet(allDone) {
  // Re-render ja näytä ajastin
  renderWorkoutView();
}

// Luo ajastimen HTML kerran – ei kutsuta uudelleen tikityksessä
function renderRestTimerHTML() {
  const area = document.getElementById('rest-timer-area');
  if (!area) return;
  const r = 46;
  const circ = +(2 * Math.PI * r).toFixed(2); // ~289
  area.innerHTML = `
    <div class="rest-timer" id="rest-timer-card">
      <div class="timer-label" id="timer-label">Lepotauko</div>
      <div class="timer-circle">
        <svg viewBox="0 0 110 110" class="timer-svg">
          <circle class="timer-track" cx="55" cy="55" r="${r}"/>
          <circle class="timer-progress" id="timer-arc" cx="55" cy="55" r="${r}"
            stroke-dasharray="${circ}"
            stroke-dashoffset="0"/>
        </svg>
        <div class="timer-number" id="timer-num">${state.restTimer ? state.restTimer.total : REST_DURATION}</div>
      </div>
      <button class="btn btn-ghost" onclick="skipRest()">Ohita lepo</button>
    </div>
  `;
  // Aseta oikea tila heti renderöinnin jälkeen ilman viivettä
  updateRestTimer();
}

// Päivitä vain muuttuvat DOM-nodet joka sekunti
function updateRestTimer() {
  const remaining = state.restTimer ? state.restTimer.remaining : 0;
  const r = 46;
  const circ = +(2 * Math.PI * r).toFixed(2);
  const total = state.restTimer ? state.restTimer.total : REST_DURATION;
  const pct = Math.max(0, remaining / total);
  const isUrgent = remaining <= 10;

  const arc = document.getElementById('timer-arc');
  const numEl = document.getElementById('timer-num');
  const card = document.getElementById('rest-timer-card');
  if (!arc || !numEl || !card) return;

  arc.style.strokeDashoffset = `${circ * (1 - pct)}`;
  numEl.textContent = remaining;
  card.classList.toggle('urgent', isUrgent);

  // Pieni "pop"-animaatio numerossa joka sekunti
  numEl.classList.remove('ticking');
  void numEl.offsetWidth; // reflow
  numEl.classList.add('ticking');
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
  showModal({
    title: 'Ohita liike?',
    message: 'Laite varattu? Liike siirretään listan loppuun.',
    confirmText: 'Ohita liike',
    cancelText: 'Peruuta',
    onConfirm: skipCurrentExercise
  });
}

function confirmEndWorkout() {
  showModal({
    title: 'Lopeta treeni?',
    message: 'Suoritetut sarjat tallennetaan historiaan.',
    confirmText: 'Lopeta treeni',
    cancelText: 'Jatka treeeniä',
    onConfirm: finishWorkout
  });
}

// ── History ──────────────────────────────────────────────────────────────────
function renderHistory(container) {
  const history = loadHistory();

  container.innerHTML = `
    <div class="history-view">
      <div class="header">
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
  history.replaceState({ view: 'dashboard' }, '');

  const active = loadActiveSession();
  if (active) {
    const program = WORKOUT_PROGRAM[active.type];
    state.workout = { type: active.type, exercises: program.exercises };
    state.exerciseOrder = active.exerciseOrder;
    state.currentExerciseIdx = active.currentExerciseIdx;
    state.currentSetIdx = active.currentSetIdx;
    state.completedSets = active.completedSets;
    state.startedAt = active.startedAt;

    render(); // render dashboard first
    showModal({
      title: 'Jatka treeeniä?',
      message: `Sinulla on kesken Treeni ${active.type}. Haluatko jatkaa siitä mihin jäit?`,
      confirmText: 'Jatka treeeniä',
      cancelText: 'Aloita alusta',
      onConfirm: () => setView('workout'),
      onCancel: () => {
        clearActiveSession();
        state.workout = null;
        state.exerciseOrder = [];
        state.completedSets = {};
      }
    });
  } else {
    render();
  }

  window.addEventListener('popstate', e => {
    const view = e.state?.view || 'dashboard';
    if (state.view === 'workout') {
      // Push forward again to keep workout in history, then ask
      history.pushState({ view: 'workout' }, '');
      showModal({
        title: 'Lopeta treeni?',
        message: 'Suoritetut sarjat tallennetaan historiaan.',
        confirmText: 'Lopeta treeni',
        cancelText: 'Jatka treeeniä',
        onConfirm: finishWorkout
      });
    } else {
      setView(view, false);
    }
  });

  window.addEventListener('beforeunload', e => {
    if (state.view === 'workout' && state.workout) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
});
