import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { openStudio } from './helpers.js';

// These tests drive hairlineMount() directly, the same function every exported file embeds.

test('engine source uses ES5 syntax only, so exports run anywhere', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const start = html.indexOf('function hairlineMount(');
  const src = html.slice(start, html.indexOf('\n}\n', start));
  expect(start).toBeGreaterThan(0);
  const banned = [
    [/\b(let|const|class)\s+[A-Za-z_$]/, 'let/const/class'],
    [/=>/, 'arrow function'],
    [/`/, 'template literal'],
    [/\.\.\.[A-Za-z_$[(]/, 'spread or rest'],
    [/\basync\s+function\b|\bawait\s/, 'async/await'],
  ];
  for (const [re, what] of banned) expect(src, `engine uses ${what}`).not.toMatch(re);
});

test('draws parts back to front, including long parts', async ({ page }) => {
  await openStudio(page);
  const order = await page.evaluate(async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'width:500px;height:400px');
    document.body.appendChild(svg);
    // A long, low rail (part 0) in front of a tall box (part 1) at its far end.
    // Sorting by centre would draw the box last and paint it over the rail.
    const fig = {
      name: 't', plate: false,
      motion: { pick: 'pointer', effect: 'lift', amount: 1, reach: 1, move: 'snap', stiff: 0.1, bounce: 0.5, ripple: 0 },
      parts: [
        { kind: 'box', x: 0, y: 1.1, z: 0, w: 10, d: 0.6, h: 1 },
        { kind: 'box', x: 9, y: 0, z: 0, w: 1, d: 1, h: 3 },
      ],
    };
    const api = hairlineMount(svg, fig, { mode: 'edit' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const o = api.order();
    api.destroy();
    svg.remove();
    return o;
  });
  expect(order).toEqual([1, 0]);
});

test('stacked parts: a drawer that slides out stays under the one above it', async ({ page }) => {
  await openStudio(page);
  const order = await page.evaluate(async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'width:500px;height:400px');
    document.body.appendChild(svg);
    const fig = {
      name: 't', plate: false,
      motion: { pick: 'pointer', effect: 'lift', amount: 1, reach: 1, move: 'snap', stiff: 0.1, bounce: 0.5, ripple: 0 },
      parts: [
        { kind: 'box', x: 0, y: 0, z: 0.9, w: 2.6, d: 2.2, h: 0.82 }, // upper drawer, closed
        { kind: 'box', x: 0, y: 1.6, z: 0, w: 2.6, d: 2.2, h: 0.82 }, // lower drawer, pulled out
      ],
    };
    const api = hairlineMount(svg, fig, { mode: 'edit' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const o = api.order();
    api.destroy();
    svg.remove();
    return o;
  });
  expect(order).toEqual([1, 0]);
});

test('motion runs at the same speed at 60, 120 and 240 Hz', async ({ page }) => {
  await openStudio(page);
  const tops = await page.evaluate(() => {
    const fig = {
      name: 't', plate: false,
      motion: { pick: 'pointer', effect: 'lift', amount: 2, reach: 2, move: 'spring', stiff: 0.08, bounce: 0.5, ripple: 0 },
      parts: [{ kind: 'box', x: 0, y: 0, z: 0, w: 1, d: 1, h: 1 }],
    };
    const realRAF = window.requestAnimationFrame;
    const out = {};
    for (const hz of [60, 120, 240]) {
      let queue = [];
      window.requestAnimationFrame = (cb) => queue.push(cb);
      const run = (t) => { const q = queue; queue = []; q.forEach((cb) => cb(t)); };
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('style', 'position:fixed;left:0;top:0;width:500px;height:400px');
      document.body.appendChild(svg);
      const api = hairlineMount(svg, fig, { intensity: 1 });
      run(1000);
      // Point at the top centre of the box: P(0.5, 0.5, 1) = (0, -20) in figure units.
      const pt = new DOMPoint(0, -20).matrixTransform(svg.getScreenCTM());
      svg.dispatchEvent(new PointerEvent('pointermove', { clientX: pt.x, clientY: pt.y, bubbles: true }));
      for (let k = 1; 1000 + (k * 1000) / hz <= 1150 + 1e-9; k++) run(1000 + (k * 1000) / hz);
      out[hz] = svg.querySelector('[data-i="0"] polygon').getAttribute('points');
      api.destroy();
      svg.remove();
      queue.forEach((cb) => realRAF(cb));
    }
    window.requestAnimationFrame = realRAF;
    return out;
  });
  const topY = (pts) => Math.min(...pts.split(' ').map((p) => Number(p.split(',')[1])));
  // The box must have moved, and by the same amount at every rate.
  expect(topY(tops[60])).toBeLessThan(-41);
  expect(topY(tops[120])).toBeCloseTo(topY(tops[60]), 1);
  expect(topY(tops[240])).toBeCloseTo(topY(tops[60]), 1);
});
