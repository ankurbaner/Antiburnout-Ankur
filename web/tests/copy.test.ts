// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import html from "../index.html?raw";
import { initDailyPractice } from "../src/dailyPracticeUI";
import { initYoga } from "../src/yogaUI";
import { readFileSync } from "node:fs";

const document = new DOMParser().parseFromString(html, "text/html");
const steadyStyles = readFileSync("src/steady.css", "utf8");

describe("simplified page copy", () => {
  it("provides a decorative inline smile with a CSS-only static reduced-motion state", () => {
    expect(document.querySelector('#steady-smile')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#steady-smile svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('#steady-smile svg')?.getAttribute('focusable')).toBe('false');
    expect(document.querySelector('#steady-smile .steady-smile-mouth')).not.toBeNull();
    expect(document.querySelector('#steady-smile [style], #steady-smile image')).toBeNull();
    expect(steadyStyles).toMatch(/@keyframes steady-smile-in/);
    expect(steadyStyles).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*#steady-smile:not\(\[hidden\]\) \.steady-smile-mouth\s*\{ animation: none; transform: scaleY\(1\);/);
  });
  it("keeps the daily mindfulness and yoga pair directly after Steady", () => {
    expect(document.querySelector("#steady + section")?.id).toBe("practice-of-the-day");
    expect(document.querySelector("#daily-title")?.textContent).toBe("Practice of the day");
    globalThis.document.body.innerHTML = document.querySelector("#practice-of-the-day")!.outerHTML;
    initDailyPractice(new Date(2026, 10, 7));
    expect([...globalThis.document.querySelectorAll("#daily-practice h3")].map((heading) => heading.textContent)).toEqual(["Mindfulness", "Yoga exercise"]);
    expect(globalThis.document.querySelectorAll("#daily-practice article")).toHaveLength(2);
    expect(globalThis.document.body.textContent).not.toContain("Roots");
    globalThis.document.body.replaceChildren();
  });
  it("welcomes questions, feedback and suggestions while keeping the email link", () => {
    expect(document.querySelector("#contact .eyebrow")?.textContent).toBe("Contact me");
    expect(document.querySelector("#contact .muted")?.textContent).toBe("I welcome your questions, feedback and suggestions. Please contact me by email.");
    expect(document.querySelector("#contact")?.textContent).not.toMatch(/\b(?:we|us|our)\b/i);
    expect(document.querySelector("#contact .contact-email")?.getAttribute("href")).toBe("mailto:ankur.banerjee014@gmail.com?subject=Anti-Burnout");
    expect(document.querySelector("#contact .contact-email")?.textContent).toBe("ankur.banerjee014@gmail.com");
  });
  it("places the silent breath guide before desk yoga", () => {
    expect(document.querySelector(".hero + section")?.id).toBe("steady");
    expect(document.querySelector("#steady + section")?.id).toBe("practice-of-the-day");
    expect(document.querySelector("#practice-of-the-day + section")?.id).toBe("breathe");
    expect(document.querySelector("#breathe + section")?.id).toBe("yoga");
    expect(document.querySelector('.nav a[href="#yoga"]')?.textContent).toBe("Yoga");
    expect(document.querySelector("#smile, .smile-scene, #smile-practices")).toBeNull();
    expect(document.getElementById("yoga-title")?.textContent).toBe("Desk yoga");
    expect(html).not.toMatch(/Brahma Kumaris|Art of Living|Smile break|Quick ways to feel lighter/);
  });
  it("removes the dashboard and top controls", () => {
    expect(document.querySelector("#today, .metrics, .history, #status-line")).toBeNull();
    expect(document.querySelector('.nav a[href="#today"]')).toBeNull();
    expect(document.querySelector(".control-area, #pause-btn, #source-chip, #enable-system, #meeting-btn, #source-text")).toBeNull();
    expect(document.querySelector('[name="dailyGoalMinutes"]')).toBeNull();
    expect(document.querySelector('[name="idleThresholdSeconds"]')).toBeNull();
    expect(document.querySelector("h1")?.textContent).toBe("Short breaks for your eyes, back and mind.");
  });

  it("shows the exact medical disclaimer at yoga, meditation and the page footer", () => {
    const disclaimer = "This is not medical advice. Please consult your doctor wherever possible, especially if you have a health condition or injury.";
    expect(document.querySelector("#yoga .yoga-safety")?.textContent).toBe(`Move gently and stop if anything hurts. ${disclaimer}`);
    expect(document.querySelector("#meditation .yoga-intro + .yoga-safety")?.textContent).toBe(disclaimer);
    expect(document.querySelector("body > footer .yoga-safety")?.textContent).toBe(disclaimer);
    expect(document.querySelectorAll(".yoga-safety")).toHaveLength(4);
    expect(html).not.toContain("If you have a health condition, check with your doctor first.");
  });

  it("keeps only reminder/reset options and retained navigation", () => {
    expect(document.querySelector("#how, #privacy, .tips-title, #eye-break, #day-notice")).toBeNull();
    expect([...document.querySelectorAll(".nav a")].map((link) => link.textContent)).toEqual(["Calm", "Breathe", "Yoga", "Meditation", "Contact"]);
    expect([...document.querySelectorAll("#settings input")].map((input) => input.getAttribute("name"))).toEqual([
      "reminderMinutes", "snoozeMinutes", "maxSnoozes", "chime", "meetingMode",
    ]);
    expect(document.querySelector("#settings")?.textContent).toContain("Quiet practices only (for meetings)");
    expect(document.querySelector("#reset #reset-action")).not.toBeNull();
    expect(document.querySelector("#reset-data")).not.toBeNull();
    expect(document.querySelector('[name^="gentle-"]')).toBeNull();
    expect(html).not.toMatch(/Go gently|Gentle alternatives|Hide practices that may put extra strain/i);
  });

  it("keeps every navigation link pointing at an existing section", () => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>("a[href^='#']")) {
      expect(document.querySelector(link.getAttribute("href")!)).not.toBeNull();
    }
  });

  it("removes daily intentions, saved spots, end-of-day settings and Roots copy", () => {
    expect(document.querySelector("#intention-panel, #save-spot, #save-spot-open, #morning-note")).toBeNull();
    expect(document.querySelector('[name="endOfDay"], [name="endOfDayTime"]')).toBeNull();
    expect(html).not.toMatch(/Today's intention|Sankalpa|Save my spot|Save your spot|Where you left off|Roots|End of day/i);
    expect(document.querySelector("#practice-of-the-day")).not.toBeNull();
    expect(document.querySelector("#install-app")).not.toBeNull();
  });

  it("places an accessible, silent Steady guide before the daily practice", () => {
    expect(document.querySelector('#steady + section')?.id).toBe("practice-of-the-day");
    expect(document.querySelector('.nav a[href="#steady"]')?.textContent).toBe("Calm");
    expect(document.querySelector('#steady .eyebrow')?.textContent).toBe("When nerves hit");
    expect(document.querySelector('#steady-title')?.textContent).toBe("Steady before you speak");
    expect(document.querySelector('#steady-start')?.textContent).toBe("I feel nervous now");
    expect(document.querySelector('#steady .yoga-safety')?.textContent).toBe("This is not medical advice. If panic or anxiety happens often or feels overwhelming, please speak to a doctor.");
    expect([...document.querySelectorAll('#steady .steady-tips li')].map((tip) => tip.textContent)).toEqual([
      "Hold a cool glass or bottle for a moment.",
      "Plant both feet and feel the floor beneath them.",
      "Give your first sentence a little more time.",
      "Find a friendly face to speak towards.",
      "Sip water or green tea instead of coffee before a talk.",
    ]);
    expect(document.querySelector('#steady .steady-tips')?.textContent).toContain("Sip water or green tea instead of coffee before a talk.");
    for (const id of ["steady-progress", "steady-phase", "steady-result"]) {
      expect(document.getElementById(id)?.getAttribute("aria-live")).toBe("polite");
    }
  });
  it("shows Walk break under While standing with its own ten-minute timer", () => {
    globalThis.document.body.innerHTML = '<div id="yoga-groups"></div>';
    initYoga();
    const walk = globalThis.document.querySelector('[data-practice="walk-break"]')!;
    expect(walk.closest('.yoga-group')?.querySelector('h3')?.textContent).toBe("While standing");
    expect(walk.querySelector('h4')?.textContent).toBe("Walk break");
    expect(walk.querySelector('.yoga-english')?.textContent).toBe("Fresh air · 10-minute walk");
    expect(walk.querySelector('.yoga-duration')?.textContent).toBe("10 min");
    expect(walk.querySelector('button')?.getAttribute('aria-label')).toBe("Start Walk break");
    globalThis.document.body.replaceChildren();
  });
});
