export const SMILE_SCENES = [
  "Even coffee needs a coffee break.",
  "That stretch was exhausting. Time for a lie-down.",
  "Couch potato? No. Dance potato.",
  "Still waving. No need to rush the big finish.",
  "Even my laptop has a fan club.",
  "Quack. That's duck for ‘drink some water’.",
];

export interface SmilePractice {
  id: string;
  title: string;
  seconds: number;
  instruction: string;
}

export const SMILE_PRACTICES: SmilePractice[] = [
  { id: "pause", title: "One-minute pause", seconds: 60, instruction: "Stop and sit still. Offer yourself one kind thought, like ‘I am calm and I am enough.’" },
  { id: "hum", title: "Humming bee breath", seconds: 60, instruction: "Close your eyes if comfortable. Breathe in gently, then hum as you breathe out, 3–5 times; don't force your breath." },
  { id: "smile", title: "Smile from the inside", seconds: 60, instruction: "Let your face relax and a small smile come. Notice how it feels, without trying to feel a certain way." },
  { id: "laugh", title: "Laugh for 30 seconds", seconds: 30, instruction: "Try a pretend laugh and see if a real one joins in. A tiny chuckle counts too; no need to force it." },
  { id: "good", title: "One good thing", seconds: 60, instruction: "Name one thing that went well today. Small is fine: a warm drink, a kind word, or just getting started." },
];

export const nextSmileScene = (current: number, count = SMILE_SCENES.length): number =>
  Number.isInteger(current) && Number.isInteger(count) && count > 0 ? ((current + 1) % count + count) % count : 0;

export const practiceSecondsLeft = (endsAt: number | null, now: number): number | null =>
  endsAt === null ? null : Number.isFinite(endsAt) && Number.isFinite(now) ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
