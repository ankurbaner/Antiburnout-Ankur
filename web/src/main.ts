import "@fontsource-variable/newsreader";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./styles.css";

import { StretchBand, bandForStretch, tick } from "../../src/tracker";
import { CardContent, buildCardContent } from "../../src/cardContent";
import { ActivityMonitor, systemIdleSupported } from "./activity";
import { formatClock, formatMinutes } from "./format";
import { PROTOCOLS, PROTOCOL_ORDER, Protocol, RESET_SECONDS, nextProtocol } from "./protocols";
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
/** Fixed daytime hour for card content, so the shared library never adds its late-evening "stop for the day" line. */
const CARD_HOUR = 12;
const BANDS: StretchBand[] = ["eyes", "eyes-posture", "eyes-posture-water", "eyes-posture-water-day"];
/** Stretch lengths the "Preview a card" button cycles through, one per band. */
const PREVIEW_STRETCHES = [25 * 60, 60 * 60, 120 * 60, 200 * 60];

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

let lastTickMs = Date.now();
/** Whether the previous step counted time; the first counting step credits nothing. */
let wasCounting = false;
let previewIndex = 0;
let cardVisible = false;
/** Previews don't count as done and don't move the schedule. */
let cardIsPreview = false;
let reset: { endsAt: number; protocol: Protocol; finished: boolean } | null = null;

let lastPersistMs = 0;
const persist = (): void => {
  lastPersistMs = Date.now();
  saveState(store, state);
};

/**
 * Start a new day's counters at local midnight. Runs on every step, even
 * while paused or mid-reset, so nothing from
 * yesterday leaks into today.
 */
const rollDay = (now: Date): void => {
  const today = dayKeyFor(now);
  if (state.tracker.dayKey === today) return;
  state.cardsDoneToday = 0;
  state.resetsToday = 0;
  state.tracker = { ...state.tracker, todayActiveSeconds: 0, dayKey: today };
};

/* ---------- Recovery card ---------- */

const renderCard = (content: CardContent, preview: boolean): void => {
  setText("card-meta", `${content.stretchMinutes} min at the screen`);
  setText("card-chip", preview ? "Preview" : `${formatMinutes(content.todayMinutes * 60)} today`);
  setText("card-heading", content.heading);
  const list = $("card-steps");
  list.replaceChildren(
    ...content.steps.map((step) => {
      const li = document.createElement("li");
      const icon = document.createElement("span");
      icon.className = "icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = step.icon;
      const text = document.createElement("span");
      text.textContent = step.text;
      li.append(icon, text);
      return li;
    }),
  );
  const foot = $("card-footnote");
  foot.hidden = !content.footnote;
  foot.textContent = content.footnote ?? "";
  $("card").hidden = false;
  cardVisible = true;
  cardIsPreview = preview;
};

const showDueCard = (): void => {
  const content = buildCardContent(state.tracker.currentStretchSeconds, state.tracker.todayActiveSeconds, {
    rotation: state.rotation,
    hourOfDay: CARD_HOUR,
  });
  state.rotation += 1;
  renderCard(content, false);
};

const previewCard = (): void => {
  const stretch = PREVIEW_STRETCHES[previewIndex % PREVIEW_STRETCHES.length];
  previewIndex += 1;
  const content = buildCardContent(stretch, Math.max(stretch, state.tracker.todayActiveSeconds), {
    rotation: state.rotation + previewIndex,
    hourOfDay: CARD_HOUR,
  });
  renderCard(content, true);
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
  const protocol = nextProtocol(state.lastProtocolId);
  state.lastProtocolId = protocol.id;
  reset = { endsAt: Date.now() + RESET_SECONDS * 1000, protocol, finished: false };
  renderProtocol(protocol);
  $("reset-done").hidden = true;
  setText("reset-end", "I'm back");
  setText("reset-clock", formatClock(RESET_SECONDS));
  $("reset").hidden = false;
  setBackgroundInert(true);
  document.body.classList.add("locked");
  $("reset-end").focus();
  persist();
};

