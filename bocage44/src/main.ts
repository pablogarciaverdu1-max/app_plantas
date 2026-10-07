import * as THREE from 'three';
import { Game } from './core/Game';
import { t } from './ui/Localization';

const container = document.getElementById('app')!;
const game = new Game(container);

const overlay = document.createElement('div');
overlay.className = 'overlay';
overlay.innerHTML = `
  <h1>${t('title')}</h1>
  <div class="sub">${t('subtitle')}</div>
  <div class="cta">${t('clickToPlay')}</div>
  <div class="note">${t('phaseNote')} · ${t('controlsHint')}</div>`;
document.body.appendChild(overlay);

// Browsers require a click before capturing the mouse or starting audio.
overlay.addEventListener('click', () => game.input.requestLock());
document.addEventListener('pointerlockchange', () => {
  overlay.classList.toggle('hidden', game.input.locked);
});

game.start();

// Test hooks for Playwright, only with ?test=1 in the URL.
if (new URLSearchParams(location.search).get('test') === '1') {
  (window as unknown as { __game: unknown }).__game = {
    get fps() {
      return game.fps;
    },
    get timeOfDay() {
      return game.timeOfDay;
    },
    setTimeOfDay: (p: number) => game.setTimeOfDay(p),
    pause: (v: boolean) => (game.paused = v),
    stepFrames: (seconds: number) => game.stepFrames(seconds),
    hideOverlay: () => overlay.classList.add('hidden'),
    cameraPosition: () => game.camera.position.toArray(),
    playerPosition: () => game.player.position.toArray(),
    playerStance: () => game.player.stance,
    teleport: (x: number, y: number, z: number, yaw = 0) => {
      game.player.teleport(new THREE.Vector3(x, y, z));
      game.rig.yaw = yaw;
    },
  };
}
