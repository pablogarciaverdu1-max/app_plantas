import { test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const gameUrl = pathToFileURL(resolve('dist/index.html')).href;

interface TestApi {
  fps: number;
  hideOverlay(): void;
  pause(v: boolean): void;
  stepFrames(s: number): void;
  setTimeOfDay(p: number): void;
}

// Captures for visual review against the art bible. The loop is paused so the
// software renderer of the test machine is not saturated while capturing.
test('time-of-day screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${gameUrl}?test=1`);
  await page.waitForFunction(() => (window as unknown as { __game?: TestApi }).__game?.fps! > 0, null, { timeout: 60_000 });
  await page.evaluate(() => (window as unknown as { __game: TestApi }).__game.pause(true));
  await page.screenshot({ path: 'tests/e2e/shots/00-title.png' });
  await page.evaluate(() => (window as unknown as { __game: TestApi }).__game.hideOverlay());
  for (const p of [0, 0.5, 1]) {
    await page.evaluate((v) => {
      const g = (window as unknown as { __game: TestApi }).__game;
      g.setTimeOfDay(v);
      g.stepFrames(1 / 60);
    }, p);
    await page.screenshot({ path: `tests/e2e/shots/time-${Math.round(p * 100)}.png`, timeout: 60_000 });
  }
});
