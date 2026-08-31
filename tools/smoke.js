// Prueba visual: sirve la carpeta, abre la app en iPhone viewport,
// juega un par de acciones y toma capturas.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(4173, r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ROOT, 'tools/shot-1-bet.png') });

  // Apostar $25 y repartir
  await page.click('.chip.c25');
  await page.click('#dealBtn');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(ROOT, 'tools/shot-2-play.png') });

  // Abrir tabla de estrategia
  await page.click('#btnChart');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(ROOT, 'tools/shot-3-chart.png') });
  await page.click('#modalClose');

  console.log('Errores de consola:', errors.length ? errors : 'ninguno');
  await browser.close();
  server.close();
})().catch((e) => { console.error('FALLO:', e); process.exit(1); });
