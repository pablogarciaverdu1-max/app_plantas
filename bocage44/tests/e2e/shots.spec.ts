import { test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const gameUrl = pathToFileURL(resolve('dist/index.html')).href;

interface TestApi {
  fps: number;
  hideOverlay(): void;
  pause(v: boolean): void;
  stepFrames(s: number): void;
  setTimeOfDay(p: number): void;
  teleport(x: number, y: number, z: number, yaw?: number): void;
  lookAt(x: number, y: number, z: number): void;
  aim(v: boolean): void;
  trigger(v: boolean): void;
  setInvulnerable(v: boolean): void;
  soldiers(): { state: string; alive: boolean; pos: number[] }[];
}

async function shot(page: Page, name: string, setup: (g: TestApi) => void, frames = 0.1): Promise<void> {
  await page.evaluate(
    ({ src, frames }) => {
      const g = (window as unknown as { __game: TestApi }).__game;
      new Function('g', src)(g);
      // The loop simulates at most 0.25 s per call, so advance in slices.
      for (let t = 0; t < frames; t += 0.2) g.stepFrames(Math.min(0.2, frames - t));
    },
    { src: `(${setup.toString()})(g)`, frames },
  );
  await page.screenshot({ path: `tests/e2e/shots/${name}.png`, timeout: 60_000 });
}

// Captures for visual review against the art bible. The loop is paused so the
// software renderer of the test machine is not saturated while capturing.
test('screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${gameUrl}?test=1`);
  await page.waitForFunction(() => (window as unknown as { __game?: TestApi }).__game?.fps! > 0, null, { timeout: 60_000 });
  await page.evaluate(() => (window as unknown as { __game: TestApi }).__game.pause(true));
  await page.screenshot({ path: 'tests/e2e/shots/00-title.png' });
  await page.evaluate(() => (window as unknown as { __game: TestApi }).__game.hideOverlay());
  for (const p of [0, 0.5, 1]) {
    await shot(page, `time-${Math.round(p * 100)}`, new Function('g', `g.setTimeOfDay(${p})`) as (g: TestApi) => void);
  }
  await shot(page, 'course-walls', (g) => { g.setTimeOfDay(1); g.teleport(-3, 0.1, 0, 0); });
  await shot(page, 'course-ramps', (g) => { g.teleport(-5, 0.1, -9, 0); });
  await shot(page, 'course-tunnels', (g) => { g.teleport(6, 0.1, -20, 0); });
  // Combat: hip view, then on the sights, looking at the patrol behind the field wall.
  await shot(page, 'combat-hip', (g) => { g.setInvulnerable(true); g.teleport(-2, 0.1, -40, 0); g.lookAt(-4, 0.6, -82); }, 0.5);
  await shot(page, 'combat-ads', (g) => { g.aim(true); g.lookAt(-4, 0.6, -82); }, 0.6);
  // Fire a shot and let the enemy react for a few seconds.
  await shot(page, 'combat-fire', (g) => { g.trigger(true); }, 0.05);
  await shot(page, 'combat-react', (g) => { g.trigger(false); g.aim(false); }, 6);
  const soldiers = await page.evaluate(() => (window as unknown as { __game: TestApi }).__game.soldiers());
  console.log(JSON.stringify(soldiers.map((s) => s.state)));
});
