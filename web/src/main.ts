import "@fontsource-variable/newsreader";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./styles.css";

import { tick } from "../../src/tracker";
import { CardPractice, createPreviewSelector, needsWater, selectCardPractice } from "./cards";
import { ActivityMonitor } from "./activity";
import { initBreathe } from "./breatheUI";
import { initSteady } from "./steadyUI";
import { initDailyPractice } from "./dailyPracticeUI";
import { TIME_LABELS, timeOfDay } from "./timeOfDay";
import { initInstall, registerWorker } from "./pwa";
import { playChime, unlockChime } from "./chime";
import { initPracticeGroups, initYoga } from "./yogaUI";
import { MEDITATION_PRACTICES } from "./meditation";
import { EYE_PRACTICES } from "./eyes";
import { snoozeAllowed } from "./schedule";
import { formatClock } from "./format";
import { Protocol, RESET_SECONDS, allowedProtocolOrder, countsAsReset, nextProtocol } from "./protocols";
import {
  applyAbsence,
  WebConfig,
  WebState,
  clearAll,
  dayKeyFor,
  loadConfig,
  loadState,
  saveConfig,
  saveState,
} from "./storage";

const TICK_MS = 1000;
/** How often the 1-second loop writes to localStorage; user actions save immediately. */
const PERSIST_MS = 5000;
/** Stretch lengths the "Preview a card" button cycles through, one per band. */
const PREVIEW_STRETCHES = [25 * 60, 60 * 60, 120 * 60];

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};
const setText = (id: string, text: string): void => {
  const el = $(id);
  if (el.textContent !== text) el.textContent = text;
};

const store = window.localStorage;
let config: WebConfig = loadConfig(store);
let state: WebState = applyAbsence(loadState(store, dayKeyFor(new Date())), Date.now(), config.idleThresholdSeconds);
const monitor = new ActivityMonitor();
const chime = (): void => playChime(config.chime, state.meetingMode);
const resetPool = () => allowedProtocolOrder(state.meetingMode);

let lastTickMs = Date.now();
/** Whether the previous step counted time; the first counting step credits nothing. */
let wasCounting = false;
let previewIndex = 0;
const selectPreviewPractice = createPreviewSelector();
let cardVisible = false;
/** Previews don't count as done and don't move the schedule. */
let cardIsPreview = false;
let cardStretch = 0;
let reset: { startedAt: number; endsAt: number; protocol: Protocol; finished: boolean } | null = null;
let lastPersistMs = 0;
const persist = (): void => {
  lastPersistMs = Date.now();
  saveState(store, state);
};

const rollDay = (now: Date): void => {
  const today = dayKeyFor(now);
  if (state.tracker.dayKey === today) return;
  initDailyPractice(now);
  state.meetingMode = false;
  if (settingsDialog.open) {
    const meetingCheckbox = settingsForm.elements.namedItem("meetingMode");
    if (meetingCheckbox instanceof HTMLInputElement) meetingCheckbox.checked = false;
  }
  if (cardVisible) showCard(cardStretch, cardIsPreview, false);
  state.cardsDoneToday = 0;
  state.resetsToday = 0;
  state.tracker = { ...state.tracker, todayActiveSeconds: 0, dayKey: today };
};

/* ---------- Recovery card ---------- */

const renderCard = (practice: CardPractice, preview: boolean, stretch = state.tracker.currentStretchSeconds): void => {
  cardStretch = stretch;
  setText("card-meta", "A quiet yoga break");
  setText("card-time", state.meetingMode ? "" : TIME_LABELS[timeOfDay(new Date())]);
  $("card-time").hidden = state.meetingMode;
  setText("card-chip", preview ? "Preview" : "1 min");
  setText("card-heading", `${practice.title} · ${practice.english}`);
  const li = document.createElement("li");
  li.textContent = practice.instruction;
  $("card-steps").replaceChildren(li);
  const footnote = state.meetingMode ? "Meeting mode: nothing anyone will notice"
    : needsWater(stretch) ? "And drink a glass of water." : "Move gently and stop if anything hurts.";
  setText("card-footnote", footnote);
  $("card-footnote").hidden = false;
  $("card").hidden = false;
  cardVisible = true;
  cardIsPreview = preview;
  render();
};

