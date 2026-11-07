import { describe, expect, it } from "vitest";
import { DAILY_PRACTICES, dailyPractice } from "../src/dailyPractice";
import { YOGA_GROUPS } from "../src/yoga";
import { MEDITATION_PRACTICES } from "../src/meditation";

describe("practice of the local day", () => {
  it("includes every yoga and meditation practice without unused origin metadata", () => {
    expect(DAILY_PRACTICES).toEqual([...YOGA_GROUPS.flatMap((group) => group.practices), ...MEDITATION_PRACTICES]);
    expect(new Set(DAILY_PRACTICES.map((practice) => practice.id)).size).toBe(18);
    for (const practice of DAILY_PRACTICES) expect(practice).not.toHaveProperty("origin");
  });
  it("is stable throughout a local calendar day, without saved state", () => {
    const morning = new Date(2026, 10, 7, 0, 0);
    expect(dailyPractice(morning)).toBe(dailyPractice(new Date(2026, 10, 7, 23, 59, 59)));
    expect(dailyPractice(new Date(morning.getTime()))).toBe(dailyPractice(morning));
  });
  it("covers all practices and never repeats on adjacent dates, across leap days, year and DST boundaries", () => {
    const seen = new Set();
    let previous = "";
    for (let i = 0; i < 800; i++) {
      const date = new Date(2023, 11, 20 + i, 12);
      const practice = dailyPractice(date)!;
      expect(practice.id).not.toBe(previous);
      previous = practice.id;
      seen.add(practice.id);
    }
    expect(seen.size).toBe(18);
  });
  it("uses local date parts, not the UTC date or elapsed 24-hour periods", () => {
    const date = new Date(2026, 0, 1);
    date.getUTCDate = () => { throw new Error("UTC day must not be read"); };
    date.toISOString = () => { throw new Error("UTC string must not be read"); };
    expect(dailyPractice(date)).toBe(dailyPractice(new Date(2026, 0, 1, 23, 59)));
    expect(dailyPractice(new Date(1969, 11, 31))).not.toBe(dailyPractice(new Date(1970, 0, 1)));
  });
  it("handles invalid dates, empty lists and a single available practice", () => {
    expect(dailyPractice(new Date(NaN))).toBeNull();
    expect(dailyPractice(new Date(), [])).toBeNull();
    expect(dailyPractice(new Date(), [DAILY_PRACTICES[0]])).toBe(DAILY_PRACTICES[0]);
  });
});
