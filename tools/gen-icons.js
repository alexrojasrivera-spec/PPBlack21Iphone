// Generador de íconos PNG (sin dependencias externas).
// Dibuja un fondo verde tapete con las cifras "21" en blanco.
// Uso: node tools/gen-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Bitmaps 5x7 para los dígitos que necesitamos.
const FONT = {
  '2': [
    '01110',
    '10001',
    '00001',
    '00010',
    '00100',
    '01000',
    '11111',
  ],
  '1': [
    '00100',
    '01100',
    '00100',
    '00100',
    '00100',
    '00100',
    '01110',
  ],
};

function makePixels(size) {
  // RGBA buffer
  const buf = Buffer.alloc(size * size * 4);
  const bgTop = [15, 106, 60];   // verde tapete
  const bgBot = [8, 66, 40];
  const white = [245, 245, 245];
  const gold = [212, 175, 55];

  const radius = Math.round(size * 0.22);

  function inRounded(x, y) {
    const r = radius;
    if (x >= r && x <= size - 1 - r) return true;
    if (y >= r && y <= size - 1 - r) return true;
    const cx = x < r ? r : size - 1 - r;
    const cy = y < r ? r : size - 1 - r;
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  }

  function set(x, y, c) {
    const i = (y * size + x) * 4;
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
  }

  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const bg = [
      Math.round(bgTop[0] + (bgBot[0] - bgTop[0]) * t),
      Math.round(bgTop[1] + (bgBot[1] - bgTop[1]) * t),
      Math.round(bgTop[2] + (bgBot[2] - bgTop[2]) * t),
    ];
    for (let x = 0; x < size; x++) {
      if (inRounded(x, y)) set(x, y, bg);
      else { const i = (y * size + x) * 4; buf[i + 3] = 0; }
    }
  }

  // Borde dorado interior
  const bw = Math.max(2, Math.round(size * 0.02));
  const inset = Math.round(size * 0.09);
  for (let y = inset; y < size - inset; y++) {
    for (let x = inset; x < size - inset; x++) {
      const nearEdge =
        x < inset + bw || x >= size - inset - bw ||
        y < inset + bw || y >= size - inset - bw;
      if (nearEdge && inRounded(x, y)) set(x, y, gold);
    }
  }

  // Dibuja "21" centrado
  const text = '21';
  const glyphW = 5, glyphH = 7, gap = 1;
  const scale = Math.floor(size / 12);
  const totalW = (glyphW * text.length + gap * (text.length - 1)) * scale;
  const totalH = glyphH * scale;
  const startX = Math.floor((size - totalW) / 2);
  const startY = Math.floor((size - totalH) / 2);

  let cx = startX;
  for (const ch of text) {
    const g = FONT[ch];
    for (let gy = 0; gy < glyphH; gy++) {
      for (let gx = 0; gx < glyphW; gx++) {
        if (g[gy][gx] === '1') {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = cx + gx * scale + sx;
              const py = startY + gy * scale + sy;
              if (px >= 0 && px < size && py >= 0 && py < size) set(px, py, white);
            }
          }
        }
      }
    }
    cx += (glyphW + gap) * scale;
  }

  return buf;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'icons');
const sizes = [180, 192, 512];
for (const s of sizes) {
  const png = encodePNG(s, makePixels(s));
  fs.writeFileSync(path.join(outDir, `icon-${s}.png`), png);
  console.log('wrote icon-' + s + '.png');
}
