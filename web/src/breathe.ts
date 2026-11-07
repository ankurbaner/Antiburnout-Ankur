export interface BreathPhase {
  label: string;
  inhale: boolean;
  seconds: number;
}

export interface BreathPattern {
  id: string;
  title: string;
  phases: BreathPhase[];
}

export const BREATH_PATTERNS: BreathPattern[] = [
  { id: "equal", title: "Sama Vritti · equal breathing", phases: [
    { label: "Breathe in", inhale: true, seconds: 4 },
    { label: "Breathe out", inhale: false, seconds: 4 },
  ] },
  { id: "deep", title: "Deergha Swasam · full, gentle breath", phases: [
    { label: "Breathe in · belly, ribs, chest", inhale: true, seconds: 4 },
    { label: "Breathe out · gently soften", inhale: false, seconds: 6 },
  ] },
  { id: "so-hum", title: "So-Hum · silent breath mantra", phases: [
    { label: "So… · breathe in", inhale: true, seconds: 4 },
    { label: "Hum… · breathe out", inhale: false, seconds: 4 },
  ] },
  { id: "alternate", title: "Nadi Shodhana · alternate nostrils", phases: [
    { label: "Breathe in through the left · gently close the right nostril", inhale: true, seconds: 4 },
    { label: "Breathe out through the right · gently close the left nostril", inhale: false, seconds: 4 },
    { label: "Breathe in through the right · keep the left nostril closed", inhale: true, seconds: 4 },
    { label: "Breathe out through the left · gently close the right nostril", inhale: false, seconds: 4 },
  ] },
];

export interface BreathState {
  phase: BreathPhase | null;
  phaseIndex: number;
  phaseElapsed: number;
  remaining: number;
  done: boolean;
}

export const breathAt = (pattern: BreathPattern, elapsed: number, duration: number): BreathState | null => {
  if (!Number.isFinite(elapsed) || elapsed < 0 || !Number.isFinite(duration) || duration <= 0 ||
      pattern.phases.length === 0 || pattern.phases.some((phase) => !Number.isFinite(phase.seconds) || phase.seconds <= 0)) return null;
  if (elapsed >= duration) return { phase: null, phaseIndex: -1, phaseElapsed: 0, remaining: 0, done: true };
  const cycle = pattern.phases.reduce((sum, phase) => sum + phase.seconds, 0);
  let offset = elapsed % cycle;
  for (let i = 0; i < pattern.phases.length; i++) {
    const phase = pattern.phases[i];
    if (offset < phase.seconds) return { phase, phaseIndex: i, phaseElapsed: offset, remaining: Math.ceil(duration - elapsed), done: false };
    offset -= phase.seconds;
  }
  return null;
};
