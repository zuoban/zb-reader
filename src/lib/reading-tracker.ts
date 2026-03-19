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
  
  // 用户活跃度检测相关
  private lastActivityTime: number = Date.now();
  private activityTimeout: number = 3 * 60 * 1000; // 3分钟
  private activityCheckInterval: ReturnType<typeof setInterval> | null = null;
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;
  private activityListeners: Array<{ event: string; handler: EventListener }> = [];

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

  private setupActivityListeners(): void {
    if (typeof window === "undefined") return;

    const events = ["mousemove", "keydown", "scroll", "touchstart"];
    const throttledHandler = () => this.handleActivity();

    events.forEach((event) => {
      const handler = throttledHandler as EventListener;
      document.addEventListener(event, handler, { passive: true });
      this.activityListeners.push({ event, handler });
    });
  }

  private handleActivity(): void {
    if (this.throttleTimer) return;

    this.lastActivityTime = Date.now();

    // 如果之前因无活动暂停，现在恢复
    if (!this.isTracking && this.intervalId === null) {
      this.resume();
    }

    this.throttleTimer = setTimeout(() => {
      this.throttleTimer = null;
    }, 1000);
  }

  private checkActivity(): void {
    if (!this.isTracking) return;

    const now = Date.now();
    const timeSinceActivity = now - this.lastActivityTime;

    if (timeSinceActivity > this.activityTimeout) {
      this.pause();
    }
  }

  private removeActivityListeners(): void {
    this.activityListeners.forEach(({ event, handler }) => {
      document.removeEventListener(event, handler);
    });
    this.activityListeners = [];

    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
  }

  start(): void {
    if (this.isTracking) return;

    this.isTracking = true;
    this.startTime = Date.now();
    this.lastActivityTime = Date.now();

    this.intervalId = setInterval(() => {
      this.accumulate();
    }, this.accumulateInterval);

    this.activityCheckInterval = setInterval(() => {
      this.checkActivity();
    }, 30000);

    this.setupActivityListeners();
  }

  pause(): number {
    if (!this.isTracking || this.startTime === null) {
      return 0;
    }

    const elapsed = (Date.now() - this.startTime) / 1000;
    const cappedElapsed = Math.min(elapsed, 300);
    this.accumulated += cappedElapsed;
    this.startTime = null;
    this.isTracking = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.activityCheckInterval !== null) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    return cappedElapsed;
  }

  resume(): void {
    if (this.isTracking) return;

    this.isTracking = true;
    this.startTime = Date.now();
    this.lastActivityTime = Date.now();

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.accumulate();
    }, this.accumulateInterval);

    if (this.activityCheckInterval !== null) {
      clearInterval(this.activityCheckInterval);
    }

    this.activityCheckInterval = setInterval(() => {
      this.checkActivity();
    }, 30000);

    if (this.activityListeners.length === 0) {
      this.setupActivityListeners();
    }
  }

  getAccumulated(): number {
    let total = this.accumulated;
    if (this.isTracking && this.startTime !== null) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      total += Math.min(elapsed, 300);
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
    const cappedElapsed = Math.min(elapsed, 300);
    
    this.accumulated += cappedElapsed;
    this.startTime = now;

    this.onAccumulate?.(Math.floor(this.accumulated));
  }

  destroy(): void {
    this.pause();
    this.removeActivityListeners();
    this.onAccumulate = undefined;
    
    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", this.boundVisibilityHandler);
    }
  }
}
