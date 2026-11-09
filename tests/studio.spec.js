import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { openStudio, figure, shortcut, stubFonts } from './helpers.js';

const PRESETS = ['keys', 'drawers', 'chart', 'silos', 'blank'];

test('every preset renders without errors', async ({ page }) => {
  const errors = await openStudio(page);
  for (const p of PRESETS) {
    await page.click(`[data-preset="${p}"]`);
    const fig = await figure(page);
    await expect(page.locator('#svg [data-i]')).toHaveCount(fig.parts.length);
    await expect(page.locator('#partList li')).toHaveCount(fig.parts.length);
    expect(await page.getAttribute('#svg', 'viewBox')).toMatch(/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
  }
  expect(errors).toEqual([]);
});

test('parts answer the pointer in preview', async ({ page }) => {
  await openStudio(page);
  await page.click('[data-preset="keys"]');
  const stage = await page.locator('#stage').boundingBox();
  await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2, { steps: 4 });
  await expect(page.locator('#svg g.on').first()).toBeAttached();
  await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height + 200, { steps: 4 });
  await expect(page.locator('#svg g.on')).toHaveCount(0);
});

test('play tour walks the figure and ends on its own', async ({ page }) => {
  await openStudio(page);
  await page.click('[data-preset="drawers"]');
  await page.click('#tourBtn');
  await expect(page.locator('#tourBtn')).toHaveText('Stop tour');
  await expect(page.locator('#svg g.on').first()).toBeAttached();
  await expect(page.locator('#tourBtn')).toHaveText('Play tour', { timeout: 10_000 });
});

test('dragging moves a part with the pointer and holds the view still', async ({ page }) => {
  await openStudio(page);
  await page.click('[data-preset="keys"]');
  await page.click('#modeEdit');
  const b = await page.locator('#svg [data-i="0"] polygon').first().boundingBox();
  const sx = Math.round(b.x + b.width / 2), sy = Math.round(b.y + b.height / 2);
  const view = await page.getAttribute('#svg', 'viewBox');

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx - 150, sy + 90, { steps: 12 });
  expect(await page.getAttribute('#svg', 'viewBox')).toBe(view);
  const moved = (await figure(page)).parts[0];

  // Holding the pointer still must not keep moving the part.
  await page.mouse.move(sx - 150, sy + 90, { steps: 3 });
  const held = (await figure(page)).parts[0];
  expect([held.x, held.y]).toEqual([moved.x, moved.y]);

  // The part lands where the inverse isometric projection of the pointer offset says.
  const expected = await page.evaluate(([dx, dy]) => {
    const m = document.getElementById('svg').getScreenCTM();
    const a = dx / m.a / (0.8660254 * 40), b = dy / m.d / (0.5 * 40);
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }, [-150, 90]);
  expect(Math.abs(moved.x - expected.x)).toBeLessThan(0.11);
  expect(Math.abs(moved.y - expected.y)).toBeLessThan(0.11);
  expect(moved.z).toBe(0);
  await page.mouse.up();

  await shortcut(page, 'Control+z');
  const undone = (await figure(page)).parts[0];
  expect([undone.x, undone.y]).toEqual([0, 0]);
});

