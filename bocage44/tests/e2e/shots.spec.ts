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
}

async function shot(page: Page, name: string, setup: (g: TestApi) => void, frames = 0.1): Promise<void> {
  await page.evaluate(
    ({ src, frames }) => {
      const g = (window as unknown as { __game: TestApi }).__game;
      new Function('g', src)(g);
      g.stepFrames(frames);
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
});
