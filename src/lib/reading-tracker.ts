export interface ReadingTrackerOptions {
  onAccumulate?: (duration: number) => void;
  accumulateInterval?: number;
}

export class ReadingTracker {
  private startTime: number | null = null;
  private accumulated: number = 0;
  private accumulateInterval: number;
  private onAccumulate?: (duration: number) => void;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isTracking = false;
  private boundVisibilityHandler: () => void;

  constructor(options: ReadingTrackerOptions = {}) {
    this.accumulateInterval = options.accumulateInterval ?? 30000;
    this.onAccumulate = options.onAccumulate;

    this.boundVisibilityHandler = () => {
      if (document.visibilityState === "visible") {
        this.resume();
      } else {
        this.pause();
      }
    };

    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", this.boundVisibilityHandler);
    }
  }

  start(): void {
    if (this.isTracking) return;

    this.isTracking = true;
    this.startTime = Date.now();

    this.intervalId = setInterval(() => {
      this.accumulate();
    }, this.accumulateInterval);
  }

  pause(): number {
    if (!this.isTracking || this.startTime === null) {
      return 0;
    }

    const elapsed = (Date.now() - this.startTime) / 1000;
    this.accumulated += elapsed;
    this.startTime = null;
    this.isTracking = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    return elapsed;
  }

  resume(): void {
    if (this.isTracking) return;

    this.isTracking = true;
    this.startTime = Date.now();

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.accumulate();
    }, this.accumulateInterval);
  }

  getAccumulated(): number {
    let total = this.accumulated;
    if (this.isTracking && this.startTime !== null) {
      total += (Date.now() - this.startTime) / 1000;
    }
    return Math.floor(total);
  }

  reset(): void {
    this.accumulated = 0;
    this.startTime = this.isTracking ? Date.now() : null;
  }

  setAccumulated(duration: number): void {
    this.accumulated = duration;
    this.startTime = this.isTracking ? Date.now() : null;
  }

  private accumulate(): void {
    if (!this.isTracking || this.startTime === null) return;

    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;
    this.accumulated += elapsed;
    this.startTime = now;

    this.onAccumulate?.(Math.floor(this.accumulated));
  }

  destroy(): void {
    this.pause();
    this.onAccumulate = undefined;
    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", this.boundVisibilityHandler);
    }
  }
}
