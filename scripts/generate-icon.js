// Generates the LogicG8 app icon (black → dark-grey gradient with a white ∧)
// as both a PNG and an ICO. Run with: node scripts/generate-icon.js
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;

// Gradient endpoints (matches the in-app brand logo).
const GRAD_BLACK = [0x00, 0x00, 0x00];
const GRAD_GREY = [0x55, 0x55, 0x55];

// Caret (logical AND) vertices, apex at the top.
const APEX = { x: 128, y: 80 };
const BOT_LEFT = { x: 44, y: 178 };
const BOT_RIGHT = { x: 212, y: 178 };

function sign(p1, p2, p3) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

function pointInTriangle(px, py) {
  const d1 = sign({ x: px, y: py }, APEX, BOT_LEFT);
  const d2 = sign({ x: px, y: py }, BOT_LEFT, BOT_RIGHT);
  const d3 = sign({ x: px, y: py }, BOT_RIGHT, APEX);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function caretCoverage(x, y) {
  // 3x3 supersampled coverage for smooth edges.
  let hits = 0;
  for (let sy = 0; sy < 3; sy += 1) {
    for (let sx = 0; sx < 3; sx += 1) {
      const px = x + (sx + 0.5) / 3;
      const py = y + (sy + 0.5) / 3;
      if (pointInTriangle(px, py)) {
        hits += 1;
      }
    }
  }
  return hits / 9;
}

function buildPixels() {
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  const diag = 2 * (SIZE - 1);

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const t = (x + y) / diag; // 0 top-left → 1 bottom-right
      const r = Math.round(GRAD_BLACK[0] + (GRAD_GREY[0] - GRAD_BLACK[0]) * t);
      const g = Math.round(GRAD_BLACK[1] + (GRAD_GREY[1] - GRAD_BLACK[1]) * t);
      const b = Math.round(GRAD_BLACK[2] + (GRAD_GREY[2] - GRAD_BLACK[2]) * t);

      const cov = caretCoverage(x, y);
      const outR = Math.round(r + (255 - r) * cov);
      const outG = Math.round(g + (255 - g) * cov);
      const outB = Math.round(b + (255 - b) * cov);

      const idx = (y * SIZE + x) * 4;
      pixels[idx] = outR;
      pixels[idx + 1] = outG;
      pixels[idx + 2] = outB;
      pixels[idx + 3] = 255;
    }
  }

  return pixels;
}

// --- PNG encoding (no external dependencies) ---

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = SIZE * 4;
  const raw = Buffer.alloc((stride + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function encodeIco(pngData) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry[0] = 0; // width 0 → 256
  entry[1] = 0; // height 0 → 256
  entry[2] = 0; // color count
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(pngData.length, 8); // bytes in resource
  entry.writeUInt32LE(6 + 16, 12); // image offset

  return Buffer.concat([header, entry, pngData]);
}

const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const pixels = buildPixels();
const png = encodePng(pixels);
const ico = encodeIco(png);

fs.writeFileSync(path.join(outDir, 'icon.png'), png);
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);

console.log('Wrote assets/icon.png (%d bytes) and assets/icon.ico (%d bytes)', png.length, ico.length);
