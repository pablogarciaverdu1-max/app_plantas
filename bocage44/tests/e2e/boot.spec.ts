import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const gameUrl = pathToFileURL(resolve('dist/index.html')).href;

test('opens from file:// with no console errors and no network requests', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) requests.push(r.url());
  });

  await page.goto(`${gameUrl}?test=1`);
  await expect(page.locator('.overlay h1')).toHaveText('Bocage 44');
  await page.waitForFunction(() => (window as unknown as { __game?: { fps: number } }).__game?.fps! > 0, null, { timeout: 30_000 });

  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});

test('renders a lit scene, not a blank canvas', async ({ page }) => {
  await page.goto(`${gameUrl}?test=1`);
  await page.waitForFunction(() => (window as unknown as { __game?: { fps: number } }).__game?.fps! > 0, null, { timeout: 30_000 });
  await page.evaluate(() => {
    const g = (window as unknown as { __game: { hideOverlay(): void; setTimeOfDay(p: number): void } }).__game;
    g.hideOverlay();
    g.setTimeOfDay(1);
  });
  await page.waitForTimeout(500);
  const shot = await page.locator('canvas').screenshot();
  // A uniform image compresses to almost nothing; a textured scene does not.
  expect(shot.byteLength).toBeGreaterThan(30_000);
});
