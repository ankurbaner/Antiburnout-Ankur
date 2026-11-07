import type { PracticeTime } from "./timeOfDay";
import { DEFAULT_GENTLE, GentleSettings, filterPractices } from "./gentle";

export interface CardPractice {
  id: string;
  title: string;
  english: string;
  instruction: string;
  times?: PracticeTime[];
}

export const MEETING_PRACTICES: CardPractice[] = [
  { id: "meeting-eyes", title: "Netra Sanchalana", english: "Gentle eye movements", instruction: "Keep your head still and slowly look left, right, up and down without straining." },
  { id: "meeting-palming", title: "Netra Vishrama", english: "Palming · rest your eyes", instruction: "Close your eyes and lightly cup clean palms over them without pressing on your eyes." },
  { id: "meeting-equal", title: "Sama Vritti", english: "Equal breathing", instruction: "Breathe quietly in for 4 counts and out for 4, using a shorter equal count if needed, without holding your breath." },
  { id: "meeting-shoulders", title: "Skandha Shithilikarana", english: "Shoulder release", instruction: "Keep your hands resting and gently let your shoulders drop away from your ears as you breathe out." },
  { id: "meeting-ankles", title: "Gulpha Chakra", english: "Ankle circles under the desk", instruction: "With your feet under the desk, lift one foot slightly and make small ankle circles, then switch feet." },
];

export interface YogaPractice {
  id: string;
  title: string;
  english: string;
  seconds: number;
  instruction: string;
  origin: string;
}

export interface YogaGroup {
  id: string;
  title: string;
  practices: YogaPractice[];
  hidden?: string[];
}

export const GENTLE_PRACTICES: YogaPractice[] = [
  { id: "gentle-eyes", title: "Netra Vishrama", english: "Rest your eyes, hands down", seconds: 60, origin: "", instruction: "Rest your gaze on something nearby, or close your eyes if comfortable. Keep your hands resting and blink normally, without pressing on your eyes." },
  { id: "gentle-shoulders", title: "Shoulder release", english: "Let your shoulders soften", seconds: 60, origin: "", instruction: "Sit comfortably with your hands resting and your head still. Let your shoulders soften down without pulling or lifting them, and breathe naturally." },
];

export const yogaGroupsFor = (gentle: GentleSettings = DEFAULT_GENTLE): YogaGroup[] => {
  const groups = YOGA_GROUPS.map((group) => {
    const practices = filterPractices(group.practices, gentle);
    return { ...group, practices, hidden: group.practices.filter((practice) => !practices.includes(practice)).map((practice) => practice.english) };
  });
  return groups.some((group) => group.hidden.length > 0)
    ? [...groups, { id: "gentle", title: "Gentle alternatives", practices: GENTLE_PRACTICES, hidden: [] }]
    : groups;
};

export const YOGA_GROUPS: YogaGroup[] = [
  {
    id: "breathing", title: "Pranayama · quiet breathing", practices: [
      { id: "alternate", title: "Nadi Shodhana", english: "Alternate-nostril breathing", seconds: 60, origin: "Described in classical hatha yoga texts such as the Hatha Yoga Pradipika.", instruction: "Sit comfortably; gently close your right nostril and breathe in through the left, then close the left and breathe out through the right. Breathe in through the right and out through the left; repeat quietly, without holding your breath or forcing air." },
      { id: "deep", title: "Deergha Swasam", english: "Three-part deep breathing", seconds: 60, origin: "A full yogic breath taught in modern Indian yoga traditions such as Sivananda and Integral Yoga.", instruction: "Breathe in gently, letting your belly, ribs and then upper chest expand a little. Breathe out slowly and let them soften; keep the breath comfortable, with no holds." },
      { id: "equal", title: "Sama Vritti", english: "Equal breathing", seconds: 60, origin: "‘Even breath’: an equal-ratio breath used in classical pranayama practice.", instruction: "Breathe in quietly for a count of 4, then out for 4, without pausing between breaths. Use a shorter, equal count if that feels easier." },
    ],
  },
  {
    id: "sitting", title: "While sitting", practices: [
      { id: "neck", title: "Greeva Sanchalana", english: "Slow neck movements", seconds: 60, origin: "From the Pawanmuktasana series of the Bihar School of Yoga.", instruction: "Sit tall and slowly turn your head a little left, then right. Return to the middle, gently lower your chin, then look ahead; avoid full neck circles or tipping your head far back." },
      { id: "shoulders", title: "Skandha Chakra", english: "Shoulder rotations", seconds: 60, origin: "From the Pawanmuktasana series of the Bihar School of Yoga.", instruction: "Rest your hands on your thighs and slowly roll your shoulders up, back and down. Make a few small circles, then change direction while breathing normally." },
      { id: "twist", title: "Ardha Matsyendrasana · chair version", english: "Seated chair twist", seconds: 60, origin: "Adapted from the seated twist named after the yogi Matsyendranath.", instruction: "Keep both feet on the floor and sit tall in a steady chair. Turn your chest a little to one side without pulling on the chair, return to the middle, then try the other side." },
      { id: "cat-cow", title: "Marjariasana · chair version", english: "Seated cat-cow", seconds: 60, origin: "Adapted from the cat pose of hatha yoga.", instruction: "With hands on your thighs, breathe in and gently lift your chest. Breathe out and round your upper back a little; repeat slowly without throwing your head back." },
      { id: "wrists", title: "Manibandha Chakra & Mushtika Bandhana", english: "Wrist and finger loosening", seconds: 60, origin: "From the Pawanmuktasana series of the Bihar School of Yoga.", instruction: "Rest your elbows comfortably and make small, slow circles with your wrists in both directions. Gently open your fingers wide, then close them into loose fists." },
      { id: "eyes", title: "Netra Sanchalana & palming", english: "Eye movements and resting your eyes", seconds: 60, origin: "From the Pawanmuktasana series of the Bihar School of Yoga.", instruction: "Keeping your head still, slowly look left, right, up and down without straining. Close your eyes and cup clean palms over them lightly, without pressing on your eyes." },
    ],
  },
  {
    id: "standing", title: "While standing", practices: [
      { id: "palm-tree", title: "Tadasana", english: "Palm tree stretch · arms overhead", seconds: 60, origin: "A standing pose taught in the Bihar School of Yoga.", instruction: "Stand with feet comfortably apart and knees soft, then slowly lift your arms overhead only as far as feels easy. Reach gently upward with heels on the floor, breathe normally, then lower your arms." },
      { id: "side-bend", title: "Tiryaka Tadasana", english: "Standing side bend", seconds: 60, origin: "A standing pose taught in the Bihar School of Yoga.", instruction: "Stand with feet apart and lift one arm if comfortable, keeping the other hand on your hip. Lean a little to the opposite side without twisting, return upright, then switch sides." },
      { id: "heels", title: "Pada Sanchalana · heel raises", english: "Calf and heel raises", seconds: 60, origin: "From the Pawanmuktasana series of the Bihar School of Yoga.", instruction: "Stand beside a steady desk or wall and hold it lightly for balance. Slowly lift both heels, then lower them with control; keep the movement small and quiet." },
    ],
  },
];

export const practiceSecondsLeft = (endsAt: number | null, now: number): number | null =>
  endsAt === null || !Number.isFinite(now) ? null : Number.isFinite(endsAt) ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
