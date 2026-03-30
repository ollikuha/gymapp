# GymTracker

A mobile-optimised gym tracking app that runs directly in the browser — no installation or backend required. All data is stored locally in the browser (IndexedDB); no server or account required.

## Features

- **Multiple workout programs** – Switch between programs (e.g. A/B split or A/B/C split) from the dashboard; the app remembers your active program across sessions
- **Alternating workouts** – The app automatically suggests the next workout type based on your history for the active program
- **Set timer** – Built-in countdown timer for time-based exercises (e.g. plank); keeps the screen on during the set
- **Bilateral exercises** – For side-specific exercises (e.g. side plank) the set timer runs the left side then the right side automatically
- **Rest timer** – Animated countdown between sets; vibration + beep when rest is over
- **Weight suggestions** – Remembers the last weight used for each exercise and suggests it automatically (across all programs)
- **Progression models** – Linear progression (fixed weight increment each session) and double progression (increase weight only when all sets reach the max rep target) are both supported
- **Workout history** – All completed sessions are saved per program; individual sessions can be deleted
- **Resume workout** – Closing the app mid-workout is fine; reopening it offers to continue where you left off
- **Extra sets** – Add bonus sets beyond the program minimum during a workout
- **Set editing** – Tap a completed set to edit its weight or reps inline
- **Exercise swap** – Any exercise can be skipped and moved to the end of the queue
- **Video instructions** – Exercise cards can embed a YouTube video for technique reference
- **Custom programs** – Import your own program as a JSON file; stored in IndexedDB alongside the built-in programs
- **PWA** – Installable on the home screen; works offline

## File structure

```
index.html    – HTML structure and all CSS
app.js        – Application logic and UI rendering
program.js    – Workout programs (exercises, sets, reps, rest times)
sw.js         – Service Worker (caching, offline support)
manifest.json – PWA configuration
icon.svg      – App icon
```

## Adding or editing programs

All programs are defined in `program.js` as entries in the `PROGRAMS` array. Each program has a unique `id`, a display `name`, and a `workouts` object whose keys are the workout types (`A`, `B`, `C`, …).

A program can have one, two, or three workout types. The app handles all cases automatically.

### Exercise fields

| Field | Description |
|-------|-------------|
| `name` | Exercise name (also used to look up weight history) |
| `target` | Target muscle group |
| `type` | `"weight"` = weight + reps, `"time"` = seconds-based, `"reps_per_side"` = reps per side |
| `setsMin` / `setsMax` | Set count range |
| `repsMin` / `repsMax` | Rep or second range |
| `restDuration` | Rest time in seconds between sets |
| `note` | Technique tip shown on the exercise card |
| `progression` | `"linear"` = fixed weight increment each session; `"double"` = increase weight only when all sets reach max reps |
| `perSide` | `true` for bilateral exercises — set timer runs left side then right side automatically |

> **Note:** Renaming an exercise will break weight suggestions for that exercise. Workout history is not affected.

## Technical notes

- Vanilla JS, no frameworks
- Workout history and custom programs stored in IndexedDB (v2, stores: `sessions`, `programs`); active session and active program ID stored in `localStorage`
- Service Worker uses a network-first strategy: always fetches the latest version from the network; falls back to cache only when offline
- [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) prevents the screen from turning off during the set timer
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) generates a beep when a timer ends
- [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) provides haptic feedback when a timer ends
- History API enables the browser back gesture during a workout

## Deployment (GitHub Pages)

1. Fork or clone the repo
2. Enable GitHub Pages in the repo settings (Settings → Pages → Deploy from branch → `main`)
3. The app will be available at `https://<username>.github.io/<repo-name>/`
