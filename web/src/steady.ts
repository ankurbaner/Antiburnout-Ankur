export const STEADY_SCENES = {
  child: "Look at the child's smile. Smile back. All is well.",
  sun: "Rest your gaze on the sun. Breathe slowly. All is well.",
} as const;

export const STEADY_STEPS = [
  { kind: "sigh", title: "Physiological sigh", instruction: "Take a comfortable breath in through your nose, add a small second inhale, then breathe out slowly. No holds or forcing; stop or skip if you feel dizzy or uncomfortable.", seconds: 30 },
  { kind: "smile", title: "Picture a smile", instruction: "Choose a scene to focus on for a moment. Let your breathing stay comfortable.", seconds: 20 },
  { kind: "squeeze", title: "Squeeze and release", instruction: "Gently curl your toes and press your feet into the floor, hidden under a desk or podium. Squeeze your fists too if no one can see. Squeeze for 5 seconds, then release for 10. Repeat three times without straining.", seconds: 45 },
] as const;

export const steadyAt = (step: number, elapsed: number) => {
  if (!Number.isInteger(step) || step < 0 || step >= STEADY_STEPS.length || !Number.isFinite(elapsed) || elapsed < 0) return null;
  const { kind, seconds: duration } = STEADY_STEPS[step];
  const done = elapsed >= duration;
  const remaining = Math.max(0, Math.ceil(duration - elapsed));
  if (kind === "smile") return { done, remaining, round: 1, phase: 0, phaseElapsed: 0, seconds: duration, label: STEADY_SCENES.child, inhale: false };
  const cycle = Math.min(elapsed, duration) % (kind === "squeeze" ? 15 : 10);
  const round = Math.min(3, Math.floor(elapsed / (kind === "squeeze" ? 15 : 10)) + 1);
  if (kind === "sigh") {
    const phase = cycle < 2 ? 0 : cycle < 3 ? 1 : 2;
    const start = [0, 2, 3][phase];
    const seconds = [2, 1, 7][phase];
    return { done, remaining, round, phase, phaseElapsed: cycle - start, seconds,
      label: ["Breathe in through your nose…", "A small second inhale…", "Long, slow breath out…"][phase], inhale: phase < 2 };
  }
  const squeeze = cycle < 5;
  return { done, remaining, round, phase: squeeze ? 0 : 1,
    phaseElapsed: cycle - (squeeze ? 0 : 5), seconds: squeeze ? 5 : 10,
    label: squeeze ? "Squeeze… toes and feet (fists too, if no one can see)" : "Let go… feel the floor and the warmth", inhale: false };
};
