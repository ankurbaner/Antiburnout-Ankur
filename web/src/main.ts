import "@fontsource-variable/newsreader";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./styles.css";

import { initBreathe } from "./breatheUI";
import { initSteady } from "./steadyUI";
import { initDailyPractice } from "./dailyPracticeUI";
import { initInstall, registerWorker } from "./pwa";
import { initPracticeGroups, initYoga } from "./yogaUI";
import { MEDITATION_PRACTICES } from "./meditation";
import { EYE_PRACTICES } from "./eyes";
import { formatClock } from "./format";
import { Protocol, RESET_SECONDS, nextProtocol } from "./protocols";
import { clearLegacyStorage } from "./storage";

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};
const setText = (id: string, text: string): void => {
  const el = $(id);
  if (el.textContent !== text) el.textContent = text;
};

try { clearLegacyStorage(window.localStorage); } catch {}

let dailyDate = new Date().toDateString();
let lastProtocolId: Protocol["id"] | null = null;
let reset: { endsAt: number; protocol: Protocol; finished: boolean } | null = null;
let focusBeforeReset: HTMLElement | null = null;

const renderProtocol = (protocol: Protocol): void => {
  setText("reset-icon", protocol.icon);
  setText("reset-title", protocol.title);
  setText("reset-duration", protocol.durationLabel);
  setText("reset-action", protocol.action);
  setText("reset-why", protocol.why);
};

const setBackgroundInert = (inert: boolean): void => {
  const overlay = $("reset");
  for (const el of Array.from(overlay.parentElement?.children ?? [])) {
    if (el !== overlay) (el as HTMLElement).inert = inert;
  }
};

const startReset = (): void => {
  focusBeforeReset = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const protocol = nextProtocol(lastProtocolId);
  lastProtocolId = protocol.id;
  reset = { endsAt: Date.now() + RESET_SECONDS * 1000, protocol, finished: false };
  renderProtocol(protocol);
  $("reset-done").hidden = true;
  setText("reset-end", "I'm back");
  setText("reset-clock", formatClock(RESET_SECONDS));
  $("reset").hidden = false;
  setBackgroundInert(true);
  document.body.classList.add("locked");
  $("reset-end").focus();
};

const nextResetActivity = (): void => {
  if (!reset) return;
  const protocol = nextProtocol(reset.protocol.id);
  reset.protocol = protocol;
  lastProtocolId = protocol.id;
  renderProtocol(protocol);
};

const endReset = (): void => {
  if (!reset) return;
  reset = null;
  $("reset").hidden = true;
  setBackgroundInert(false);
  document.body.classList.remove("locked");
  focusBeforeReset?.focus();
  focusBeforeReset = null;
};

const step = (): void => {
  const now = new Date();
  if (now.toDateString() !== dailyDate) {
    dailyDate = now.toDateString();
    initDailyPractice(now);
  }
  if (!reset) return;
  const remaining = Math.max(0, Math.ceil((reset.endsAt - now.getTime()) / 1000));
  setText("reset-clock", formatClock(remaining));
  if (remaining === 0 && !reset.finished) {
    reset.finished = true;
    $("reset-done").hidden = false;
    setText("reset-end", "Back to it, gently");
  }
};

document.querySelector<HTMLButtonElement>('[data-action="start-reset"]')?.addEventListener("click", startReset);
$("reset-next").addEventListener("click", nextResetActivity);
$("reset-end").addEventListener("click", endReset);
$("reset").addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const items = Array.from($("reset").querySelectorAll<HTMLElement>("button:not([hidden])"));
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

initBreathe();
initSteady();
initInstall();
registerWorker();
initDailyPractice(new Date());
initYoga();
initPracticeGroups("eye-practices", [{ id: "eyes", title: "Choose a gentle eye break", practices: EYE_PRACTICES }]);
initPracticeGroups("meditation-practices", [{ id: "meditation", title: "Choose a quiet moment", practices: MEDITATION_PRACTICES }]);
window.setInterval(step, 1000);
