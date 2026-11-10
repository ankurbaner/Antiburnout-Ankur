// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import html from "../index.html?raw";
import { initDailyPractice } from "../src/dailyPracticeUI";
import { initYoga } from "../src/yogaUI";
import { readFileSync } from "node:fs";

const document = new DOMParser().parseFromString(html, "text/html");
const steadyStyles = readFileSync("src/steady.css", "utf8");

describe("simplified page copy", () => {
  it("provides two decorative inline scenes with CSS-only static reduced-motion states", () => {
    expect(document.querySelector('#steady-smile')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#steady-smile svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('#steady-smile svg')?.getAttribute('focusable')).toBe('false');
    expect(document.querySelector('#steady-smile .steady-smile-mouth')).not.toBeNull();
    expect(document.querySelectorAll('#steady-smile svg[aria-hidden="true"][focusable="false"]')).toHaveLength(2);
    expect([...document.querySelectorAll('#steady-smile button')].map((button) => button.textContent)).toEqual(["Smiling child", "Sun"]);
    expect(document.querySelector('#steady-child-choice')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('#steady-sun-choice')?.getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('#steady-smile [style], #steady-smile image')).toBeNull();
    expect(steadyStyles).toMatch(/@keyframes steady-smile-in/);
    const style = globalThis.document.createElement('style');
    style.textContent = steadyStyles;
    globalThis.document.head.append(style);
    try {
      const reduced = [...style.sheet!.cssRules].find((rule) => 'conditionText' in rule && String(rule.conditionText).replace(/\s/g, '') === '(prefers-reduced-motion:reduce)') as CSSMediaRule;
      expect(reduced).toBeDefined();
      const rules = [...reduced.cssRules] as CSSStyleRule[];
      const mouth = rules.find((rule) => rule.selectorText.includes('.steady-smile-mouth'))!;
      const sun = rules.find((rule) => rule.selectorText.includes('.steady-sun-glow'))!;
      expect(mouth.style.getPropertyValue('animation').trim()).toBe('none');
      expect(mouth.style.getPropertyValue('transform').replace(/\s/g, '')).toBe('scaleY(1)');
      expect(sun.style.getPropertyValue('animation').trim()).toBe('none');
      expect(sun.style.getPropertyValue('transform').trim()).toBe('none');
      expect(Number(sun.style.getPropertyValue('opacity'))).toBe(.8);
    } finally {
      style.remove();
    }
  });
  it("keeps the daily mindfulness and yoga pair directly after the hero", () => {
    expect(document.querySelector(".hero + section")?.id).toBe("practice-of-the-day");
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
  it("places eye exercises between the silent breath guide and desk yoga", () => {
    expect(document.querySelector(".hero + section")?.id).toBe("practice-of-the-day");
    expect(document.querySelector("#practice-of-the-day + section")?.id).toBe("breathe");
    expect(document.querySelector("#breathe + section")?.id).toBe("eyes");
    expect(document.querySelector("#eyes + section")?.id).toBe("yoga");
    expect(document.querySelector("#eyes-title")?.textContent).toBe("Eye exercises");
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
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector("h1")?.textContent).toBe("Calm your mind, rest your eyes, ease your back, right at your desk.");
    expect(document.querySelector(".hero-tagline")?.textContent).toBe("Short breaks for your eyes, back and mind.");
    expect(document.querySelector(".hero .lead")).toBeNull();
    expect(html).not.toContain("Every 20 minutes of screen use, a small card suggests");
  });

  it("shows the exact medical disclaimer at yoga, meditation and the page footer", () => {
    const disclaimer = "This is not medical advice. Please consult your doctor wherever possible, especially if you have a health condition or injury.";
    expect(document.querySelector("#yoga .yoga-safety")?.textContent).toBe(`Move gently and stop if anything hurts. ${disclaimer}`);
    expect(document.querySelector("#meditation .yoga-intro + .yoga-safety")?.textContent).toBe(disclaimer);
    expect(document.querySelector("body > footer .yoga-safety")?.textContent).toBe(disclaimer);
    expect(document.querySelector("#eyes .yoga-safety")?.textContent).toBe(`Stop if your eyes feel strained. ${disclaimer}`);
    expect(document.querySelectorAll(".yoga-safety")).toHaveLength(5);
    expect(html).not.toContain("If you have a health condition, check with your doctor first.");
  });

  it("keeps manual resets and navigation without reminder cards or settings", () => {
    expect(document.querySelector("#how, #privacy, .tips-title, #eye-break, #day-notice")).toBeNull();
    expect([...document.querySelectorAll(".nav a")].map((link) => link.textContent)).toEqual(["Breathe", "Eyes", "Yoga", "Meditation", "Calm", "Contact"]);
    expect(document.querySelector('#settings, #open-settings, #card, .recovery-card, [data-action="preview-card"]')).toBeNull();
    expect(html).not.toMatch(/Preview a card|Settings|Snooze/);
    expect(document.querySelector("#reset #reset-action")).not.toBeNull();
    expect(document.querySelector("#reset-data")).toBeNull();
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

  it("places the complete accessible, silent Steady guide immediately before Contact", () => {
    expect(document.querySelector('#steady')?.textContent).not.toMatch(/About 2–3 minutes|grounding|5-4-3-2-1|reframe|excited/i);
    expect(document.querySelector('#steady-ground, .steady-dot, .steady-row')).toBeNull();
    expect(document.body.textContent).not.toMatch(/sweat/i);
    expect(document.querySelector('#steady + section')?.id).toBe("contact");
    expect(document.querySelector('#meditation + section')?.id).toBe("steady");
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
  it("shows Walk break under While standing with its own fifteen-minute timer", () => {
    globalThis.document.body.innerHTML = '<div id="yoga-groups"></div>';
    initYoga();
    const walk = globalThis.document.querySelector('[data-practice="walk-break"]')!;
    expect(walk.closest('.yoga-group')?.querySelector('h3')?.textContent).toBe("While standing");
    expect(walk.querySelector('h4')?.textContent).toBe("Walk break");
    expect(walk.querySelector('.yoga-english')?.textContent).toBe("Fresh air · 15-minute walk");
    expect(walk.querySelector('.yoga-duration')?.textContent).toBe("15 min");
    expect(walk.querySelector('button')?.getAttribute('aria-label')).toBe("Start Walk break");
    globalThis.document.body.replaceChildren();
  });
});
