export const STEADY_STEPS = [
  { title: "Three easy sighs", instruction: "Take a comfortable breath in through your nose, add a small second inhale, then breathe out slowly. No holds or forcing; stop or skip if you feel dizzy or uncomfortable.", seconds: 30 },
  { title: "Hands squeeze & release", instruction: "Gently clench your fists for 5 seconds, then release for 10. Repeat three times without straining. This may help you feel more settled when your palms are sweaty; it is not a treatment for sweating.", seconds: 45 },
  { title: "5-4-3-2-1 grounding", instruction: "Notice your surroundings and tap one dot for each thing you notice. Take your time. If a sense is unavailable or uncomfortable, use Next instead.", seconds: 35 },
  { title: "Picture a smile", instruction: "Picture a friendly face, or someone laughing. Let yourself smile too, if it feels natural.", seconds: 20 },
  { title: "Say quietly: “I'm excited.”", instruction: "A racing heart can be energy you use for the talk. You do not have to feel perfectly calm to begin.", seconds: 10 },
] as const;

export const GROUND_SENSES = [
  { label: "See", count: 5 }, { label: "Touch", count: 4 }, { label: "Hear", count: 3 },
  { label: "Smell", count: 2 }, { label: "Taste", count: 1 },
] as const;

export const steadyAt = (step: number, elapsed: number, grounded = false) => {
  if (!Number.isInteger(step) || step < 0 || step >= STEADY_STEPS.length || !Number.isFinite(elapsed) || elapsed < 0) return null;
  const duration = STEADY_STEPS[step].seconds;
  const done = step === 2 ? grounded : elapsed >= duration;
  const remaining = Math.max(0, Math.ceil(duration - elapsed));
  const cycle = Math.min(elapsed, duration) % (step === 1 ? 15 : 10);
  const round = Math.min(3, Math.floor(elapsed / (step === 1 ? 15 : 10)) + 1);
  if (step === 0) {
    const phase = cycle < 2 ? 0 : cycle < 3 ? 1 : 2;
    const start = [0, 2, 3][phase];
    const seconds = [2, 1, 7][phase];
    return { done, remaining, round, phase, phaseElapsed: cycle - start, seconds,
      label: ["Breathe in through your nose…", "A small second inhale…", "Long, slow breath out…"][phase], inhale: phase < 2 };
  }
  const squeeze = cycle < 5;
  return { done, remaining, round, phase: step === 1 && !squeeze ? 1 : 0,
    phaseElapsed: step === 1 ? cycle - (squeeze ? 0 : 5) : 0, seconds: step === 1 ? squeeze ? 5 : 10 : duration,
    label: step === 1 ? squeeze ? "Squeeze…" : "Let go… notice the warmth" : step === 2 ? "Notice one thing at a time." : step === 3 ? "Smile. All is well." : STEADY_STEPS[step].title, inhale: false };
};
