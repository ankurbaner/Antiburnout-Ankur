export type PracticeTime = "morning" | "afternoon" | "evening";

export const TIME_LABELS: Record<PracticeTime, string> = {
  morning: "Morning · energising",
  afternoon: "After lunch · get moving",
  evening: "Late day · calming",
};

export const timeOfDay = (date: Date): PracticeTime => {
  const hour = date.getHours();
  return hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 16 ? "afternoon" : "evening";
};

export const PRACTICE_TIMES: Record<string, PracticeTime[]> = {
  neck: ["morning", "afternoon", "evening"],
  eyes: ["morning", "afternoon", "evening"],
  shoulders: ["morning", "afternoon", "evening"],
  twist: ["morning", "afternoon"],
  "cat-cow": ["morning", "evening"],
  wrists: ["afternoon", "evening"],
  "palm-tree": ["morning", "afternoon"],
  "side-bend": ["morning", "afternoon"],
  heels: ["morning", "afternoon"],
};
