import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const files = (await readdir(new URL('examples/', root))).filter((f) => f.endsWith('.html'));

async function engineSource() {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const start = html.indexOf('function hairlineMount(');
  const end = html.indexOf('\n}\n', start) + 2;
  return html.slice(start, end);
}

test('there are examples', () => {
  expect(files.length).toBeGreaterThanOrEqual(4);
});

for (const file of files) {
  test(`${file} embeds the current engine and runs`, async ({ page }) => {
    const html = await readFile(new URL(`examples/${file}`, root), 'utf8');
    expect(html, 'run `npm run examples` after changing the engine').toContain(await engineSource());

    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/examples/${file}`);
    await expect(page.locator('#figure [data-i]').first()).toBeAttached();
    await page.click('#play');
    await expect(page.locator('#play')).toHaveText('Stop');
    await expect(page.locator('#figure g.on').first()).toBeAttached();
    expect(errors).toEqual([]);
  });
}
