export interface PageSignals {
  now: number;
  lastInputAt: number;
  focused: boolean;
}

/** Assume work in another tab when this page cannot see input. */
export const pageIdleSeconds = ({ now, lastInputAt, focused }: PageSignals): number =>
  focused ? Math.max(0, (now - lastInputAt) / 1000) : 0;

export class ActivityMonitor {
  private lastInputAt = Date.now();

  constructor() {
    const mark = (): void => { this.lastInputAt = Date.now(); };
    for (const type of ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"]) {
      window.addEventListener(type, mark, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", mark);
    window.addEventListener("focus", mark);
  }

  idleSeconds(now = Date.now()): number {
    return pageIdleSeconds({
      now,
      lastInputAt: this.lastInputAt,
      focused: document.visibilityState === "visible" && document.hasFocus(),
    });
  }
}
