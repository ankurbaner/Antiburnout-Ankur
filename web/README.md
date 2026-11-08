# Anti-Burnout for the web

The browser version of Anti-Burnout. It brings together the desktop tracker in
this repo and the 5-minute reset from
[Off-Duty](https://github.com/ankurbaner/calude-impact-lab-off-duty), as a
static site with no backend.

- **Tab-based reminders.** With this page focused, 60 seconds without input
  counts as a break and resets the stretch. This threshold is fixed, not
  configurable. It uses the same `tick()` state
  machine as the desktop app (`../src/tracker.ts`).
- **Recovery cards** every 20 active minutes by default, with web-local
  desk-yoga practices chosen by stretch length and Done / Snooze controls.
- **5-minute reset**: a full-screen countdown showing one activity at a time
  (never the same one twice in a row).
- **Quiet practices only (for meetings)** in Settings restricts cards and
  resets to call-safe practices and silences the chime. It stays on across
  same-day reloads and turns off at local midnight.
- **Desk yoga and meditation** with inline Start / countdown / Done timers.
- **Practice of the day**: one yoga or meditation practice chosen by local date,
  with its instructions and inline timer.
- All original yoga practices and all four breath-guide patterns are available.
  The retired body-area filtering setting is ignored in older saved configs
  and omitted when settings are saved again. The yoga safety guidance remains.

## Where activity comes from

Tracking is this-tab only: it watches for pointer, key, scroll or touch events
on this page. While focused, a minute without that input counts as being away.
While the tab is unfocused, it cannot see activity elsewhere and assumes
you're working elsewhere. Nothing is counted while the tab is closed.
Whole-computer tracking and the Idle Detection API have been removed.

There are no analytics or third-party fonts (they're bundled). Settings and
coarse counters live in `localStorage` and can be cleared from Settings.
Data from retired features is ignored; Clear all data also removes their
legacy storage entries. The PWA caches the app's own static files for offline use.

## Develop

Needs Node.js 18+.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest unit tests for activity, protocols, formatting, storage
npm run typecheck
npm run build      # static output in web/dist (relative paths, so any host or sub-path works)
```

`web/dist` can be served from any static host, e.g. GitHub Pages, Netlify or
`npx vite preview`.

## App icons

The PNG app icons and apple-touch-icon are generated from `public/favicon.svg`
by `scripts/generate-icons.mjs`, using only Node.js built-ins. If the favicon
changes, regenerate and commit the PNGs with `node scripts/generate-icons.mjs`
from `web/`. The generator supports the current logo's SVG path commands
(M/C/S/Z) and geometry; update it too if the logo structure changes.

## Layout

- `src/main.ts`: UI wiring and the 1-second loop that feeds `tick()`
- `src/activity.ts`: turns browser signals into "seconds idle"
- `src/cards.ts`: web-local yoga reminder selection and preview rotation
- `src/yoga.ts`, `src/meditation.ts`, `src/yogaUI.ts`: practice data and inline timers
- `src/protocols.ts`: the 5-minute reset activities and their rotation
- `src/storage.ts`: validated `localStorage` persistence
- `../src/tracker.ts`: shared with the desktop app; card content is web-local