test('shift-drag raises a part', async ({ page }) => {
  await openStudio(page);
  await page.click('[data-preset="blank"]');
  await page.click('#modeEdit');
  const b = await page.locator('#svg [data-i="0"] polygon').first().boundingBox();
  const sx = Math.round(b.x + b.width / 2), sy = Math.round(b.y + b.height / 2);
  await page.mouse.move(sx, sy);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(sx, sy - 60, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  const p = (await figure(page)).parts[0];
  expect(p.z).toBeGreaterThan(0.3);
  expect([p.x, p.y]).toEqual([0, 0]);
});

test('keys nudge the selected part; a focused slider keeps its arrows', async ({ page }) => {
  await openStudio(page);
  await page.click('[data-preset="keys"]');
  await page.click('#partList li:nth-child(3) button');
  await expect(page.locator('#tag')).toHaveText('EDIT');
  const x0 = (await figure(page)).parts[2].x;

  await page.keyboard.press('ArrowRight');
  expect((await figure(page)).parts[2].x).toBeCloseTo(x0 + 0.1, 5);
  await page.keyboard.press('Shift+ArrowRight');
  expect((await figure(page)).parts[2].x).toBeCloseTo(x0 + 1.1, 5);
  await page.keyboard.press('PageUp');
  expect((await figure(page)).parts[2].z).toBeCloseTo(0.1, 5);
  await expect(page.locator('#p-x')).toHaveValue(String(Math.round((x0 + 1.1) * 100) / 100));

  const amount = Number(await page.inputValue('#m-amount'));
  await page.focus('#m-amount');
  await page.keyboard.press('ArrowRight');
  expect(Number(await page.inputValue('#m-amount'))).toBeGreaterThan(amount);
  expect((await figure(page)).parts[2].x).toBeCloseTo(x0 + 1.1, 5);

  await page.click('#svg', { position: { x: 5, y: 5 } });
  await page.click('#partList li:nth-child(3) button');
  await page.keyboard.press('Escape');
  await expect(page.locator('#partList button.sel')).toHaveCount(0);
});

test('add, duplicate, repeat and remove parts, each its own undo step', async ({ page }) => {
  await openStudio(page);
  await page.click('[data-preset="blank"]');
  const count = async () => (await figure(page)).parts.length;
  expect(await count()).toBe(1);

  await page.click('#addBox');
  expect(await count()).toBe(2);
  await page.click('#props button:has-text("Duplicate")');
  expect(await count()).toBe(3);
  await page.fill('#repCount', '4');
  await page.click('#repGo');
  expect(await count()).toBe(7);
  await page.click('#props button:has-text("Remove")');
  expect(await count()).toBe(6);
  await page.click('#addCyl');
  const fig = await figure(page);
  expect(fig.parts.at(-1).kind).toBe('cyl');

  for (const n of [6, 7, 3, 2, 1]) {
    await shortcut(page, 'Control+z');
    expect(await count()).toBe(n);
  }
  await shortcut(page, 'Control+Shift+z');
  expect(await count()).toBe(2);
  await page.click('#redoBtn');
  expect(await count()).toBe(3);
});

test('editing a part in the panel changes the figure', async ({ page }) => {
  await openStudio(page);
  await page.click('[data-preset="blank"]');
  await page.click('#partList li:nth-child(1) button');
  await page.fill('#p-h', '2.5');
  await page.click('#props .seg button:has-text("Cylinder")');
  await page.uncheck('#p-moves');
  const p = (await figure(page)).parts[0];
  expect(p).toMatchObject({ h: 2.5, kind: 'cyl', still: true });
  await expect(page.locator('#svg [data-i="0"] ellipse')).toHaveCount(1);
});

test('motion controls update the figure', async ({ page }) => {
  await openStudio(page);
  await page.click('[data-preset="blank"]');
  await page.selectOption('#m-pick', 'across');
  await page.selectOption('#m-effect', 'grow');
  await page.selectOption('#m-move', 'ease');
  await expect(page.locator('#m-stiff')).toBeDisabled();
  await page.locator('#m-ripple').fill('120');
  const m = (await figure(page)).motion;
  expect(m).toMatchObject({ pick: 'across', effect: 'grow', move: 'ease', ripple: 120 });
});

test('the figure survives a reload', async ({ page }) => {
  await openStudio(page);
  await page.click('[data-preset="silos"]');
  await page.fill('#figName', 'my silos');
  const before = await figure(page);
  await page.reload();
  await expect(page.locator('#figName')).toHaveValue('my silos');
  const after = await figure(page);
  expect(after.parts.map((p) => [p.kind, p.x, p.h, !!p.still])).toEqual(before.parts.map((p) => [p.kind, p.x, p.h, !!p.still]));
  expect(after.motion).toEqual(before.motion);
});

test('a corrupt autosave falls back to a preset', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await stubFonts(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('hairline-studio-v1', '{"parts": 5}'));
  await page.reload();
  await expect(page.locator('#figName')).toHaveValue('keyboard');
  expect(errors).toEqual([]);
});

