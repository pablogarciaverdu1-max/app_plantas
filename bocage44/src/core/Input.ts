/** Keyboard and pointer-locked mouse state. */
export class Input {
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
      // Keep game keys (space, Alt...) from scrolling or opening browser menus while playing.
      if (this.locked && !e.ctrlKey && !e.metaKey && e.code !== 'Escape') e.preventDefault();
    });
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

  /** True once per physical key press; cleared when read. */
  consumePressed(code: string): boolean {
    return this.pressed.delete(code);
  }

  /** Drops queued presses (e.g. while the game is paused). */
  clearPressed(): void {
    this.pressed.clear();
  }

  /** Returns and clears the mouse movement accumulated since the last call. */
  consumeMouse(): [number, number] {
    const d: [number, number] = [this.mouseDX, this.mouseDY];
    this.mouseDX = this.mouseDY = 0;
    return d;
  }
}
