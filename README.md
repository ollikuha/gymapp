# GymTracker

A mobile-optimised gym tracking app that runs directly in the browser — no installation or backend required. All data is stored locally in the browser (localStorage).

## Features

- **Multiple workout programs** – Switch between programs (e.g. A/B split or A/B/C split) from the dashboard; the app remembers your active program across sessions
- **Alternating workouts** – The app automatically suggests the next workout type based on your history for the active program
- **Set timer** – Built-in countdown timer for time-based exercises (e.g. plank); keeps the screen on during the set
- **Rest timer** – Animated countdown between sets; vibration + beep when rest is over
- **Weight suggestions** – Remembers the last weight used for each exercise and suggests it automatically (across all programs)
- **Workout history** – All completed sessions are saved per program; individual sessions can be deleted
- **Resume workout** – Closing the app mid-workout is fine; reopening it offers to continue where you left off
- **Exercise swap** – Any exercise can be skipped and moved to the end of the queue
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

> **Note:** Renaming an exercise will break weight suggestions for that exercise. Workout history is not affected.

## Technical notes

- Vanilla JS, no frameworks
- All data stored in `localStorage` — no server connection
- Service Worker uses a network-first strategy: always fetches the latest version from the network; falls back to cache only when offline
- [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) prevents the screen from turning off during the set timer
- History API enables the browser back gesture during a workout

## Deployment (GitHub Pages)

1. Fork or clone the repo
2. Enable GitHub Pages in the repo settings (Settings → Pages → Deploy from branch → `main`)
3. The app will be available at `https://<username>.github.io/<repo-name>/`
