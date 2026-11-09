// Regenerates examples/ by exporting each preset from the studio, exactly as the Export button does.
// Usage: npm run examples          write the files
//        npm run check:examples    exit 1 if any file is out of date (used in CI)
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const check = process.argv.includes('--check');
const presets = ['keys', 'drawers', 'chart', 'silos'];
const slug = (s) => (s || 'figure').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'figure';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
await page.goto(new URL('index.html', root).href);
await page.evaluate(() => localStorage.clear());
await page.reload();

const stale = [];
for (const preset of presets) {
  await page.click(`[data-preset="${preset}"]`);
  const { name, html } = await page.evaluate(() => ({ name: window.__studio.fig.name, html: window.__studio.buildExport() }));
  const rel = `examples/hairline-${slug(name)}.html`;
  const file = new URL(rel, root);
  const current = await readFile(file, 'utf8').catch(() => null);
  if (current === html) continue;
  stale.push(rel);
  if (!check) await writeFile(file, html);
}
await browser.close();

if (check && stale.length) {
  console.error(`Out of date: ${stale.join(', ')}\nRun \`npm run examples\` and commit the result.`);
  process.exit(1);
}
console.log(stale.length ? `${check ? 'Out of date' : 'Wrote'}: ${stale.join(', ')}` : 'Examples are up to date.');
