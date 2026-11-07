// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import html from "../index.html?raw";

const document = new DOMParser().parseFromString(html, "text/html");

describe("simplified page copy", () => {
  it("replaces Smile with desk yoga immediately after Today", () => {
    expect(document.querySelector("#today + section")?.id).toBe("yoga");
    expect(document.querySelector('.nav a[href="#yoga"]')?.textContent).toBe("Yoga");
    expect(document.querySelector("#smile, .smile-scene, #smile-practices")).toBeNull();
    expect(document.getElementById("yoga-title")?.textContent).toBe("Desk yoga");
    expect(document.querySelector(".yoga-safety")?.textContent).toBe("Move gently and stop if anything hurts. If you have a health condition, check with your doctor first.");
    expect(html).not.toMatch(/Brahma Kumaris|Art of Living|Smile break|Quick ways to feel lighter/);
  });
  it("keeps the three metrics and live-update targets with plain defaults", () => {
    expect([...document.querySelectorAll(".metric-label")].map((el) => el.textContent)).toEqual([
      "Since your last break", "Screen time today", "Next reminder in",
    ]);
    expect(document.getElementById("m-stretch-sub")?.textContent).toBe("Resets after 1 min away");
    expect(document.getElementById("m-today-sub")?.textContent).toBe("0 guided breaks");
    expect(document.getElementById("m-next-sub")?.textContent).toBe("of screen time");
  });

  it("has three short steps, three tips and three privacy bullets without removed sections", () => {
    expect(document.querySelectorAll(".step")).toHaveLength(3);
    expect(document.querySelectorAll("#how .privacy-list li")).toHaveLength(3);
    expect(document.querySelectorAll("#privacy li")).toHaveLength(3);
    expect(document.getElementById("privacy-title")?.textContent).toBe("Privacy");
    expect(document.querySelector(".tips-title")?.textContent).toBe("Tips");
    expect(document.querySelector(".bands, .reset-preview, #protocol-list")).toBeNull();
    expect(document.querySelector("#reset #reset-action")).not.toBeNull();
    expect(document.getElementById("history-goal-note")?.textContent).toBe("Green bars = days you hit your goal.");
  });

  it("keeps every navigation link pointing at an existing section", () => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>("a[href^='#']")) {
      expect(document.querySelector(link.getAttribute("href")!)).not.toBeNull();
    }
  });
});
