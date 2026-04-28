export type GlobalGateState = { running: number; max: number; waiting: number };

export class ProjectConcurrencyGate {
  static readonly MAX_CONCURRENT = 4;

  private static readonly _globalMax = Math.min(
    Number(process.env.SPECWRIGHT_GLOBAL_CLAUDE_CONCURRENCY ?? 2),
    ProjectConcurrencyGate.MAX_CONCURRENT
  );
  private static _globalRunning = 0;
  private static _globalWaiters: Array<() => void> = [];
  private static _queuedListeners: Set<(state: GlobalGateState) => void> = new Set();

  private readonly maxConcurrent: number;
  private running = 0;
  private readonly waiters: Array<() => void> = [];
  private globalHeld = 0;

  constructor(maxConcurrent: number = 2) {
    this.maxConcurrent = Math.min(maxConcurrent, ProjectConcurrencyGate.MAX_CONCURRENT);
  }

  async acquire(): Promise<void> {
    if (ProjectConcurrencyGate._globalRunning < ProjectConcurrencyGate._globalMax) {
      ProjectConcurrencyGate._globalRunning++;
    } else {
      ProjectConcurrencyGate.notifyQueued();
      await new Promise<void>(res => ProjectConcurrencyGate._globalWaiters.push(res));
      // Slot was handed off by releaseGlobal — counter NOT incremented to keep cap invariant.
    }
    this.globalHeld++;

    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise<void>(res => this.waiters.push(res));
  }

  release(): void {
    if (this.waiters.length > 0) {
      const next = this.waiters.shift()!;
      next();
    } else {
      this.running--;
    }
    if (this.globalHeld > 0) {
      this.globalHeld--;
      ProjectConcurrencyGate.releaseGlobal();
    }
  }

  /** Resolve all waiting acquires and release all held global slots (used during cancel). */
  drain(): void {
    const pending = [...this.waiters];
    this.waiters.length = 0;
    this.running = 0;
    pending.forEach(r => r());
    while (this.globalHeld > 0) {
      this.globalHeld--;
      ProjectConcurrencyGate.releaseGlobal();
    }
  }

  static async acquireGlobalOnly(): Promise<void> {
    if (this._globalRunning < this._globalMax) {
      this._globalRunning++;
      return;
    }
    this.notifyQueued();
    await new Promise<void>(res => this._globalWaiters.push(res));
    // Slot was handed off by releaseGlobal — counter NOT incremented to keep cap invariant.
  }

  static releaseGlobalOnly(): void {
    this.releaseGlobal();
  }

  private static releaseGlobal(): void {
    if (this._globalWaiters.length > 0) {
      // Hand off slot to the next waiter without changing the counter.
      this._globalWaiters.shift()!();
    } else {
      this._globalRunning--;
    }
  }

  static onQueued(fn: (s: GlobalGateState) => void): () => void {
    this._queuedListeners.add(fn);
    return () => this._queuedListeners.delete(fn);
  }

  private static notifyQueued(): void {
    const state: GlobalGateState = {
      running: this._globalRunning,
      max: this._globalMax,
      waiting: this._globalWaiters.length + 1,
    };
    this._queuedListeners.forEach(fn => { try { fn(state); } catch { /* swallow */ } });
  }

  static resetForTests(): void {
    this._globalRunning = 0;
    this._globalWaiters.length = 0;
    this._queuedListeners.clear();
  }

  get activeCount(): number { return this.running; }
  get waitingCount(): number { return this.waiters.length; }
  get maxSlots(): number { return this.maxConcurrent; }
  static get globalActive(): number { return this._globalRunning; }
  static get globalWaiting(): number { return this._globalWaiters.length; }
  static get globalMax(): number { return this._globalMax; }
}
