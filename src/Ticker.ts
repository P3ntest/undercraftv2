export class Ticker {
  running = false;

  constructor(private callback: (delta: number) => void) {}

  start() {
    this.running = true;
    this.lastTick = performance.now();
    this.tick();
  }

  stop() {
    this.running = false;
  }

  lastTick = performance.now();

  tick() {
    if (!this.running) {
      return;
    }
    const now = performance.now();
    const delta = now - this.lastTick;
    this.callback(delta);
    this.lastTick = now;
    requestAnimationFrame(() => this.tick());
  }
}
