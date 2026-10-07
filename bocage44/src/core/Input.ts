/** Keyboard and pointer-locked mouse state. */
export class Input {
  private readonly keys = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
  }

  get locked(): boolean {
    return document.pointerLockElement === this.element;
  }

  requestLock(): void {
    // Some browsers return a promise that rejects when the request is refused; ignore it.
    const result = this.element.requestPointerLock() as unknown;
    if (result instanceof Promise) result.catch(() => undefined);
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** Returns and clears the mouse movement accumulated since the last call. */
  consumeMouse(): [number, number] {
    const d: [number, number] = [this.mouseDX, this.mouseDY];
    this.mouseDX = this.mouseDY = 0;
    return d;
  }
}
