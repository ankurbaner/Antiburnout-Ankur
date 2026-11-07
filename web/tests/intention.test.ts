import { expect, it } from "vitest";
import { INTENTION_KEY, loadIntention, oneLine, saveIntention } from "../src/intention";

it("loads legacy, malformed and unavailable storage safely", () => {
  for (const raw of [null, "{}", "null", "broken", JSON.stringify({ day: "2026-11-07", text: 42 })]) {
    expect(loadIntention({ getItem: () => raw, setItem: () => {}, removeItem: () => {} }, "2026-11-07")).toEqual({ day: "2026-11-07", text: "", skipped: false });
  }
  const store = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => {} };
  expect(loadIntention(store, "today").text).toBe("");
  expect(() => saveIntention(store, { day: "today", text: "Be kind", skipped: false })).not.toThrow();
});

it("keeps a saved or skipped intention only for the same local day", () => {
  let data: string | null = null;
  const store = { getItem: () => data, setItem: (key: string, value: string) => { expect(key).toBe(INTENTION_KEY); data = value; }, removeItem: () => {} };
  saveIntention(store, { day: "2026-11-07", text: "  One thing\nat a time  ", skipped: false });
  expect(loadIntention(store, "2026-11-07").text).toBe("One thing at a time");
  expect(loadIntention(store, "2026-11-08")).toEqual({ day: "2026-11-08", text: "", skipped: false });
  saveIntention(store, { day: "2026-11-07", text: "", skipped: true });
  expect(loadIntention(store, "2026-11-07").skipped).toBe(true);
  expect(loadIntention(store, "2026-11-08").skipped).toBe(false);
  expect(oneLine("x".repeat(200), 120)).toHaveLength(120);
});
