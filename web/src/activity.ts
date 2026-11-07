/**
 * Turns browser signals into the single number the shared tracker consumes:
 * seconds since the last input.
 *
 * Two sources, best first:
 *   - "system": the Idle Detection API (Chromium, needs permission). Covers
 *     every app on the machine, like the desktop version does.
 *   - "page": input events on this page. When the page isn't focused we can't
 *     see input, so we assume you're working somewhere else.
 *
 * Neither source ever sees what you type or what's on screen.
 */

export type ActivitySource = "system" | "page";

export interface PageSignals {
  now: number;
  /** Timestamp of the last pointer/key/scroll/touch event on this page. */
  lastInputAt: number;
  /** `document.hasFocus()` and the page is visible. */
  focused: boolean;
}

export interface SystemSignals {
  /** `IdleDetector.userState`. */
  userState: "active" | "idle" | null;
  /** `IdleDetector.screenState`. */
  screenState: "locked" | "unlocked" | null;
  /** The idle threshold the detector was started with. */
  thresholdSeconds: number;
}

/**
 * Idle seconds from page events.
 *
 * @returns Seconds since last input while focused; 0 while unfocused.
 */
export const pageIdleSeconds = ({ now, lastInputAt, focused }: PageSignals): number =>
  focused ? Math.max(0, (now - lastInputAt) / 1000) : 0;

/**
 * Idle seconds from the Idle Detection API. The API only reports
 * active/idle against its threshold, so idle maps to exactly that threshold.
 */
export const systemIdleSeconds = ({ userState, screenState, thresholdSeconds }: SystemSignals): number =>
  userState === "idle" || screenState === "locked" ? thresholdSeconds : 0;

/** Minimal shape of the Idle Detection API, which TypeScript's DOM lib lacks. */
interface IdleDetectorLike extends EventTarget {
  userState: "active" | "idle" | null;
  screenState: "locked" | "unlocked" | null;
  start(options: { threshold: number; signal?: AbortSignal }): Promise<void>;
}
interface IdleDetectorCtor {
  new (): IdleDetectorLike;
  requestPermission(): Promise<"granted" | "denied">;
}

const idleDetectorCtor = (): IdleDetectorCtor | undefined =>
  (globalThis as unknown as { IdleDetector?: IdleDetectorCtor }).IdleDetector;

export const systemIdleSupported = (): boolean => Boolean(idleDetectorCtor());

/** Live activity monitor for the browser. */
export class ActivityMonitor {
  private lastInputAt = Date.now();
  private detector: IdleDetectorLike | null = null;
  private abort: AbortController | null = null;
  private thresholdSeconds = 60;

  constructor() {
    const mark = (): void => {
      this.lastInputAt = Date.now();
    };
    for (const type of ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"]) {
      window.addEventListener(type, mark, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", mark);
    window.addEventListener("focus", mark);
  }

  get source(): ActivitySource {
    return this.detector ? "system" : "page";
  }

  /**
   * Ask for Idle Detection permission and start it. Must be called from a
   * user gesture.
   *
   * @returns True when system-wide detection is running.
   */
  async enableSystem(thresholdSeconds: number): Promise<boolean> {
    const Ctor = idleDetectorCtor();
    if (!Ctor) return false;
    try {
      if ((await Ctor.requestPermission()) !== "granted") return false;
      return await this.startSystem(thresholdSeconds);
    } catch {
      return false;
    }
  }

  /** Start Idle Detection if permission was already granted earlier. */
  async resumeSystem(thresholdSeconds: number): Promise<boolean> {
    if (!idleDetectorCtor()) return false;
    try {
      const status = await navigator.permissions.query({ name: "idle-detection" as PermissionName });
      if (status.state !== "granted") return false;
      return await this.startSystem(thresholdSeconds);
    } catch {
      return false;
    }
  }

  disableSystem(): void {
    this.abort?.abort();
    this.abort = null;
    this.detector = null;
  }

  private async startSystem(thresholdSeconds: number): Promise<boolean> {
    const Ctor = idleDetectorCtor();
    if (!Ctor) return false;
    this.disableSystem();
    // The API rejects thresholds under 60 seconds.
    this.thresholdSeconds = Math.max(60, thresholdSeconds);
    const detector = new Ctor();
    const abort = new AbortController();
    try {
      await detector.start({ threshold: this.thresholdSeconds * 1000, signal: abort.signal });
    } catch {
      return false;
    }
    this.detector = detector;
    this.abort = abort;
    return true;
  }

  /**
   * The idle threshold the tracker should use. Idle Detection can't report
   * idle sooner than 60 seconds, so shorter thresholds are raised to match.
   */
  effectiveThreshold(configured: number): number {
    return this.detector ? Math.max(this.thresholdSeconds, configured) : configured;
  }

  /** Current idle seconds from the best available source. */

  idleSeconds(now = Date.now()): number {
    if (this.detector) {
      return systemIdleSeconds({
        userState: this.detector.userState,
        screenState: this.detector.screenState,
        thresholdSeconds: this.thresholdSeconds,
      });
    }
    return pageIdleSeconds({
      now,
      lastInputAt: this.lastInputAt,
      focused: document.visibilityState === "visible" && document.hasFocus(),
    });
  }
}