const showCard = (stretch: number, preview: boolean, advance = true): void => {
  const practice = preview
    ? selectPreviewPractice(stretch, state.meetingMode, state.lastPracticeId, state.rotation + previewIndex, timeOfDay(new Date()))
    : selectCardPractice(stretch, state.meetingMode, state.lastPracticeId, state.rotation, timeOfDay(new Date()));
  if (!preview) {
    state.lastPracticeId = practice.id;
    if (advance) state.rotation += 1;
  }
  renderCard(practice, preview, stretch);
};

const showDueCard = (): void => {
  showCard(state.tracker.currentStretchSeconds, false);
  chime();
};

const previewCard = (): void => {
  const stretch = PREVIEW_STRETCHES[previewIndex % PREVIEW_STRETCHES.length];
  previewIndex += 1;
  showCard(stretch, true);
};

const hideCard = (): void => {
  $("card").hidden = true;
  cardVisible = false;
};

/* ---------- 5-minute reset ---------- */

const renderProtocol = (p: Protocol): void => {
  setText("reset-icon", p.icon);
  setText("reset-title", p.title);
  setText("reset-duration", p.durationLabel);
  setText("reset-action", p.action);
  setText("reset-why", p.why);
};

let focusBeforeReset: HTMLElement | null = null;

/** Make everything except the reset overlay inert, so keyboard focus can't leave it. */
const setBackgroundInert = (inert: boolean): void => {
  const overlay = $("reset");
  for (const el of Array.from(overlay.parentElement?.children ?? [])) {
    if (el !== overlay) (el as HTMLElement).inert = inert;
  }
};

const startReset = (): void => {
  focusBeforeReset = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  hideCard();
  const protocol = nextProtocol(state.lastProtocolId, resetPool());
  state.lastProtocolId = protocol.id;
  const startedAt = Date.now();
  reset = { startedAt, endsAt: startedAt + RESET_SECONDS * 1000, protocol, finished: false };
  renderProtocol(protocol);
  $("reset-done").hidden = true;
  setText("reset-end", "I'm back");
  setText("reset-clock", formatClock(RESET_SECONDS));
  $("reset").hidden = false;
  setBackgroundInert(true);
  document.body.classList.add("locked");
  $("reset-end").focus();
  persist();
  render();
};

const nextResetActivity = (): void => {
  if (!reset) return;
  const protocol = nextProtocol(reset.protocol.id, resetPool());
  reset.protocol = protocol;
  state.lastProtocolId = protocol.id;
  renderProtocol(protocol);
  persist();
};

/** Stepping away is the break: end the reset and start a fresh stretch. */
const endReset = (): void => {
  if (!reset) return;
  const elapsedSeconds = (Date.now() - reset.startedAt) / 1000;
  reset = null;
  rollDay(new Date());
  if (countsAsReset(elapsedSeconds)) state.resetsToday += 1;
  state.snoozesInARow = 0;
  state.tracker = { ...state.tracker, currentStretchSeconds: 0, lastReminderAtStretch: 0, onBreak: true };
  $("reset").hidden = true;
  setBackgroundInert(false);
  document.body.classList.remove("locked");
  focusBeforeReset?.focus();
  focusBeforeReset = null;
  persist();
  render();
};

const updateReset = (now: number): void => {
  if (!reset) return;
  const remaining = Math.max(0, (reset.endsAt - now) / 1000);
  setText("reset-clock", formatClock(Math.ceil(remaining)));
  if (remaining <= 0 && !reset.finished) {
    reset.finished = true;
    $("reset-done").hidden = false;
    setText("reset-end", "Back to it, gently");
  }
};

/* ---------- Main loop ---------- */

const step = (): void => {
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const sinceLastStep = (nowMs - lastTickMs) / 1000;
  lastTickMs = nowMs;
  rollDay(now);

  // A reset is the break; never credit time spent in it.
  const counting = !reset;
  const elapsed = counting && wasCounting ? sinceLastStep : 0;
  wasCounting = counting;
  if (counting) {
    const result = tick(state.tracker, monitor.idleSeconds(nowMs), elapsed, dayKeyFor(now), config);
    state.tracker = result.state;
    if (result.state.onBreak || result.state.currentStretchSeconds === 0) state.snoozesInARow = 0;
    if (result.state.onBreak && cardVisible && !cardIsPreview) hideCard();
    if (result.showCard) showDueCard();
  }
  updateReset(nowMs);
  render();
  if (nowMs - lastPersistMs >= PERSIST_MS) persist();
};

