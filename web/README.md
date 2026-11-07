# Anti-Burnout for the web

The browser version of Anti-Burnout. It brings together the desktop tracker in
this repo and the 5-minute reset from
[Off-Duty](https://github.com/ankurbaner/calude-impact-lab-off-duty), as a
static site with no backend.

- **Counts real active time.** Idle for 60 seconds or more (configurable)
  counts as a break and resets the stretch. It uses the same `tick()` state
  machine as the desktop app (`../src/tracker.ts`).
- **Recovery cards** every 20 active minutes, built by the shared
  `../src/cardContent.ts` and `../src/exercises.ts`, so the eyes → posture →
  water → movement escalation and the rotating wording match the desktop app
  exactly. Done / Snooze, plus optional browser notifications.
- **5-minute reset**: a full-screen countdown showing one activity at a time
  (never the same one twice in a row).

## Where activity comes from

| Mode | When | What it sees |
| --- | --- | --- |
| This tab (default) | Always | Whether a pointer, key, scroll or touch event happened on this page. While the tab is unfocused it assumes you're working elsewhere. |
| Whole computer | Opt-in, Chromium browsers | The [Idle Detection API](https://developer.mozilla.org/docs/Web/API/Idle_Detection_API): only `active` / `idle` and `locked` / `unlocked`. |

There is no network after the page loads: no analytics and no third-party
fonts (they're bundled). Settings and coarse counters live in `localStorage`
and can be cleared from Settings.

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

## Layout

- `src/main.ts`: UI wiring and the 1-second loop that feeds `tick()`
- `src/activity.ts`: turns browser signals into "seconds idle"
- `src/protocols.ts`: the 5-minute reset activities and their rotation
- `src/storage.ts`: validated `localStorage` persistence
- `../src/tracker.ts`, `../src/exercises.ts`, `../src/cardContent.ts`: shared with the desktop app