const nextResetActivity = (): void => {
  if (!reset) return;
  const protocol = nextProtocol(reset.protocol.id);
  reset.protocol = protocol;
  state.lastProtocolId = protocol.id;
  renderProtocol(protocol);
  persist();
};

/** Stepping away is the break: end the reset and start a fresh stretch. */
const endReset = (): void => {
  if (!reset) return;
  reset = null;
  rollDay(new Date());
  state.resetsToday += 1;
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

  // Nothing counts while paused or during a reset (that *is* the break).
  // Time spent in those states is never credited, even if timers were
  // suspended across the transition. Large
  // gaps from background-tab throttling or sleep are clamped by tick().
  const counting = !state.paused && !reset;
  const elapsed = counting && wasCounting ? sinceLastStep : 0;
  wasCounting = counting;
  if (counting) {

    const result = tick(state.tracker, monitor.idleSeconds(nowMs), elapsed, dayKeyFor(now), {
      ...config,
      idleThresholdSeconds: monitor.effectiveThreshold(config.idleThresholdSeconds),
    });

    state.tracker = result.state;
    // Stepping away already was the break, so a card left open is now stale.
    if (result.state.onBreak && cardVisible && !cardIsPreview) hideCard();
    if (result.showCard) showDueCard();
  }

  updateReset(nowMs);
  render();
  if (nowMs - lastPersistMs >= PERSIST_MS) persist();
};

const render = (): void => {
  const t = state.tracker;

  // Metrics
  setText("m-stretch", formatMinutes(t.currentStretchSeconds));
  setText("m-today", formatMinutes(t.todayActiveSeconds));
  setText(
    "m-today-sub",
    `${state.cardsDoneToday} card${state.cardsDoneToday === 1 ? "" : "s"} done · ${state.resetsToday} reset${state.resetsToday === 1 ? "" : "s"}`,
  );

  const untilNext = Math.max(0, config.reminderIntervalSeconds - (t.currentStretchSeconds - t.lastReminderAtStretch));
  if (state.paused) {
    setText("m-next", "Paused");
    setText("m-next-sub", "nothing is being counted");
  } else {
    setText("m-next", formatMinutes(Math.ceil(untilNext / 60) * 60));
    setText("m-next-sub", "of active time from now");
  }

  // Status line + chip
  const chip = $("source-chip");
  let status: string;
  if (state.paused) {
    status = "Paused. Nothing is counted until you resume.";
    chip.dataset.state = "paused";
  } else if (t.onBreak) {
    status = "You're away, which counts as a break. The stretch has reset.";
    chip.dataset.state = "away";
  } else {
    status = "Counting active time.";
    chip.dataset.state = "active";
  }
  setText("status-line", status);
  setText("source-chip", monitor.source === "system" ? "Tracking: whole computer" : "Tracking: this tab only");
  const pauseBtn = $("pause-btn");
  setText("pause-btn", state.paused ? "Resume" : "Pause");
  pauseBtn.setAttribute("aria-pressed", String(state.paused));

  // Bands
  const band = bandForStretch(t.currentStretchSeconds);
  const idx = BANDS.indexOf(band);
  $("band-track")
    .querySelectorAll<HTMLElement>("li")
    .forEach((li, i) => {
      li.classList.toggle("is-current", i === idx);
      li.classList.toggle("is-past", i < idx);
    });

  // Source note
  const systemOn = monitor.source === "system";
  setText(
    "source-text",
    systemOn
      ? "Tracking the whole computer with the browser's Idle Detection permission. It reports only active or idle, nothing else."
      : "This mode only sees this tab. When you switch to another tab or app, it assumes you're still working, so time spent there still counts.",
  );
  $("enable-system").hidden = systemOn || !systemIdleSupported();

  document.body.classList.toggle("locked", Boolean(reset));

  // Tab title doubles as the menu-bar counter from the desktop app.
  document.title = state.paused
    ? "Paused · Anti-Burnout"
    : `${formatMinutes(t.currentStretchSeconds)} · Anti-Burnout`;
};

/* ---------- Settings ---------- */

const settingsDialog = $<HTMLDialogElement>("settings");
const settingsForm = $<HTMLFormElement>("settings-form");

