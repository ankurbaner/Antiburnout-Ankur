export type LocalStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface Intention { day: string; text: string; skipped: boolean }
export const INTENTION_KEY = "anti-burnout:intention";
export const oneLine = (text: string, limit: number): string => text.replace(/\s+/g, " ").trim().slice(0, limit);

export const loadIntention = (store: LocalStore, day: string): Intention => {
  const fresh = { day, text: "", skipped: false };
  try {
    const raw = JSON.parse(store.getItem(INTENTION_KEY) ?? "null");
    if (!raw || raw.day !== day) return fresh;
    const skipped = raw.skipped === true;
    return { day, text: !skipped && typeof raw.text === "string" ? oneLine(raw.text, 120) : "", skipped };
  } catch { return fresh; }
};

export const saveIntention = (store: LocalStore, intention: Intention): void => {
  try { store.setItem(INTENTION_KEY, JSON.stringify({ ...intention, text: oneLine(intention.text, 120) })); } catch { /* local storage may be unavailable */ }
};
