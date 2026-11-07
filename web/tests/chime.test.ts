import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

it("does not create audio before a gesture and tolerates unavailable audio", async () => {
  const ctor = vi.fn(() => { throw new Error("Unavailable"); });
  vi.stubGlobal("AudioContext", ctor);
  const { playChime, unlockChime } = await import("../src/chime");
  playChime();
  expect(ctor).not.toHaveBeenCalled();
  expect(unlockChime).not.toThrow();
  expect(playChime).not.toThrow();
});

it("tolerates a blocked resume without playing", async () => {
  const createOscillator = vi.fn();
  vi.stubGlobal("AudioContext", vi.fn(() => ({
    state: "suspended", resume: () => Promise.reject(new Error("Blocked")), createOscillator,
  })));
  const { playChime, unlockChime } = await import("../src/chime");
  unlockChime();
  await Promise.resolve();
  playChime();
  expect(createOscillator).not.toHaveBeenCalled();
});

it("schedules two gentle notes and tolerates playback errors", async () => {
  const start = vi.fn();
  const stop = vi.fn();
  const createOscillator = vi.fn(() => ({ frequency: {}, connect: vi.fn(), start, stop }));
  vi.stubGlobal("AudioContext", vi.fn(() => ({
    state: "running", currentTime: 1, destination: {}, createOscillator,
    createGain: () => ({
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }),
  })));
  const { playChime, unlockChime } = await import("../src/chime");
  unlockChime();
  playChime(true, true);
  playChime(false, false);
  expect(createOscillator).not.toHaveBeenCalled();
  playChime();
  expect(start.mock.calls).toEqual([[1], [1.25]]);
  expect(stop).toHaveBeenCalledTimes(2);
  createOscillator.mockImplementation(() => { throw new Error("Closed"); });
  expect(playChime).not.toThrow();
});
