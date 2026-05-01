import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = new Map(
  process.argv.slice(2).map(arg => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const url = args.get('url') || 'http://localhost:5173/';
const outDir = path.resolve(args.get('out') || 'qa-atlas/latest');
const categories = (args.get('categories') || 'head,side,dorsal').split(',').map(s => s.trim()).filter(Boolean);
const views = (args.get('views') || 'front,side,top').split(',').map(s => s.trim()).filter(Boolean);

const FEATURE_INDEX = { head: 2, side: 3, dorsal: 4 };
const BASE_DNA = {
  head: ['TG', 'TT', 'AA', 'AA', 'AA', 'AA'],
  side: ['GT', 'TT', 'AT', 'AA', 'AA', 'AA'],
  dorsal: ['GT', 'TT', 'AT', 'AA', 'AA', 'AA']
};

function dnaFor(category, code) {
  const dna = [...BASE_DNA[category]];
  dna[FEATURE_INDEX[category]] = code;
  return dna;
}

function safeName(text) {
  return text.replace(/[^\w.-]+/g, '_');
}

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', err => errors.push(err.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.TensorLab && window.TensorLab.setDNA && window.TensorLab.setCameraView);

const metadata = await page.evaluate(() => ({
  codes: window.TensorLab.codes,
  headContracts: window.TensorLab.contracts.head,
  primitives: window.TensorLab.primitives
}));

const rows = [];

for (const category of categories) {
  const codes = metadata.codes[category] || [];
  for (const code of codes) {
    const dna = dnaFor(category, code);
    const captures = [];
    let state = null;
    for (const view of views) {
      await page.evaluate(({ dna, view }) => {
        window.TensorLab.setDNA(dna);
        window.TensorLab.setCameraView(view);
      }, { dna, view });
      await page.waitForTimeout(220);
      state = await page.evaluate(() => window.TensorLab.getState());
      const filename = `${category}-${code}-${safeName(view)}.png`;
      await page.screenshot({ path: path.join(outDir, filename), fullPage: false });
      captures.push({ view, filename });
    }
    rows.push({
      category,
      code,
      dna,
      state,
      captures,
      primitive: metadata.primitives?.[category]?.[code] || null,
      contract: metadata.headContracts[code] || null
    });
  }
}

const html = `<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Universal Tensor Lab QA Atlas</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #172033; }
    header { position: sticky; top: 0; background: rgba(248,250,252,0.94); backdrop-filter: blur(10px); padding: 18px 24px; border-bottom: 1px solid #dbe3ee; z-index: 2; }
    h1 { margin: 0 0 6px; font-size: 26px; }
    .meta { color: #66758b; font-weight: 700; }
    main { padding: 24px; display: grid; gap: 18px; }
    article { background: white; border: 1px solid #dbe3ee; border-radius: 8px; padding: 14px; box-shadow: 0 8px 24px rgba(15,23,42,0.06); }
    h2 { margin: 0 0 8px; font-size: 18px; }
    .facts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; color: #475569; font-size: 13px; font-weight: 700; }
    .facts span { background: #eef4fb; border-radius: 999px; padding: 4px 8px; }
    .shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    figure { margin: 0; background: #f1f5f9; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; }
    img { width: 100%; display: block; }
    figcaption { padding: 6px 8px; font-weight: 800; color: #334155; text-transform: uppercase; font-size: 12px; }
    .errors { color: #be123c; white-space: pre-wrap; }
  </style>
</head>
<body>
  <header>
    <h1>Universal Tensor Lab QA Atlas</h1>
    <div class="meta">Source: ${url} | Categories: ${categories.join(', ')} | Views: ${views.join(', ')} | Generated: ${new Date().toISOString()}</div>
    ${errors.length ? `<pre class="errors">${errors.map(e => e.replace(/[<>&]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[ch]))).join('\n')}</pre>` : ''}
  </header>
  <main>
    ${rows.map(row => `
      <article>
        <h2>${row.category.toUpperCase()} ${row.code}: ${row.state.traits[FEATURE_INDEX[row.category]]}</h2>
        <div class="facts">
          <span>DNA ${row.dna.join('-')}</span>
          <span>${row.state.polyCount}</span>
          ${row.primitive ? `<span>primitive: ${row.primitive}</span>` : ''}
          ${row.contract ? `<span>${row.contract.firstRead}</span><span>${row.contract.markerPolicy}</span>` : ''}
        </div>
        <div class="shots">
          ${row.captures.map(c => `<figure><img src="${c.filename}" alt="${row.category} ${row.code} ${c.view}"><figcaption>${c.view}</figcaption></figure>`).join('')}
        </div>
      </article>
    `).join('')}
  </main>
</body>
</html>
`;

await fs.writeFile(path.join(outDir, 'index.html'), html);
await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify({ url, categories, views, errors, rows }, null, 2));

await browser.close();

console.log(JSON.stringify({
  outDir,
  html: path.join(outDir, 'index.html'),
  screenshots: rows.reduce((sum, row) => sum + row.captures.length, 0),
  errors
}, null, 2));