const openSettings = (): void => {
  const f = settingsForm.elements;
  (f.namedItem("reminderMinutes") as HTMLInputElement).value = String(Math.round(config.reminderIntervalSeconds / 60));
  (f.namedItem("idleThresholdSeconds") as HTMLInputElement).value = String(config.idleThresholdSeconds);
  (f.namedItem("snoozeMinutes") as HTMLInputElement).value = String(config.snoozeMinutes);
  (f.namedItem("systemIdle") as HTMLInputElement).checked = monitor.source === "system";
  $("system-idle-row").hidden = !systemIdleSupported();
  settingsDialog.showModal();
};

const clampInt = (raw: string, min: number, max: number, fallback: number): number => {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const setSystemIdle = async (on: boolean): Promise<void> => {
  if (on) {
    config.systemIdle = await monitor.enableSystem(config.idleThresholdSeconds);
  } else {
    monitor.disableSystem();
    config.systemIdle = false;
  }
  saveConfig(store, config);
  render();
};

/**
 * Save from the Save button's submit event so Idle Detection permission
 * is requested synchronously inside the user gesture, before anything is awaited.
 */
settingsForm.addEventListener("submit", (e) => {
  const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
  if (submitter?.value !== "save") return;
  e.preventDefault();

  const f = settingsForm.elements;
  const val = (name: string): HTMLInputElement => f.namedItem(name) as HTMLInputElement;
  const idleThresholdSeconds = clampInt(val("idleThresholdSeconds").value, 30, 900, 60);
  const wantsSystem = val("systemIdle").checked;
  const systemOn = monitor.source === "system";
  const systemChange = wantsSystem !== systemOn || (wantsSystem && idleThresholdSeconds !== config.idleThresholdSeconds);

  let systemResult: Promise<boolean> = Promise.resolve(systemOn);
  if (systemChange) {
    if (wantsSystem) {
      systemResult = monitor.enableSystem(idleThresholdSeconds);
    } else {
      monitor.disableSystem();
      systemResult = Promise.resolve(false);
    }
  }

  config = {
    ...config,
    reminderIntervalSeconds: clampInt(val("reminderMinutes").value, 1, 180, 20) * 60,
    idleThresholdSeconds,
    snoozeMinutes: clampInt(val("snoozeMinutes").value, 1, 60, 5),
  };
  saveConfig(store, config);
  settingsDialog.close();
  render();

  void systemResult.then((systemIdle) => {
    config = { ...config, systemIdle };
    saveConfig(store, config);
    render();
  });
});

/* ---------- Wiring ---------- */

const renderProtocolList = (): void => {
  $("protocol-list").replaceChildren(
    ...PROTOCOL_ORDER.map((id) => {
      const p = PROTOCOLS[id];
      const li = document.createElement("li");
      li.innerHTML = `<span class="p-icon" aria-hidden="true"></span><div><strong></strong><span></span></div>`;
      li.querySelector(".p-icon")!.textContent = p.icon;
      li.querySelector("strong")!.textContent = `${p.title} · ${p.durationLabel}`;
      li.querySelector("div > span")!.textContent = p.action;
      return li;
    }),
  );
};

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
  if (!cardIsPreview) state.cardsDoneToday += 1;
  hideCard();
  persist();
  render();
});
$("card-snooze").addEventListener("click", () => {
  if (!cardIsPreview) {

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
$("pause-btn").addEventListener("click", () => {
  state.paused = !state.paused;
  persist();
  render();
});
$("open-settings").addEventListener("click", openSettings);
$("enable-system").addEventListener("click", () => void setSystemIdle(true));
$("reset-data").addEventListener("click", () => {
  if (!window.confirm("Clear all counters and settings stored in this browser?")) return;
  clearAll(store);
  monitor.disableSystem();
  config = loadConfig(store);
  state = loadState(store, dayKeyFor(new Date()));
  settingsDialog.close();
  hideCard();
  render();
});
window.addEventListener("pagehide", persist);
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

renderProtocolList();
render();
if (config.systemIdle) {
  void monitor.resumeSystem(config.idleThresholdSeconds).then(render);
}
window.setInterval(step, TICK_MS);
