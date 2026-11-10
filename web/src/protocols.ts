/**
 * The 5-minute Bio-Reset activities, ported from Off-Duty.
 *
 * One activity is shown at a time and the rotation never repeats the previous
 * one back to back, so a reset never turns into a checklist.
 */

export type ProtocolId = "water" | "posture" | "mobility" | "breathwork" | "alternate" | "desk-stretch";

export interface Protocol {
  id: ProtocolId;
  icon: string;
  title: string;
  durationLabel: string;
  action: string;
  why: string;
}

export const PROTOCOLS: Record<ProtocolId, Protocol> = {
  water: {
    id: "water",
    icon: "💧",
    title: "Hydration reset",
    durationLabel: "1 min",
    action: "Walk away from your desk and drink a full glass of water while standing.",
    why: "Mild dehydration shows up as tiredness and poor focus long before you feel thirsty.",
  },
  posture: {
    id: "posture",
    icon: "🧍",
    title: "Posture & hip unload",
    durationLabel: "90 sec",
    action: "Stand tall, then hold a half-kneeling hip-flexor stretch for 45 seconds on each side.",
    why: "Long sitting shortens the hip flexors and pulls you into a slump.",
  },
  mobility: {
    id: "mobility",
    icon: "🔄",
    title: "Upper-back release",
    durationLabel: "90 sec",
    action: "Clasp your hands behind your head, arch gently back, and rotate your torso eight times.",
    why: "Undoes the forward-head, rounded-shoulder shape that hours at a screen build up.",
  },
  breathwork: {
    id: "breathwork",
    icon: "🌬️",
    title: "20-20-20 + physiological sigh",
    durationLabel: "1 min",
    action: "Look at something 20+ feet away and take five double inhales, each with a long, slow exhale through the mouth.",
    why: "Distance focus relaxes the eye muscles; long exhales slow the heart rate.",
  },
  alternate: {
    id: "alternate",
    icon: "🌿",
    title: "Alternate-nostril breathing",
    durationLabel: "1 min",
    action: "Sit comfortably. Close your right nostril gently, breathe in through the left, then close the left and breathe out through the right. Breathe in through the right and out through the left; repeat quietly without breath holds or forcing air.",
    why: "Nadi Shodhana gives you a quiet rhythm to follow. Return to normal breathing if you feel uncomfortable.",
  },
  "desk-stretch": {
    id: "desk-stretch",
    icon: "🪑",
    title: "Seated desk stretch",
    durationLabel: "1 min",
    action: "Sit tall with feet on the floor in a steady chair. Slowly turn your head left and right, roll your shoulders back, then turn your chest a little each way without pulling; keep breathing normally.",
    why: "A quiet change of position for your neck, shoulders and back. Move gently and stop if anything hurts.",
  },
};

export const PROTOCOL_ORDER: ProtocolId[] = ["breathwork", "water", "posture", "mobility", "alternate", "desk-stretch"];

export const RESET_SECONDS = 5 * 60;

export const nextProtocol = (lastId: ProtocolId | null | undefined): Protocol => {
  const index = lastId ? PROTOCOL_ORDER.indexOf(lastId) : -1;
  return PROTOCOLS[PROTOCOL_ORDER[(index + 1) % PROTOCOL_ORDER.length]];
};
