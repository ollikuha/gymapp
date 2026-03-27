// app.js – GymTracker sovelluksen logiikka ja UI
// Lukee harjoitusohjelmat program.js:stä (PROGRAMS)

const ACTIVE_KEY   = 'gymtracker_active';
const PROGRAM_KEY  = 'gymtracker_program';
const REST_DURATION = 90; // sekuntia

// ── Wake Lock ─────────────────────────────────────────────────────────────────
let wakeLock = null;

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (_) {}
}

function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

// Näyttö sammuu taustalle mennessä – hankitaan takaisin kun siirrytään etualalle
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.setTimer) {
    acquireWakeLock();
  }
});

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

// ── IndexedDB ─────────────────────────────────────────────────────────────────
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('gymtracker', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('sessions', { keyPath: 'id' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function idbGetAll() {
  return new Promise((resolve, reject) => {
    const req = db.transaction('sessions', 'readonly').objectStore('sessions').getAll();
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror = e => reject(e.target.error);
  });
}

function idbPut(session) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').put(session);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

function idbDeleteMany(ids) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

// ── Program storage ───────────────────────────────────────────────────────────
function loadActiveProgramId() {
  return localStorage.getItem(PROGRAM_KEY) || null;
}

function saveActiveProgramId(id) {
  localStorage.setItem(PROGRAM_KEY, id);
}

function getActiveProgramData() {
  const id = loadActiveProgramId();
  return PROGRAMS.find(p => p.id === id) || PROGRAMS[0];
}

// Palauttaa vain aktiivisen ohjelman historia-sessiot
async function loadProgramHistory() {
  const prog = getActiveProgramData();
  const all = await idbGetAll();
  return all
    .filter(s => (s.programId || 'default') === prog.id)
    .sort((a, b) => a.id.localeCompare(b.id));
}

// Palauttaa viimeksi tehdyn treenijakotyypin aktiivisessa ohjelmassa
async function getLastWorkoutOfProgram() {
  const prog = getActiveProgramData();
  const all = await idbGetAll();
  for (let i = all.length - 1; i >= 0; i--) {
    if ((all[i].programId || 'default') === prog.id) return all[i].type;
  }
  return null;
}

async function getNextWorkoutType() {
  const prog = getActiveProgramData();
  const types = Object.keys(prog.workouts);
  const last = await getLastWorkoutOfProgram();
  if (!last) return types[0];
  return types[(types.indexOf(last) + 1) % types.length];
}

// Returns a progression-based suggestion for the next set of an exercise.
// Searches all sessions backwards to find the most recent data for exerciseName,
// then applies the progression model defined in exerciseDef.progression.
//
// exerciseDef – exercise object from program.js (needs repsMin, repsMax, progression)
//
// Returns: { weight, reps, isProgressed, hint }
//   weight       – suggested weight in kg, or null if no history
//   reps         – suggested rep target, or null (caller falls back to exerciseDef.repsMax)
//   isProgressed – true when weight is being increased this session
//   hint         – display string shown below the weight input
//
// Progression logic:
//   No history           → weight: null, hint: ''  (no suggestion shown)
//   No progression model → weight: lastWeight, hint: 'Viimeksi: X kg'
//   type "linear"        → weight: lastWeight + increment (always increases)
//   type "double"        → if lowest reps last session >= repsMax:
//                            weight + increment, reps reset to repsMin
//                          else:
//                            same weight, reps target = min(lowestReps + 1, repsMax)
async function getProgressionSuggestion(exerciseName, exerciseDef) {
  const all = await idbGetAll();
  let lastSets = null;
  let lastWeight = null;

  for (let i = all.length - 1; i >= 0; i--) {
    const ex = all[i].exercises.find(e => e.name === exerciseName);
    if (ex && ex.sets.length > 0) {
      lastSets = ex.sets;
      const weightSet = ex.sets.slice().reverse().find(s => s.weight != null);
      if (weightSet) lastWeight = weightSet.weight;
      break;
    }
  }

  if (lastSets === null || lastWeight === null) {
    return { weight: null, reps: null, isProgressed: false, hint: '' };
  }

  const prog = exerciseDef && exerciseDef.progression;

  if (!prog) {
    return { weight: lastWeight, reps: null, isProgressed: false, hint: `Viimeksi: ${lastWeight} kg` };
  }

  if (prog.type === 'linear') {
    const newWeight = Math.round((lastWeight + prog.weightIncrement) * 100) / 100;
    return {
      weight: newWeight,
      reps: null,
      isProgressed: true,
      hint: `Ehdotus: ${newWeight} kg ↑ (+${prog.weightIncrement} kg, lineaarinen)`
    };
  }

  if (prog.type === 'double') {
    const repsMin = exerciseDef.repsMin;
    const repsMax = exerciseDef.repsMax;
    const minReps = Math.min(...lastSets.map(s => s.reps));

    if (minReps >= repsMax) {
      const newWeight = Math.round((lastWeight + prog.weightIncrement) * 100) / 100;
      return {
        weight: newWeight,
        reps: repsMin,
        isProgressed: true,
        hint: `Ehdotus: ${newWeight} kg ↑ (+${prog.weightIncrement} kg, kaikki sarjat ${repsMax} toistolla)`
      };
    } else {
      const targetReps = Math.min(minReps + 1, repsMax);
      return {
        weight: lastWeight,
        reps: targetReps,
        isProgressed: false,
        hint: `Viimeksi: ${lastWeight} kg – tavoite ${targetReps} toistoa`
      };
    }
  }

  return { weight: lastWeight, reps: null, isProgressed: false, hint: `Viimeksi: ${lastWeight} kg` };
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

async function saveWorkoutSession(workoutType, exercises) {
  const session = {
    id: Date.now().toString(),
    type: workoutType,
    date: new Date().toISOString(),
    exercises: exercises,
    programId: loadActiveProgramId() || 'default'
  };
  await idbPut(session);
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
  stopRestTimer();
  acquireWakeLock();
  state.setTimer = { remaining: duration, total: duration };
  renderWorkoutView(); // luo DOM uudelleen set-timer-area:n kanssa, sitten renderSetTimerHTML

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
  releaseWakeLock();
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
      <button class="btn btn-ghost" onclick="stopSetTimerEarly()">Lopeta</button>
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
      playBeep();
      if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
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
  const program = getActiveProgramData().workouts[type];
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

async function skipCurrentExercise() {
  if (state.exerciseOrder.length <= 1) return;
  const skipped = state.exerciseOrder.splice(state.currentExerciseIdx, 1)[0];
  state.exerciseOrder.push(skipped);
  state.currentSetIdx = 0;
  stopRestTimer();
  saveActiveSession();
  await renderWorkoutView();
}

async function completeSet(weight, reps) {
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
    await renderWorkoutAfterSet(true);
  } else {
    startRestTimer(restDur, () => renderWorkoutView());
    await renderWorkoutAfterSet(false);
  }
}

async function nextExercise() {
  state.currentExerciseIdx++;
  state.currentSetIdx = 0;
  stopRestTimer();
  stopSetTimer();
  if (state.currentExerciseIdx >= state.exerciseOrder.length) {
    await finishWorkout();
  } else {
    saveActiveSession();
    await renderWorkoutView();
  }
}

async function finishWorkout() {
  const exercises = state.exerciseOrder.map(realIdx => {
    const ex = state.workout.exercises[realIdx];
    const sets = state.completedSets[realIdx] || [];
    return { name: ex.name, sets };
  });
  await saveWorkoutSession(state.workout.type, exercises);
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
  if (view !== 'history') { historyEditMode = false; historySelected.clear(); }
  if (pushHistory) history.pushState({ view }, '');
  render();
}

async function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  if (state.view === 'dashboard') await renderDashboard(app);
  else if (state.view === 'workout') await renderWorkoutView();
  else if (state.view === 'history') await renderHistory(app);
  else if (state.view === 'program-select') renderProgramSelect(app);
}

// ── Dashboard ────────────────────────────────────────────────────────────────
async function renderDashboard(container) {
  const prog = getActiveProgramData();
  const progHistory = await loadProgramHistory();
  const nextType = await getNextWorkoutType();
  const lastSession = progHistory.length ? progHistory[progHistory.length - 1] : null;

  const lastInfo = lastSession
    ? `Edellinen treeni: Treeni ${lastSession.type} – ${formatDate(lastSession.date)}`
    : 'Ei aiempia treenejä';

  const types = Object.keys(prog.workouts);
  // Järjestä kortit niin että suositeltu on ensin
  const orderedTypes = [nextType, ...types.filter(t => t !== nextType)];

  let carouselHTML;
  if (types.length === 1) {
    carouselHTML = `
      <div class="single-card-wrap">
        ${renderWorkoutSwipeCard(types[0], true)}
      </div>
    `;
  } else {
    // Carousel: [clone_last, ...orderedTypes, clone_first]
    const carouselItems = [orderedTypes[orderedTypes.length - 1], ...orderedTypes, orderedTypes[0]];
    carouselHTML = `
      <div class="swipe-wrapper" id="swipe-wrapper">
        <div class="swipe-track" id="swipe-track">
          ${carouselItems.map(t => renderWorkoutSwipeCard(t, t === nextType)).join('')}
        </div>
      </div>
      <div class="swipe-dots" id="swipe-dots">
        ${orderedTypes.map((_, i) => `<div class="swipe-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="dashboard">
      <div class="header">
        <div class="header-top">
          <h1 class="app-title">💪 GymTracker</h1>
          <button class="btn-program-switch" onclick="setView('program-select')">⚙</button>
        </div>
      </div>

      <div>
        ${carouselHTML}
      </div>

      <div class="last-workout-info">${lastInfo}</div>

      <button class="btn btn-secondary" onclick="setView('history')" style="width:100%">
        📋 Treenihistoria
      </button>

      ${renderWarmupCard()}
    </div>
  `;

  if (types.length > 1) initSwipe(orderedTypes);
}

function renderWorkoutSwipeCard(type, isRecommended) {
  const program = getActiveProgramData().workouts[type];
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

  // Layout: [clone_last, ...types, clone_first] → total = types.length + 2 cards
  const total = types.length + 2;
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
async function renderWorkoutView() {
  const app = document.getElementById('app');
  const ex = getCurrentExercise();
  const realIdx = getCurrentRealIdx();
  const totalExercises = state.exerciseOrder.length;
  const exNum = state.currentExerciseIdx + 1;
  const completedSetsForEx = state.completedSets[realIdx] || [];
  const currentSet = state.currentSetIdx + 1;
  const totalSets = ex.setsMax;
  const allSetsDone = state.currentSetIdx >= totalSets;
  const minSetsDone = ex.setsMin < ex.setsMax && state.currentSetIdx >= ex.setsMin;

  const suggestion = ex.type === 'weight' ? await getProgressionSuggestion(ex.name, ex) : { weight: null, reps: null, isProgressed: false, hint: '' };
  const weightPlaceholder = suggestion.weight != null ? `${suggestion.weight}` : '';
  const repsPlaceholder = suggestion.reps != null ? `${suggestion.reps}` : `${ex.repsMax}`;
  const weightHint = suggestion.hint || '';
  const hintClass = suggestion.isProgressed ? 'input-hint progressed' : 'input-hint';

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
                    ${weightHint ? `<div class="${hintClass}">${weightHint}</div>` : ''}
                  </div>
                ` : ''}
                <div class="input-group">
                  <label>${ex.type === 'reps_per_side' ? 'Toistoa / puoli' : 'Toistoa'}</label>
                  <input type="number" id="reps-input" inputmode="numeric"
                    placeholder="${repsPlaceholder}" min="0">
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
          ⇄ Vaihda liike
        </button>
      ` : ''}

      ${(allSetsDone || minSetsDone) && !state.restTimer ? `
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

async function renderWorkoutAfterSet(allDone) {
  await renderWorkoutView();
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

async function skipRest() {
  stopRestTimer();
  await renderWorkoutView();
}

async function handleCompleteSet() {
  const ex = getCurrentExercise();
  let weight = null;
  let reps = null;

  if (ex.type === 'weight') {
    const wInput = document.getElementById('weight-input');
    weight = wInput && wInput.value !== '' ? parseFloat(wInput.value) : null;
  }

  const rInput = document.getElementById('reps-input');
  reps = rInput && rInput.value !== '' ? parseInt(rInput.value, 10) : ex.repsMax;

  await completeSet(weight, reps);
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
    showToast('Ei muita liikkeitä jäljellä');
    return;
  }
  showExerciseNavigator();
}

function showExerciseNavigator() {
  hideExerciseNavigator();

  const doneOrderIndices   = Array.from({ length: state.currentExerciseIdx }, (_, i) => i);
  const remainOrderIndices = Array.from(
    { length: state.exerciseOrder.length - state.currentExerciseIdx },
    (_, i) => state.currentExerciseIdx + i
  );

  function itemHTML(orderIdx) {
    const realIdx = state.exerciseOrder[orderIdx];
    const ex = state.workout.exercises[realIdx];
    const isCurrent = orderIdx === state.currentExerciseIdx;
    const isDone = orderIdx < state.currentExerciseIdx;
    return `
      <button class="ex-nav-item ${isCurrent ? 'current' : ''} ${isDone ? 'completed' : ''}"
        ${isDone ? 'disabled' : `onclick="jumpToExercise(${orderIdx})"`}>
        <div class="ex-nav-item-info">
          <span class="ex-nav-item-name">${ex.name}</span>
          <span class="ex-nav-item-target">${ex.target}</span>
        </div>
        ${isDone
          ? '<span class="ex-nav-check">✓</span>'
          : isCurrent
            ? '<span class="ex-nav-hint">siirrä loppuun</span>'
            : '<span class="ex-nav-arrow">›</span>'
        }
      </button>`;
  }

  const overlay = document.createElement('div');
  overlay.className = 'ex-nav-overlay';
  overlay.id = 'ex-nav-overlay';
  overlay.innerHTML = `
    <div class="ex-nav-sheet">
      <div class="ex-nav-title">Vaihda liike</div>
      ${remainOrderIndices.length > 0 ? `
        <div class="ex-nav-section-label">Jäljellä</div>
        ${remainOrderIndices.map(itemHTML).join('')}
      ` : ''}
      ${doneOrderIndices.length > 0 ? `
        <div class="ex-nav-section-label">Tehty</div>
        ${doneOrderIndices.map(itemHTML).join('')}
      ` : ''}
      <button class="btn btn-ghost ex-nav-cancel" onclick="hideExerciseNavigator()">Peruuta</button>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) hideExerciseNavigator(); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
}

function hideExerciseNavigator() {
  const el = document.getElementById('ex-nav-overlay');
  if (!el) return;
  el.classList.remove('open');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
}

async function jumpToExercise(targetOrderIdx) {
  if (targetOrderIdx === state.currentExerciseIdx) {
    hideExerciseNavigator();
    await skipCurrentExercise();
    return;
  }
  const [realIdx] = state.exerciseOrder.splice(targetOrderIdx, 1);
  state.exerciseOrder.splice(state.currentExerciseIdx, 0, realIdx);
  state.currentSetIdx = 0;
  stopRestTimer();
  stopSetTimer();
  saveActiveSession();
  hideExerciseNavigator();
  await renderWorkoutView();
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

// ── Program select ────────────────────────────────────────────────────────────
function renderProgramSelect(container) {
  const currentId = loadActiveProgramId() || PROGRAMS[0].id;
  const hasProgram = loadActiveProgramId() !== null;

  container.innerHTML = `
    <div class="program-select-view">
      <div class="header">
        ${hasProgram ? `<button class="btn-back" onclick="setView('dashboard')">←</button>` : ''}
        <h2>Valitse ohjelma</h2>
      </div>
      <div class="program-list">
        ${PROGRAMS.map(prog => {
          const workoutTypes = Object.keys(prog.workouts);
          const isActive = prog.id === currentId;
          return `
            <div class="program-item ${isActive ? 'active' : ''}" onclick="selectProgram('${prog.id}')">
              <div class="program-item-main">
                <div class="program-item-name">${prog.name}</div>
                <div class="program-item-splits">
                  ${workoutTypes.map(t => `<span class="program-split-chip">${prog.workouts[t].name}</span>`).join('')}
                </div>
              </div>
              <div class="program-item-right">
                ${isActive ? '<span class="program-active-badge">Aktiivinen</span>' : '<span class="program-select-arrow">›</span>'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function selectProgram(id) {
  saveActiveProgramId(id);
  historyEditMode = false;
  historySelected.clear();
  setView('dashboard');
}

// ── History ──────────────────────────────────────────────────────────────────
let historyEditMode = false;
let historySelected = new Set();

async function renderHistory(container) {
  const progHistory = await loadProgramHistory();
  const reversed = [...progHistory].reverse();

  container.innerHTML = `
    <div class="history-view">
      <div class="header">
        <h2>Treenihistoria</h2>
        <div class="history-menu-wrap">
          <button class="btn-program-switch" onclick="toggleHistoryMenu(event)" id="history-menu-btn" aria-label="Asetukset">⚙</button>
          <div class="history-menu-dropdown" id="history-menu-dropdown" style="display:none">
            <button class="history-menu-item" onclick="exportHistory(); closeHistoryMenu()">📤 Vie historia</button>
            <button class="history-menu-item" onclick="document.getElementById('import-file-input').click(); closeHistoryMenu()">📥 Tuo historia</button>
            ${progHistory.length > 0 ? `
              <button class="history-menu-item ${historyEditMode ? 'danger' : ''}" onclick="toggleHistoryEdit()">
                ${historyEditMode ? '✕ Lopeta muokkaus' : '✏️ Muokkaa'}
              </button>
            ` : ''}
          </div>
        </div>
      </div>
      <input type="file" id="import-file-input" accept=".json" style="display:none"
        onchange="importHistory(this)">
      ${progHistory.length === 0
        ? '<div class="empty-state">Ei tallennettuja treenejä vielä.</div>'
        : reversed.map((session, i) => renderSessionCard(session, i)).join('')
      }
      ${historyEditMode && historySelected.size > 0 ? `
        <div class="history-delete-bar">
          <button class="btn-delete-selected" onclick="confirmDeleteSelected()">
            Poista valitut (${historySelected.size})
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

async function exportHistory() {
  try {
    const allSessions = await idbGetAll();
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      sessions: allSessions
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymtracker-export-${today}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast(`Viety ${allSessions.length} treeniä`);
  } catch {
    showToast('Vienti epäonnistui');
  }
}

function validateImportPayload(payload) {
  if (typeof payload !== 'object' || payload === null) return 'Tiedosto ei ole kelvollinen GymTracker-vienti.';
  if (!Array.isArray(payload.sessions)) return 'Tiedostosta puuttuu sessions-kenttä.';
  if (payload.sessions.length === 0) return 'Tiedostossa ei ole yhtään treeniä.';
  const samples = [...payload.sessions.slice(0, 5), payload.sessions[payload.sessions.length - 1]];
  for (const s of samples) {
    if (typeof s !== 'object' || s === null) return 'Tiedosto sisältää virheellisiä treenejä.';
    if (typeof s.id !== 'string' || !s.id.trim()) return 'Treeni puuttuu id-kentästä.';
    if (typeof s.date !== 'string') return 'Treeni puuttuu date-kentästä.';
    if (!Array.isArray(s.exercises)) return 'Treeni puuttuu exercises-kentästä.';
  }
  return null;
}

async function importHistory(inputElement) {
  const file = inputElement.files[0];
  inputElement.value = '';
  if (!file) return;

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    showToast('Virheellinen tiedosto');
    return;
  }

  const err = validateImportPayload(payload);
  if (err) { showModal({ title: 'Tuonti epäonnistui', message: err, confirmText: 'OK' }); return; }

  const existing = await idbGetAll();
  const existingIds = new Set(existing.map(s => s.id));
  const toImport = payload.sessions.filter(s => !existingIds.has(s.id));
  const skipped = payload.sessions.length - toImport.length;

  if (toImport.length === 0) {
    showModal({
      title: 'Ei uusia treenejä',
      message: `Kaikki ${skipped} treeniä on jo tallennettu.`,
      confirmText: 'OK'
    });
    return;
  }

  try {
    for (const session of toImport) await idbPut(session);
  } catch {
    showToast('Tallennus epäonnistui');
    return;
  }

  const skippedNote = skipped > 0 ? ` (${skipped} ohitettu, jo olemassa)` : '';
  showModal({
    title: 'Tuonti valmis',
    message: `Tuotu ${toImport.length} treeniä${skippedNote}.`,
    confirmText: 'OK',
    onConfirm: async () => { await renderHistory(document.getElementById('app')); }
  });
}

function toggleHistoryMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('history-menu-dropdown');
  if (!menu) return;
  const isOpen = menu.style.display !== 'none';
  menu.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) {
    document.addEventListener('click', closeHistoryMenu, { once: true });
  }
}

function closeHistoryMenu() {
  const menu = document.getElementById('history-menu-dropdown');
  if (menu) menu.style.display = 'none';
}

async function toggleHistoryEdit() {
  historyEditMode = !historyEditMode;
  historySelected.clear();
  await renderHistory(document.getElementById('app'));
}

async function toggleSelectSession(sessionId) {
  if (historySelected.has(sessionId)) {
    historySelected.delete(sessionId);
  } else {
    historySelected.add(sessionId);
  }
  await renderHistory(document.getElementById('app'));
}

function confirmDeleteSelected() {
  const count = historySelected.size;
  showModal({
    title: `Poistetaanko ${count} treeni${count > 1 ? 'ä' : ''}?`,
    message: 'Poistettuja treenejä ei voi palauttaa.',
    confirmText: `Poista ${count} treeni${count > 1 ? 'ä' : ''}`,
    cancelText: 'Peruuta',
    onConfirm: async () => {
      await idbDeleteMany([...historySelected]);
      historyEditMode = false;
      historySelected.clear();
      await renderHistory(document.getElementById('app'));
    }
  });
}

function renderSessionCard(session, i) {
  const dateStr = formatDate(session.date);
  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const isSelected = historySelected.has(session.id);

  if (historyEditMode) {
    return `
      <div class="session-card ${isSelected ? 'selected' : ''}"
        onclick="toggleSelectSession('${session.id}')">
        <div class="session-checkbox">${isSelected ? '✓' : ''}</div>
        <div class="session-card-content">
          <div class="session-header">
            <div>
              <span class="session-type-badge type-${session.type}">Treeni ${session.type}</span>
              <span class="session-date">${dateStr}</span>
            </div>
            <span class="session-summary">${session.exercises.length} liikettä · ${totalSets} sarjaa</span>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="session-card" onclick="toggleSessionDetail('detail-${i}')">
      <div class="session-card-content">
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
document.addEventListener('DOMContentLoaded', async () => {
  db = await openDB();
  // Jos ohjelmaa ei ole valittu, näytetään ohjelmanvalinta ensin
  if (!loadActiveProgramId()) {
    state.view = 'program-select';
    history.replaceState({ view: 'program-select' }, '');
    render();
    return;
  }

  history.replaceState({ view: 'dashboard' }, '');

  const active = loadActiveSession();
  if (active) {
    const program = getActiveProgramData().workouts[active.type];
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
    // updateViaCache: 'none' → selain ei cacheta sw.js-tiedostoa itse
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => {
        // Tarkista päivitys heti avattaessa
        reg.update();
      });

    // Kun uusi SW ottaa kontrollin → lataa sivu uudelleen (saa uusimman version)
    // Session resume -ominaisuus palauttaa kesken jääneen treenin
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
});
