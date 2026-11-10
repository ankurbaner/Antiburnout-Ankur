import { describe, expect, it } from "vitest";
import { PROTOCOL_ORDER, RESET_SECONDS, nextProtocol } from "../src/protocols";
import { formatClock } from "../src/format";

describe("manual reset protocols", () => {
  it("keeps a five-minute reset and rotates all six activities without repeats", () => {
    expect(RESET_SECONDS).toBe(300);
    expect(PROTOCOL_ORDER).toHaveLength(6);
    let last = nextProtocol(null);
    expect(last.id).toBe(PROTOCOL_ORDER[0]);
    const seen = new Set([last.id]);
    for (let i = 0; i < 8; i++) {
      const next = nextProtocol(last.id);
      expect(next.id).not.toBe(last.id);
      seen.add(next.id);
      last = next;
    }
    expect(seen.size).toBe(PROTOCOL_ORDER.length);
    expect(nextProtocol("desk-stretch").id).toBe(PROTOCOL_ORDER[0]);
    expect(nextProtocol(undefined).id).toBe(PROTOCOL_ORDER[0]);
  });
});

describe("format", () => {
  it("formats durations and hours", () => {
    expect(formatClock(300)).toBe("05:00");
    expect(formatClock(900)).toBe("15:00");
    expect(formatClock(3725)).toBe("1:02:05");
  });
});
