# Anti-Burnout for the web

A calm, self-paced collection of breaks for your eyes, back and mind. This is a
static site with no backend, activity tracking, automatic reminders or settings.

- **5-minute reset**: a full-screen countdown with one activity at a time,
  adapted from [Off-Duty](https://github.com/ankurbaner/calude-impact-lab-off-duty).
  Try another activity or return whenever you like. Activities rotate without
  repeating back to back during the current visit.
- **Practice of the day**: a mindfulness practice and a desk-yoga movement,
  chosen deterministically by local date, each with its own timer.
- **Breathe with the circle**: four silent breathing patterns with text cues and
  reduced-motion support.
- **Eye exercises**, **Desk yoga** and **Meditation at work**: choose a practice
  and start its inline countdown. Walk break is a 15-minute walk.
- **Steady before you speak**: a short guided sequence with a physiological sigh,
  two smile scenes, squeeze and release, and presentation tips.
- Keyboard-accessible controls, reduced-motion support and medical safety notes.

Nothing appears automatically to interrupt your work. There are no reminder
cards, activity counters, sounds, analytics or external assets. Fonts are bundled.
Old reminder settings, tracking state and retired intention/saved-spot keys are
removed from localStorage on startup; blocked storage does not prevent use.
No new settings or activity data are saved.

The installable PWA caches the app's own static files for offline use. Its service
worker discovers assets from the built HTML and CSS rather than a fixed file
list, and each build replaces the old app cache.

## Develop

Needs Node.js 18+.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest unit tests for practices, guides, resets, cleanup and PWA
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

- `src/main.ts`: guide initialization, manual reset UI and local-date rollover
- `src/yoga.ts`, `src/meditation.ts`, `src/eyes.ts`: practice data
- `src/yogaUI.ts`: shared practice cards and inline timers
- `src/dailyPractice.ts`, `src/dailyPracticeUI.ts`: daily pair selection and display
- `src/breatheUI.ts`, `src/steadyUI.ts`: interactive guides
- `src/protocols.ts`: 5-minute reset activities and rotation
- `src/storage.ts`: best-effort cleanup of obsolete localStorage keys
- `src/pwa.ts`, `public/sw.js`: installation and offline caching
