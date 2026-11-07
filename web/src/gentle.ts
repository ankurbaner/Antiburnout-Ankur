export const GENTLE_AREAS = ["back", "neck", "wrists", "pregnancy"] as const;
export type GentleArea = typeof GENTLE_AREAS[number];
export type GentleSettings = Record<GentleArea, boolean>;
export const DEFAULT_GENTLE: GentleSettings = { back: false, neck: false, wrists: false, pregnancy: false };

export const PRACTICE_CONFLICTS: Record<string, GentleArea[]> = {
  alternate: [],
  neck: ["neck"],
  shoulders: [],
  twist: ["back", "pregnancy"],
  "cat-cow": ["back"],
  wrists: ["wrists"],
  eyes: [],
  "palm-tree": [],
  "side-bend": ["back", "pregnancy"],
  heels: [],
  "meeting-palming": [],
  posture: ["back", "pregnancy"],
  mobility: ["back", "neck", "wrists", "pregnancy"],
  "desk-stretch": ["back", "neck", "pregnancy"],
  breathwork: ["pregnancy"],
};

export const loadGentle = (value: unknown): GentleSettings => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { back: raw.back === true, neck: raw.neck === true, wrists: raw.wrists === true, pregnancy: raw.pregnancy === true };
};

export const isAllowed = (practice: { id: string }, gentle: GentleSettings = DEFAULT_GENTLE): boolean => {
  const conflicts = PRACTICE_CONFLICTS[practice.id];
  return !Array.isArray(conflicts) || !conflicts.some((area) => gentle[area]);
};

export const filterPractices = <T extends { id: string }>(practices: readonly T[], gentle: GentleSettings = DEFAULT_GENTLE): T[] =>
  practices.filter((practice) => isAllowed(practice, gentle));

export const hasGentleSettings = (gentle: GentleSettings): boolean => GENTLE_AREAS.some((area) => gentle[area]);
