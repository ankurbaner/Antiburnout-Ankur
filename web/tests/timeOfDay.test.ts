import { expect, it } from "vitest";
import { timeOfDay } from "../src/timeOfDay";
import { CARD_BANDS, createPreviewSelector, practicePool, selectCardPractice } from "../src/cards";
import { MEETING_PRACTICES } from "../src/yoga";

it.each([[0, 0, "evening"], [4, 59, "evening"], [5, 0, "morning"], [11, 59, "morning"], [12, 0, "afternoon"], [15, 59, "afternoon"], [16, 0, "evening"], [23, 59, "evening"]] as const)("uses local time at %s:%s", (hour, minute, expected) => {
  expect(timeOfDay(new Date(2026, 10, 7, hour, minute))).toBe(expected);
});

it("prefers suitable practices within the band and falls back when none suit", () => {
  expect(practicePool(3600, false, "morning").map((p) => p.id)).toEqual(["shoulders", "twist", "cat-cow"]);
  expect(practicePool(3600, false, "afternoon").map((p) => p.id)).toEqual(["shoulders", "twist", "wrists"]);
  expect(practicePool(3600, false, "evening").map((p) => p.id)).toEqual(["shoulders", "cat-cow", "wrists"]);
  expect(practicePool(6000, false, "evening")).toEqual(CARD_BANDS[2]);
});

it("uses only original band practices with at least two choices in every time window", () => {
  expect(practicePool(0, false, "morning")).toEqual(CARD_BANDS[0]);
  for (const time of ["morning", "afternoon", "evening"] as const) {
    for (const stretch of [0, 3600, 6000]) {
      const band = CARD_BANDS[stretch === 0 ? 0 : stretch === 3600 ? 1 : 2];
      const pool = practicePool(stretch, false, time);
      expect(pool.length).toBeGreaterThanOrEqual(2);
      expect(pool.every((practice) => band.includes(practice))).toBe(true);
    }
  }
});

it("cycles real and preview cards through every effective pool without repeats", () => {
  for (const time of ["morning", "afternoon", "evening"] as const) {
    for (const stretch of [0, 3600, 6000]) {
      const pool = practicePool(stretch, false, time);
      const preview = createPreviewSelector();
      let previous: string | null = null;
      let previousPreview: string | null = null;
      const seen = new Set();
      const previews = new Set();
      for (let i = 0; i < pool.length * 3; i++) {
        const next = selectCardPractice(stretch, false, previous, i, time);
        const nextPreview = preview(stretch, false, null, i, time);
        expect(next.id).not.toBe(previous);
        expect(nextPreview.id).not.toBe(previousPreview);
        previous = next.id;
        previousPreview = nextPreview.id;
        seen.add(next.id);
        previews.add(nextPreview.id);
      }
      expect(seen).toEqual(new Set(pool.map((p) => p.id)));
      expect(previews).toEqual(seen);
      expect(practicePool(stretch, true, time)).toEqual(MEETING_PRACTICES);
    }
  }
});
