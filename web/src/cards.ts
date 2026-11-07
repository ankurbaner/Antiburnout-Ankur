import { CardPractice, GENTLE_PRACTICES, MEETING_PRACTICES, YOGA_GROUPS } from "./yoga";
import { PRACTICE_TIMES, PracticeTime } from "./timeOfDay";
import { DEFAULT_GENTLE, GentleSettings, filterPractices } from "./gentle";
export type { CardPractice } from "./yoga";

const yoga = (id: string, instruction: string): CardPractice => {
  const practice = YOGA_GROUPS.flatMap((group) => group.practices).find((item) => item.id === id)!;
  return { ...practice, instruction, times: PRACTICE_TIMES[id] };
};

export const CARD_BANDS = [
  [
    yoga("neck", "Sit tall and slowly turn your head a little left and right, returning to the middle without tipping your head back."),
    yoga("eyes", "Slowly look left, right, up and down, then close your eyes and cup clean palms over them without pressure."),
  ],
  [
    yoga("shoulders", "Rest your hands on your thighs and slowly roll your shoulders up, back and down, then change direction."),
    yoga("twist", "Sit tall with feet on the floor and gently turn your chest a little each way, without pulling on your chair."),
    yoga("cat-cow", "With hands on your thighs, gently lift your chest as you breathe in and round your upper back as you breathe out."),
    yoga("wrists", "Make small wrist circles in both directions, then open your fingers wide and close them into loose fists."),
  ],
  [
    yoga("palm-tree", "Stand with knees soft and heels down, gently reach your arms upward as far as feels easy, then lower them."),
    yoga("side-bend", "Stand with feet apart, lift one arm and gently lean to the other side without twisting, then switch sides."),
    yoga("heels", "Hold a steady desk or wall for balance and slowly lift and lower both heels with control."),
  ],
];

export const isCardPracticeId = (value: unknown): value is string =>
  typeof value === "string" && [...CARD_BANDS.flat(), ...MEETING_PRACTICES, ...GENTLE_PRACTICES].some((practice) => practice.id === value);

export const needsWater = (stretch: number): boolean => stretch > 90 * 60;

export const practicePool = (stretch: number, meeting: boolean, time?: PracticeTime, gentle: GentleSettings = DEFAULT_GENTLE): CardPractice[] => {
  const band = filterPractices(meeting ? MEETING_PRACTICES : CARD_BANDS[stretch < 45 * 60 ? 0 : needsWater(stretch) ? 2 : 1], gentle);
  const preferred = !meeting && time ? band.filter((practice) => practice.times?.includes(time)) : band;
  const pool = preferred.length > 0 ? preferred : band;
  return pool.length >= 2 ? pool : [...pool, ...GENTLE_PRACTICES.filter((practice) => !pool.some((item) => item.id === practice.id))];
};

const selectFromPool = (pool: CardPractice[], previous: string | null, rotation: number): CardPractice => {
  const previousIndex = pool.findIndex((practice) => practice.id === previous);
  const index = previousIndex >= 0 ? (previousIndex + 1) % pool.length
    : Number.isFinite(rotation) ? Math.abs(Math.floor(rotation)) % pool.length : 0;
  return pool[index];
};

export const selectCardPractice = (stretch: number, meeting: boolean, previous: string | null, rotation = 0, time?: PracticeTime, gentle: GentleSettings = DEFAULT_GENTLE): CardPractice =>
  selectFromPool(practicePool(stretch, meeting, time, gentle), previous, rotation);

export const createPreviewSelector = () => {
  const previousByPool = new Map<string, string>();
  let lastPreview: string | null = null;
  return (stretch: number, meeting: boolean, previous: string | null, rotation = 0, time?: PracticeTime, gentle: GentleSettings = DEFAULT_GENTLE): CardPractice => {
    const pool = practicePool(stretch, meeting, time, gentle);
    const key = `${meeting ? "meeting" : stretch < 2700 ? "short" : needsWater(stretch) ? "long" : "middle"}:${pool.map((practice) => practice.id).join(",")}`;
    let practice = selectFromPool(pool, previousByPool.get(key) ?? previous, rotation);
    if (practice.id === lastPreview) practice = selectFromPool(pool, lastPreview, rotation);
    lastPreview = practice.id;
    previousByPool.set(key, practice.id);
    return practice;
  };
};