const render = (): void => {
  const canSnooze = cardIsPreview || snoozeAllowed(state.snoozesInARow, config.maxSnoozes);
  $<HTMLButtonElement>("card-snooze").disabled = !canSnooze;
  setText("card-snooze", canSnooze ? "Snooze" : "No more snoozes");
  document.body.classList.toggle("locked", Boolean(reset));
  document.title = !reset && cardVisible && !cardIsPreview ? "Break due · Anti-Burnout" : "Anti-Burnout";
};

/* ---------- Settings ---------- */

const settingsDialog = $<HTMLDialogElement>("settings");
const settingsForm = $<HTMLFormElement>("settings-form");

const openSettings = (): void => {
  const f = settingsForm.elements;
  (f.namedItem("reminderMinutes") as HTMLInputElement).value = String(Math.round(config.reminderIntervalSeconds / 60));
  (f.namedItem("snoozeMinutes") as HTMLInputElement).value = String(config.snoozeMinutes);
  (f.namedItem("maxSnoozes") as HTMLInputElement).value = String(config.maxSnoozes);
  (f.namedItem("chime") as HTMLInputElement).checked = config.chime;
  (f.namedItem("meetingMode") as HTMLInputElement).checked = state.meetingMode;
  settingsDialog.showModal();
};

const clampInt = (raw: string, min: number, max: number, fallback: number): number => {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

settingsForm.addEventListener("submit", (e) => {
  const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
  if (submitter?.value !== "save") return;
  e.preventDefault();

  const f = settingsForm.elements;
  const val = (name: string): HTMLInputElement => f.namedItem(name) as HTMLInputElement;
  config = {
    ...config,
    reminderIntervalSeconds: clampInt(val("reminderMinutes").value, 1, 180, 20) * 60,
    snoozeMinutes: clampInt(val("snoozeMinutes").value, 1, 60, 5),
    maxSnoozes: clampInt(val("maxSnoozes").value, 0, 10, 2),
    chime: val("chime").checked,
  };
  const meetingMode = val("meetingMode").checked;
  const meetingChanged = state.meetingMode !== meetingMode;
  state.meetingMode = meetingMode;
  if (cardVisible && meetingChanged) showCard(cardStretch, cardIsPreview, false);
  if (reset && !resetPool().includes(reset.protocol.id)) nextResetActivity();
  saveConfig(store, config);
  persist();
  settingsDialog.close();
  render();
});

/* ---------- Wiring ---------- */

document.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!target) return;
  switch (target.dataset.action) {
    case "start-reset":
      startReset();
      break;
    case "preview-card":
      previewCard();
      break;
  }
});

$("card-done").addEventListener("click", () => {
  if (!cardIsPreview) {
    state.cardsDoneToday += 1;
    state.snoozesInARow = 0;
  }
  hideCard();
  persist();
  render();
});
$("card-snooze").addEventListener("click", () => {
  if (!cardIsPreview) {
    if (!snoozeAllowed(state.snoozesInARow, config.maxSnoozes)) return;
    state.snoozesInARow += 1;

    // Pull the next reminder to `snoozeMinutes` from now instead of a full interval away.
    state.tracker = {
      ...state.tracker,
      lastReminderAtStretch:
        state.tracker.currentStretchSeconds + config.snoozeMinutes * 60 - config.reminderIntervalSeconds,
    };
    persist();
  }
  hideCard();
  render();
});
$("reset-next").addEventListener("click", nextResetActivity);
$("reset-end").addEventListener("click", endReset);
$("open-settings").addEventListener("click", openSettings);
$("reset-data").addEventListener("click", () => {
  if (!window.confirm("Clear all counters and settings stored in this browser?")) return;
  clearAll(store);
  config = loadConfig(store);
  state = loadState(store, dayKeyFor(new Date()));
  initYoga();
  initDailyPractice(new Date());
  settingsDialog.close();
  hideCard();
  render();
});
window.addEventListener("pagehide", persist);
window.addEventListener("pointerdown", unlockChime);
window.addEventListener("keydown", unlockChime);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persist();
});
$("reset").addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const items = Array.from($("reset").querySelectorAll<HTMLElement>("button:not([hidden])"));
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && cardVisible) hideCard();
});

initBreathe();
initSteady();
initInstall();
registerWorker();
initDailyPractice(new Date());
initYoga();
initPracticeGroups("eye-practices", [{ id: "eyes", title: "Choose a gentle eye break", practices: EYE_PRACTICES }]);
initPracticeGroups("meditation-practices", [{ id: "meditation", title: "Choose a quiet moment", practices: MEDITATION_PRACTICES }]);
render();
window.setInterval(step, TICK_MS);
