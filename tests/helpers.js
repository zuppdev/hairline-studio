import { expect } from '@playwright/test';

/** Serve an empty stylesheet for Google Fonts so tests never depend on the network. */
export async function stubFonts(page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
}

/** Open the studio with an empty autosave. Returns a live array of page errors. */
export async function openStudio(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await stubFonts(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#svg [data-i]').first()).toBeAttached();
  return errors;
}

/** A plain copy of the figure the studio is editing. */
export function figure(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(window.__studio.fig)));
}

/** Press the undo or redo shortcut with focus outside any text field. */
export async function shortcut(page, key) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press(key);
}
