export const snoozeAllowed = (count: number, max: number): boolean => max === 0 || count < max;
