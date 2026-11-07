import { YOGA_GROUPS } from "./yoga";

export interface CardPractice {
  id: string;
  title: string;
  english: string;
  instruction: string;
}

const yoga = (id: string, instruction: string): CardPractice => {
  const practice = YOGA_GROUPS.flatMap((group) => group.practices).find((item) => item.id === id)!;
  return { ...practice, instruction };
};

export const MEETING_PRACTICES: CardPractice[] = [
  { id: "meeting-eyes", title: "Netra Sanchalana", english: "Gentle eye movements", instruction: "Keep your head still and slowly look left, right, up and down without straining." },
  { id: "meeting-palming", title: "Netra Vishrama", english: "Palming · rest your eyes", instruction: "Close your eyes and lightly cup clean palms over them without pressing on your eyes." },
  { id: "meeting-equal", title: "Sama Vritti", english: "Equal breathing", instruction: "Breathe quietly in for 4 counts and out for 4, using a shorter equal count if needed, without holding your breath." },
  { id: "meeting-shoulders", title: "Skandha Shithilikarana", english: "Shoulder release", instruction: "Keep your hands resting and gently let your shoulders drop away from your ears as you breathe out." },
  { id: "meeting-ankles", title: "Gulpha Chakra", english: "Ankle circles under the desk", instruction: "With your feet under the desk, lift one foot slightly and make small ankle circles, then switch feet." },
];

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
  typeof value === "string" && [...CARD_BANDS.flat(), ...MEETING_PRACTICES].some((practice) => practice.id === value);

export const selectCardPractice = (stretch: number, meeting: boolean, previous: string | null, rotation = 0): CardPractice => {
  const pool = meeting ? MEETING_PRACTICES : CARD_BANDS[stretch < 45 * 60 ? 0 : stretch <= 90 * 60 ? 1 : 2];
  const available = pool.filter((practice) => practice.id !== previous);
  const index = Number.isFinite(rotation) ? Math.abs(Math.floor(rotation)) % available.length : 0;
  return available[index];
};