test('save writes a project that open reads back', async ({ page }) => {
  await openStudio(page);
  await page.click('[data-preset="drawers"]');
  await page.fill('#figName', 'cabinet');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#saveBtn')]);
  expect(download.suggestedFilename()).toBe('cabinet.hairline.json');
  const saved = JSON.parse(await readFile(await download.path(), 'utf8'));

  await page.click('[data-preset="keys"]');
  await page.setInputFiles('#openFile', { name: 'cabinet.hairline.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await expect(page.locator('#status')).toContainText('Opened cabinet.hairline.json');
  const fig = await figure(page);
  expect(fig.name).toBe('cabinet');
  expect(fig.motion).toEqual(saved.motion);
  expect(fig.parts.map((p) => [p.x, p.y, p.z, p.w, p.d, p.h])).toEqual(saved.parts.map((p) => [p.x, p.y, p.z, p.w, p.d, p.h]));
});

test('open clamps values a hand-edited file pushes out of range', async ({ page }) => {
  await openStudio(page);
  const raw = {
    name: 'x'.repeat(200),
    motion: { pick: 'nope', effect: 'grow', move: 'spring', amount: -4, reach: 99, stiff: 50, bounce: 3, ripple: 'a lot' },
    parts: [{ kind: 'box', x: 'NaN', y: 1e12, z: 0, w: -1, d: 0, h: 2 }, null, 7],
  };
  await page.setInputFiles('#openFile', { name: 'odd.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(raw)) });
  await expect(page.locator('#status')).toContainText('Opened odd.json');
  const fig = await figure(page);
  expect(fig.name).toHaveLength(80);
  expect(fig.motion).toMatchObject({ pick: 'pointer', effect: 'grow', amount: 0.1, reach: 6, stiff: 0.3, bounce: 0.95, ripple: 0 });
  expect(fig.parts).toHaveLength(1);
  expect(fig.parts[0]).toMatchObject({ x: 0, y: 1000, w: 0.05, d: 0.05, h: 2 });
});

test('open rejects a file that is not a figure', async ({ page }) => {
  await openStudio(page);
  const before = await figure(page);
  await page.setInputFiles('#openFile', { name: 'notes.html', mimeType: 'text/html', buffer: Buffer.from('<p>hello</p>') });
  await expect(page.locator('#status')).toContainText('isn’t a Hairline Studio project');
  expect((await figure(page)).name).toBe(before.name);
});

test('export makes a standalone page that runs and opens again', async ({ page, browser }) => {
  await openStudio(page);
  await page.click('[data-preset="chart"]');
  await page.fill('#figName', 'Sales </script> & "growth"');
  await page.click('#exportBtn');
  await expect(page.locator('#exportPanel')).toBeVisible();
  await expect(page.locator('#fileName')).toHaveText('hairline-sales-script-growth.html');
  const html = await page.inputValue('#code');
  expect(html).not.toContain('</script> &');

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#downloadBtn')]);
  expect(download.suggestedFilename()).toBe('hairline-sales-script-growth.html');
  expect(await readFile(await download.path(), 'utf8')).toBe(html);

  // The file runs on its own, with no network and no studio.
  const ctx = await browser.newContext();
  const out = await ctx.newPage();
  const errors = [];
  out.on('pageerror', (e) => errors.push(e.message));
  await out.route('**/*', (r) => r.abort());
  await out.setContent(html);
  await expect(out.locator('h1')).toHaveText('Sales </script> & "growth"');
  await expect(out.locator('#figure [data-i]')).toHaveCount(7);
  const box = await out.locator('#figure').boundingBox();
  await out.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await expect(out.locator('#figure g.on').first()).toBeAttached();
  await out.click('#theme');
  await expect(out.locator('html')).toHaveAttribute('data-theme', 'light');
  await out.click('#play');
  await expect(out.locator('#play')).toHaveText('Stop');
  expect(errors).toEqual([]);
  await ctx.close();

  // And the studio can open the exported file to keep editing.
  await page.click('[data-preset="keys"]');
  await page.setInputFiles('#openFile', { name: 'chart.html', mimeType: 'text/html', buffer: Buffer.from(html) });
  await expect(page.locator('#status')).toContainText('Opened chart.html');
  const fig = await figure(page);
  expect(fig.name).toBe('Sales </script> & "growth"');
  expect(fig.parts).toHaveLength(7);
  expect(fig.motion.effect).toBe('grow');
});

test('fits a phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStudio(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
