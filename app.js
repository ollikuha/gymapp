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
