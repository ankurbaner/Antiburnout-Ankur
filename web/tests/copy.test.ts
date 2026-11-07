// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import html from "../index.html?raw";

const document = new DOMParser().parseFromString(html, "text/html");

describe("simplified page copy", () => {
  it("welcomes questions, feedback and suggestions while keeping the email link", () => {
    expect(document.querySelector("#contact .muted")?.textContent).toBe("We welcome your questions, feedback and suggestions. Please contact us by email.");
    expect(document.querySelector("#contact .contact-email")?.getAttribute("href")).toBe("mailto:ankur.banerjee014@gmail.com?subject=Anti-Burnout");
    expect(document.querySelector("#contact .contact-email")?.textContent).toBe("ankur.banerjee014@gmail.com");
  });
  it("places the silent breath guide before desk yoga", () => {
    expect(document.querySelector(".hero + section")?.id).toBe("intention-panel");
    expect(document.querySelector("#intention-panel + section")?.id).toBe("practice-of-the-day");
    expect(document.querySelector("#practice-of-the-day + section")?.id).toBe("breathe");
    expect(document.querySelector("#breathe + section")?.id).toBe("yoga");
    expect(document.querySelector('.nav a[href="#yoga"]')?.textContent).toBe("Yoga");
    expect(document.querySelector("#smile, .smile-scene, #smile-practices")).toBeNull();
    expect(document.getElementById("yoga-title")?.textContent).toBe("Desk yoga");
    expect(document.querySelector(".yoga-safety")?.textContent).toBe("Move gently and stop if anything hurts. If you have a health condition, check with your doctor first.");
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

  it("keeps reminder, reset and Gentle options and retained navigation", () => {
    expect(document.querySelector("#how, #privacy, .tips-title, #eye-break, #day-notice")).toBeNull();
    expect([...document.querySelectorAll(".nav a")].map((link) => link.textContent)).toEqual(["Breathe", "Yoga", "Meditation", "Contact"]);
    expect([...document.querySelectorAll("#settings input")].map((input) => input.getAttribute("name"))).toEqual([
      "reminderMinutes", "snoozeMinutes", "maxSnoozes", "chime", "meetingMode",
      "gentle-back", "gentle-neck", "gentle-wrists", "gentle-pregnancy",
    ]);
    expect(document.querySelector("#settings")?.textContent).toContain("Quiet practices only (for meetings)");
    expect(document.querySelector("#reset #reset-action")).not.toBeNull();
    expect(document.querySelector("#reset-data")).not.toBeNull();
  });

  it("keeps every navigation link pointing at an existing section", () => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>("a[href^='#']")) {
      expect(document.querySelector(link.getAttribute("href")!)).not.toBeNull();
    }
  });
});
