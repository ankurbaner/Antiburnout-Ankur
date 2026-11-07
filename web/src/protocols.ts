/**
 * The 5-minute Bio-Reset activities, ported from Off-Duty.
 *
 * One activity is shown at a time and the rotation never repeats the previous
 * one back to back, so a reset never turns into a checklist.
 */

export type ProtocolId = "water" | "posture" | "mobility" | "breathwork";

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
};

export const PROTOCOL_ORDER: ProtocolId[] = ["breathwork", "water", "posture", "mobility"];

/** Length of a Bio-Reset, in seconds. */
export const RESET_SECONDS = 5 * 60;

export const countsAsReset = (elapsedSeconds: number): boolean => elapsedSeconds >= 60;

/**
 * Pick the activity that follows `lastId` in the rotation.
 *
 * @param lastId - The previously shown activity, if any.
 * @param enabled - Activities the user allows; falls back to all when empty.
 * @returns The next activity, never equal to `lastId` when more than one is enabled.
 */
export const nextProtocol = (
  lastId: ProtocolId | null | undefined,
  enabled: ProtocolId[] = PROTOCOL_ORDER,
): Protocol => {
  const pool = enabled.length > 0 ? enabled : PROTOCOL_ORDER;
  if (lastId && pool.includes(lastId) && pool.length > 1) {
    return PROTOCOLS[pool[(pool.indexOf(lastId) + 1) % pool.length]];
  }
  return PROTOCOLS[pool[0]];
};
