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
import { curfewStatus } from "./curfew";
import { formatClock, formatHour, formatMinutes } from "./format";
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
 * while paused, mid-reset or after the day was ended, so nothing from
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

const notify = (content: CardContent): void => {
  if (!config.notifications || !("Notification" in window) || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible" && document.hasFocus()) return;
  try {
    const n = new Notification(content.heading, {
      body: content.steps.map((s) => `${s.icon} ${s.text}`).join("\n"),
      tag: "anti-burnout-card",
      icon: "./favicon.svg",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* some platforms only allow notifications from a service worker */
  }
};

const showDueCard = (): void => {
  const content = buildCardContent(state.tracker.currentStretchSeconds, state.tracker.todayActiveSeconds, {
    rotation: state.rotation,
  });
  state.rotation += 1;
  renderCard(content, false);
  notify(content);
};

const previewCard = (): void => {
  const stretch = PREVIEW_STRETCHES[previewIndex % PREVIEW_STRETCHES.length];
  previewIndex += 1;
  const content = buildCardContent(stretch, Math.max(stretch, state.tracker.todayActiveSeconds), {
    rotation: state.rotation + previewIndex,
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

const startReset = (): void => {
  hideCard();
  const protocol = nextProtocol(state.lastProtocolId);
  state.lastProtocolId = protocol.id;
  reset = { endsAt: Date.now() + RESET_SECONDS * 1000, protocol, finished: false };
  renderProtocol(protocol);
  $("reset-done").hidden = true;
  setText("reset-end", "I'm back");
  setText("reset-clock", formatClock(RESET_SECONDS));
  $("reset").hidden = false;
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
  document.body.classList.remove("locked");
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

/* ---------- End of day ---------- */

const curfewCfg = () => ({ startHour: config.curfewStartHour, endHour: config.curfewEndHour });

const endDay = (): void => {
  hideCard();
  state.dayEndedAt = new Date().toISOString();
  state.lockOverrideUntil = null;
  persist();
  render();
};

const unlockDay = (): void => {
  const curfew = curfewStatus(new Date(), curfewCfg());
  if (state.dayEndedAt && curfew.inCurfew) {
    // Keep auto-lock from immediately re-locking for the rest of this evening.
    state.lockOverrideUntil = curfew.unlockAt.toISOString();
  }
  state.dayEndedAt = null;
  persist();
  render();
};

/** Clear an ended day once its morning arrives, and auto-lock when configured. */
const updateDayEnd = (now: Date): void => {
  if (state.dayEndedAt) {
    const unlockAt = curfewStatus(new Date(state.dayEndedAt), curfewCfg()).unlockAt;
    if (now.getTime() >= unlockAt.getTime()) state.dayEndedAt = null;
  }
  if (state.lockOverrideUntil && now.getTime() >= new Date(state.lockOverrideUntil).getTime()) {
    state.lockOverrideUntil = null;
  }
  if (config.autoLock && !state.dayEndedAt && !state.lockOverrideUntil && curfewStatus(now, curfewCfg()).inCurfew) {
    hideCard();
    state.dayEndedAt = now.toISOString();
  }
};

/* ---------- Main loop ---------- */

const step = (): void => {
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const sinceLastStep = (nowMs - lastTickMs) / 1000;
  lastTickMs = nowMs;

  rollDay(now);
  updateDayEnd(now);

  // Nothing counts while paused, during a reset (that *is* the break), or
  // after the day has been ended. Time spent in those states is never
  // credited, even if timers were suspended across the transition. Large
  // gaps from background-tab throttling or sleep are clamped by tick().
  const counting = !state.paused && !reset && !state.dayEndedAt;
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
  const now = new Date();
  const t = state.tracker;
  const cfg = curfewCfg();
  const curfew = curfewStatus(now, cfg);

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

  if (curfew.inCurfew) {
    setText("m-curfew", "Now");
    setText("m-curfew-sub", `evening until ${formatHour(cfg.endHour)}`);
  } else {
    setText("m-curfew", formatMinutes(curfew.secondsUntilStart));
    setText("m-curfew-sub", `evening starts at ${formatHour(cfg.startHour)}`);
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
  setText("source-chip", monitor.source === "system" ? "Whole computer" : "This tab");
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
      : "A browser tab can't see other apps. Your activity on this page is counted, and while the tab is in the background the app assumes you're working elsewhere.",
  );
  $("enable-system").hidden = systemOn || !systemIdleSupported();
  $("enable-notify").hidden =
    !("Notification" in window) || (config.notifications && Notification.permission === "granted");

  // Curfew banner
  $("curfew-banner").hidden = !curfew.inCurfew || Boolean(state.dayEndedAt);

  // Night overlay
  const night = $("night");
  if (state.dayEndedAt) {
    const unlockAt = curfewStatus(new Date(state.dayEndedAt), cfg).unlockAt;
    setText("night-clock", formatClock((unlockAt.getTime() - now.getTime()) / 1000));
    setText(
      "night-until",
      `until ${unlockAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}${unlockAt.getDate() !== now.getDate() ? " tomorrow" : ""}`,
    );
    setText("r-today", formatMinutes(t.todayActiveSeconds));
    setText("r-cards", String(state.cardsDoneToday));
    setText("r-resets", String(state.resetsToday));
    if (night.hidden) {
      night.hidden = false;
      $("night-unlock").focus();
    }
  } else {
    night.hidden = true;
  }
  document.body.classList.toggle("locked", Boolean(state.dayEndedAt) || Boolean(reset));

  // Tab title doubles as the menu-bar counter from the desktop app.
  document.title = state.paused
    ? "Paused · Anti-Burnout"
    : `${formatMinutes(t.currentStretchSeconds)} · Anti-Burnout`;
};

/* ---------- Settings ---------- */

const settingsDialog = $<HTMLDialogElement>("settings");
const settingsForm = $<HTMLFormElement>("settings-form");

const fillHourSelect = (name: string, selected: number): void => {
  const select = settingsForm.elements.namedItem(name) as HTMLSelectElement;
  if (select.options.length === 0) {
    for (let h = 0; h < 24; h++) select.add(new Option(formatHour(h), String(h)));
  }
  select.value = String(selected);
};

const openSettings = (): void => {
  const f = settingsForm.elements;
  (f.namedItem("reminderMinutes") as HTMLInputElement).value = String(Math.round(config.reminderIntervalSeconds / 60));
  (f.namedItem("idleThresholdSeconds") as HTMLInputElement).value = String(config.idleThresholdSeconds);
  (f.namedItem("snoozeMinutes") as HTMLInputElement).value = String(config.snoozeMinutes);
  fillHourSelect("curfewStartHour", config.curfewStartHour);
  fillHourSelect("curfewEndHour", config.curfewEndHour);
  (f.namedItem("autoLock") as HTMLInputElement).checked = config.autoLock;
  (f.namedItem("notifications") as HTMLInputElement).checked = config.notifications;
  (f.namedItem("systemIdle") as HTMLInputElement).checked = monitor.source === "system";
  $("system-idle-row").hidden = !systemIdleSupported();
  settingsDialog.showModal();
};

const clampInt = (raw: string, min: number, max: number, fallback: number): number => {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const enableNotifications = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  const permission =
    Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  return permission === "granted";
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
 * Save from the Save button's submit event so permission prompts
 * (notifications, Idle Detection) are requested synchronously inside the
 * user gesture, before anything is awaited.
 */
settingsForm.addEventListener("submit", (e) => {
  const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
  if (submitter?.value !== "save") return;
  e.preventDefault();

  const f = settingsForm.elements;
  const val = (name: string): HTMLInputElement => f.namedItem(name) as HTMLInputElement;
  const idleThresholdSeconds = clampInt(val("idleThresholdSeconds").value, 30, 900, 60);
  const wantsNotify = val("notifications").checked;
  const wantsSystem = val("systemIdle").checked;
  const systemOn = monitor.source === "system";
  const systemChange = wantsSystem !== systemOn || (wantsSystem && idleThresholdSeconds !== config.idleThresholdSeconds);

  const notifyPermission = wantsNotify ? enableNotifications() : Promise.resolve(false);
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
    curfewStartHour: clampInt((f.namedItem("curfewStartHour") as HTMLSelectElement).value, 0, 23, 20),
    curfewEndHour: clampInt((f.namedItem("curfewEndHour") as HTMLSelectElement).value, 0, 23, 6),
    autoLock: val("autoLock").checked,
  };
  saveConfig(store, config);
  settingsDialog.close();
  render();

  void Promise.all([notifyPermission, systemResult]).then(([notifications, systemIdle]) => {
    config = { ...config, notifications, systemIdle };
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
    case "end-day":
      endDay();
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
$("night-unlock").addEventListener("click", unlockDay);
$("pause-btn").addEventListener("click", () => {
  state.paused = !state.paused;
  persist();
  render();
});
$("open-settings").addEventListener("click", openSettings);
$("enable-system").addEventListener("click", () => void setSystemIdle(true));
$("enable-notify").addEventListener("click", async () => {
  config.notifications = await enableNotifications();
  saveConfig(store, config);
  render();
});
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
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && cardVisible) hideCard();
});

renderProtocolList();
render();
if (config.systemIdle) {
  void monitor.resumeSystem(config.idleThresholdSeconds).then(render);
}
window.setInterval(step, TICK_MS);
