// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import html from "../index.html?raw";

const document = new DOMParser().parseFromString(html, "text/html");

describe("simplified page copy", () => {
  it("keeps desk yoga immediately after the hero", () => {
    expect(document.querySelector(".hero + section")?.id).toBe("yoga");
    expect(document.querySelector('.nav a[href="#yoga"]')?.textContent).toBe("Yoga");
    expect(document.querySelector("#smile, .smile-scene, #smile-practices")).toBeNull();
    expect(document.getElementById("yoga-title")?.textContent).toBe("Desk yoga");
    expect(document.querySelector(".yoga-safety")?.textContent).toBe("Move gently and stop if anything hurts. If you have a health condition, check with your doctor first.");
    expect(html).not.toMatch(/Brahma Kumaris|Art of Living|Smile break|Quick ways to feel lighter/);
  });
  it("replaces Today and metrics with small reminder controls", () => {
    expect(document.querySelector("#today, .metrics, .history, #status-line")).toBeNull();
    expect(document.querySelector('.nav a[href="#today"]')).toBeNull();
    expect(document.querySelector("#pause-btn")?.textContent).toBe("Pause");
    expect(document.querySelector("#meeting-btn")?.getAttribute("aria-pressed")).toBe("false");
    expect(document.querySelector('[name="dailyGoalMinutes"]')).toBeNull();
    expect(document.querySelector("h1")?.textContent).toBe("Short breaks for your eyes, back and mind.");
  });

  it("has three short steps, three tips and three privacy bullets without removed sections", () => {
    expect(document.querySelectorAll(".step")).toHaveLength(3);
    expect(document.querySelectorAll("#how .privacy-list li")).toHaveLength(3);
    expect(document.querySelectorAll("#privacy li")).toHaveLength(3);
    expect(document.getElementById("privacy-title")?.textContent).toBe("Privacy");
    expect(document.querySelector(".tips-title")?.textContent).toBe("Tips");
    expect(document.querySelector(".bands, .reset-preview, #protocol-list")).toBeNull();
    expect(document.querySelector("#reset #reset-action")).not.toBeNull();
    expect(document.querySelector("#privacy")?.textContent).toContain("No activity history is kept.");
    expect(document.querySelector("#how")?.textContent).toContain("In a meeting");
  });

  it("keeps every navigation link pointing at an existing section", () => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>("a[href^='#']")) {
      expect(document.querySelector(link.getAttribute("href")!)).not.toBeNull();
    }
  });
});
