// Prueba visual: verifica el zapato bajando tras jugar varias manos.
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

async function playRound(page) {
  await page.click('.chip.c25');
  await page.click('#dealBtn');
  await page.waitForTimeout(300);
  // planta o siguiente hasta terminar la mano
  let g = 0;
  while (g++ < 12) {
    const stand = await page.$('#standBtn');
    const next = await page.$('#nextBtn');
    if (next) { await next.click(); await page.waitForTimeout(150); return; }
    if (stand) { await stand.click(); await page.waitForTimeout(200); continue; }
    const ins = await page.$('#noIns'); if (ins) { await ins.click(); continue; }
    await page.waitForTimeout(120);
  }
}

(async () => {
  await new Promise((r) => server.listen(4173, r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  await page.click('#countToggle');

  const before = await page.$eval('#shoeDecks', (e) => e.textContent);
  const fillBefore = await page.$eval('#shoeFill', (e) => e.style.height);

  // Juega 10 manos
  for (let i = 0; i < 10; i++) await playRound(page);

  const after = await page.$eval('#shoeDecks', (e) => e.textContent);
  const fillAfter = await page.$eval('#shoeFill', (e) => e.style.height);
  const cut = await page.$eval('#shoeCut', (e) => e.style.bottom);
  await page.screenshot({ path: path.join(ROOT, 'tools/shoe.png') });

  console.log('Errores de consola:', errors.length ? errors : 'ninguno');
  console.log('Barajas antes:', before, '-> después de 10 manos:', after);
  console.log('Altura fill antes:', fillBefore, '-> después:', fillAfter, ' | carta de corte en bottom:', cut);
  await browser.close();
  server.close();
})().catch((e) => { console.error('FALLO:', e); process.exit(1); });
