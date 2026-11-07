import { describe, expect, it } from "vitest";
import { CARD_BANDS, isCardPracticeId, selectCardPractice } from "../src/cards";
import { MEETING_PRACTICES } from "../src/yoga";
import { MEETING_PROTOCOL_ORDER, PROTOCOLS, nextProtocol } from "../src/protocols";

describe("web yoga reminder cards", () => {
  it.each([[0, 0], [44 * 60 + 59, 0], [45 * 60, 1], [90 * 60, 1], [90 * 60 + 1, 2], [200 * 60, 2]])(
    "selects the right band at %s seconds", (stretch, band) => {
      const ids = new Set(Array.from({ length: 12 }, (_, rotation) => selectCardPractice(stretch, false, null, rotation).id));
      expect(ids).toEqual(new Set(CARD_BANDS[band].map((practice) => practice.id)));
    },
  );
  it("never repeats the previous practice across band changes or meeting switches", () => {
    let previous: string | null = null;
    for (const meeting of [false, true, false]) {
      for (const stretch of [0, 2700, 5401, 5400, 0]) {
        for (let rotation = 0; rotation < 20; rotation++) {
          const practice = selectCardPractice(stretch, meeting, previous, rotation);
          expect(practice.id).not.toBe(previous);
          expect(practice.instruction.match(/\./g)).toHaveLength(1);
          previous = practice.id;
        }
      }
    }
  });
  it("overrides every stretch band with only the five call-safe practices", () => {
    const safe = new Set(MEETING_PRACTICES.map((practice) => practice.id));
    expect(safe.size).toBe(5);
    for (const stretch of [0, 2700, 5401, 20000]) {
      expect(new Set(Array.from({ length: 5 }, (_, i) => selectCardPractice(stretch, true, null, i).id))).toEqual(safe);
    }
  });
  it("handles unknown previous IDs and invalid rotation and validates saved IDs", () => {
    expect(selectCardPractice(0, false, "removed", NaN).id).toBe(CARD_BANDS[0][0].id);
    expect(isCardPracticeId("removed")).toBe(false);
    expect(isCardPracticeId(null)).toBe(false);
    expect(isCardPracticeId("neck")).toBe(true);
  });
  it("restricts meeting resets to the same safe pool, with no repeats", () => {
    expect(MEETING_PROTOCOL_ORDER).toEqual(MEETING_PRACTICES.map((practice) => practice.id));
    for (const id of MEETING_PROTOCOL_ORDER) {
      const next = nextProtocol(id, MEETING_PROTOCOL_ORDER);
      expect(next.id).not.toBe(id);
      expect(MEETING_PROTOCOL_ORDER).toContain(next.id);
      expect(PROTOCOLS[id].why).toContain("Meeting mode");
    }
    expect(MEETING_PROTOCOL_ORDER).toContain(nextProtocol("posture", MEETING_PROTOCOL_ORDER).id);
  });
});
