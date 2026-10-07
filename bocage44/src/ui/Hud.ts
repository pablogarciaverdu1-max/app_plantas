import { t, type TextKey } from './Localization';

/**
 * Minimal on-screen feedback: no crosshair, no health bar, no ammo counter.
 * A darkening vignette for wounds and fear, a brief line of text, the death screen.
 */
export class Hud {
  private readonly vignette: HTMLDivElement;
  private readonly flash: HTMLDivElement;
  private readonly line: HTMLDivElement;
  private readonly death: HTMLDivElement;
  private lineTimer = 0;
  private flashLevel = 0;

  constructor(onRetry: () => void) {
    this.vignette = this.div('hud-vignette');
    this.flash = this.div('hud-flash');
    this.line = this.div('hud-line');
    this.death = this.div('hud-death hidden');
    this.death.innerHTML = `<h2>${t('dead')}</h2><div class="cta">${t('retry')}</div>`;
    this.death.addEventListener('click', onRetry);
  }

  private div(cls: string): HTMLDivElement {
    const d = document.createElement('div');
    d.className = cls;
    document.body.appendChild(d);
    return d;
  }

  message(key: TextKey, seconds = 2.2): void {
    this.line.textContent = t(key);
    this.line.style.opacity = '1';
    this.lineTimer = seconds;
  }

  hurt(amount: number): void {
    this.flashLevel = Math.min(0.7, this.flashLevel + amount / 80);
  }

  update(dt: number, wound: number, suppression: number, bleeding: boolean, dead: boolean): void {
    this.lineTimer -= dt;
    if (this.lineTimer <= 0) this.line.style.opacity = '0';
    this.flashLevel = Math.max(0, this.flashLevel - dt * 1.5);
    const v = Math.min(0.92, wound * 0.75 + suppression * 0.45 + (bleeding ? 0.1 : 0));
    this.vignette.style.opacity = v.toFixed(3);
    this.flash.style.opacity = this.flashLevel.toFixed(3);
    this.death.classList.toggle('hidden', !dead);
  }
}
