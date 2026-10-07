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
overlay.addEventListener('click', () => {
  game.audio.start();
  game.input.requestLock();
});
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
    soldiers: () => game.enemies.soldiers.map((s) => ({ state: s.order.state, role: s.order.role, alive: s.alive, pos: s.body.position.toArray(), awareness: s.brain.awareness })),
    aim: (v: boolean) => (game.input.mouseRight = v),
    trigger: (v: boolean) => (game.input.mouseLeft = v),
    playerHealth: () => game.combat.health.value,
    setInvulnerable: (v: boolean) => (game.invulnerable = v),
    lookAt: (x: number, y: number, z: number) => {
      const e = game.camera.position;
      game.rig.yaw = Math.atan2(-(x - e.x), -(z - e.z));
      game.rig.pitch = Math.atan2(y - e.y, Math.hypot(x - e.x, z - e.z));
    },
    teleport: (x: number, y: number, z: number, yaw = 0) => {
      game.player.teleport(new THREE.Vector3(x, y, z));
      game.rig.yaw = yaw;
    },
  };
}
