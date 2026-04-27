export class ProjectConcurrencyGate {
  private running = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number = 1) {}

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise(resolve => this.waiters.push(resolve));
  }

  release(): void {
    if (this.waiters.length > 0) {
      // Hand slot to next waiter — running count stays the same
      const next = this.waiters.shift()!;
      next();
    } else {
      this.running--;
    }
  }

  /** Resolve all waiting acquires so they can exit (used during cancel). */
  drain(): void {
    const pending = [...this.waiters];
    this.waiters.length = 0;
    this.running = 0;
    pending.forEach(resolve => resolve());
  }

  get activeCount(): number { return this.running; }
  get waitingCount(): number { return this.waiters.length; }
  get maxSlots(): number { return this.maxConcurrent; }
}
