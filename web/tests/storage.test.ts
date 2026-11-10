import { expect, it, vi } from "vitest";
import { clearLegacyStorage } from "../src/storage";

it.each(["{bad json", "[]", JSON.stringify({ meetingMode: true, lastPracticeId: "kindness", tracker: { currentStretchSeconds: 7200 } })])("removes obsolete data without parsing it: %s", (raw) => {
  const data = new Map([
    ["anti-burnout:config", raw], ["anti-burnout:state", raw],
    ["anti-burnout:intention", raw], ["anti-burnout:spot", raw], ["unrelated", "keep"],
  ]);
  const store = { removeItem: (key: string) => { data.delete(key); } };
  clearLegacyStorage(store);
  expect([...data]).toEqual([["unrelated", "keep"]]);
  expect(() => clearLegacyStorage(store)).not.toThrow();
});

it("continues cleanup when storage removal fails", () => {
  const removeItem = vi.fn(() => { throw new Error("Storage blocked"); });
  expect(() => clearLegacyStorage({ removeItem })).not.toThrow();
  expect(removeItem).toHaveBeenCalledTimes(4);
});
