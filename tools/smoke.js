// Prueba visual del tutorial interactivo y del juego.
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
  await page.waitForTimeout(200);

  // Abrir guía de conteo y lanzar tutorial
  await page.click('#btnCount');
  await page.waitForTimeout(150);
  await page.click('.tut-launch');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(ROOT, 'tools/t1-intro.png') });

  // Avanzar 2 pasos info hasta la primera pregunta de valor
  await page.click('#tutNext'); await page.waitForTimeout(120);
  await page.click('#tutNext'); await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(ROOT, 'tools/t2-value.png') });

  // Responder la pregunta de valor (elige primera opción) y ver feedback
  await page.click('.tut-opt'); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(ROOT, 'tools/t3-feedback.png') });

  // Recorrer TODO el tutorial hasta el final para detectar errores.
  let guard = 0;
  while (guard++ < 60) {
    const next = await page.$('#tutNext');
    if (!next) break;
    const disabled = await next.isDisabled();
    if (disabled) {
      // hay que interactuar: intenta la primera opción, luego inline, luego comprobar
      const opt = await page.$('.tut-opt:not([disabled])');
      const inline = await page.$('.tut-inline');
      if (opt) { await opt.click(); await page.waitForTimeout(80); continue; }
      if (inline) { await inline.click(); await page.waitForTimeout(80); continue; }
      // stepper: sólo comprobar
      const check = await page.$('.tut-inline');
      if (check) { await check.click(); await page.waitForTimeout(80); continue; }
      break;
    }
    const label = await next.textContent();
    if (label && label.includes('Practicar')) { await next.click(); break; }
    await next.click();
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(ROOT, 'tools/t4-end.png') });

  console.log('Errores de consola:', errors.length ? errors : 'ninguno');
  console.log('Iteraciones para completar:', guard);
  await browser.close();
  server.close();
})().catch((e) => { console.error('FALLO:', e); process.exit(1); });
