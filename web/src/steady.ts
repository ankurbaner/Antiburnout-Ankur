export const STEADY_SCENES = {
  child: "Look at the child's smile. Smile back. All is well.",
  sun: "Rest your gaze on the sun. Breathe slowly. All is well.",
} as const;

export const STEADY_STEPS = [
  { title: "Physiological sigh", instruction: "Take a comfortable breath in through your nose, add a small second inhale, then breathe out slowly. No holds or forcing; stop or skip if you feel dizzy or uncomfortable.", seconds: 30 },
  { title: "Picture a smile", instruction: "Choose a scene to focus on for a moment. Let your breathing stay comfortable.", seconds: 20 },
  { title: "Hands squeeze & release", instruction: "Gently clench your fists for 5 seconds, then release for 10. Repeat three times without straining.", seconds: 45 },
  { title: "Say quietly: “I'm excited.”", instruction: "A racing heart can be energy you use for the talk. You do not have to feel perfectly calm to begin.", seconds: 10 },
] as const;

export const steadyAt = (step: number, elapsed: number) => {
  if (!Number.isInteger(step) || step < 0 || step >= STEADY_STEPS.length || !Number.isFinite(elapsed) || elapsed < 0) return null;
  const duration = STEADY_STEPS[step].seconds;
  const done = elapsed >= duration;
  const remaining = Math.max(0, Math.ceil(duration - elapsed));
  const cycle = Math.min(elapsed, duration) % (step === 2 ? 15 : 10);
  const round = Math.min(3, Math.floor(elapsed / (step === 2 ? 15 : 10)) + 1);
  if (step === 0) {
    const phase = cycle < 2 ? 0 : cycle < 3 ? 1 : 2;
    const start = [0, 2, 3][phase];
    const seconds = [2, 1, 7][phase];
    return { done, remaining, round, phase, phaseElapsed: cycle - start, seconds,
      label: ["Breathe in through your nose…", "A small second inhale…", "Long, slow breath out…"][phase], inhale: phase < 2 };
  }
  const squeeze = cycle < 5;
  return { done, remaining, round, phase: step === 2 && !squeeze ? 1 : 0,
    phaseElapsed: step === 2 ? cycle - (squeeze ? 0 : 5) : 0, seconds: step === 2 ? squeeze ? 5 : 10 : duration,
    label: step === 2 ? squeeze ? "Squeeze…" : "Let go… notice the warmth" : step === 1 ? STEADY_SCENES.child : STEADY_STEPS[step].title, inhale: false };
};
