#!/usr/bin/env node

/**
 * Generates the PNG app icons used for "Add to Home Screen" on iPhone and
 * for the web app manifest, from the same connection-icon mark used in the
 * app header (see LogoMark in src/App.jsx): three circles joined by two
 * lines, in white, on the brand purple background.
 *
 * No image library - rasterizes the icon directly with a small stroke
 * distance test (supersampled for anti-aliasing) and writes a PNG by hand
 * using only Node's built-in zlib for the IDAT stream.
 *
 * Run: node scripts/generate-icons.js
 */

import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, "..", "public", "icons");

// Same brand purple as --color-primary in src/index.css.
const BG_COLOR = [0x5b, 0x21, 0xb6];
const FG_COLOR = [0xff, 0xff, 0xff];

// The LogoMark glyph from src/App.jsx, in its own 0..24 viewBox coordinate
// space: three circles (stroked, not filled) joined by two lines.
const VIEWBOX = 24;
const STROKE_WIDTH = 2;
const CIRCLES = [
  { cx: 5, cy: 12, r: 2.2 },
  { cx: 19, cy: 6, r: 2.2 },
  { cx: 19, cy: 18, r: 2.2 },
];
const LINES = [
  { x1: 7, y1: 11, x2: 17, y2: 7 },
  { x1: 7, y1: 13, x2: 17, y2: 17 },
];

// Matches the ratio between the glyph and its rounded square in the app
// header's .logo-mark (1.3rem glyph inside a 2.1rem box), so the icon reads
// the same way as the in-app logo.
const CONTENT_FRACTION = 1.3 / 2.1;
const SUPERSAMPLE = 4;

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const nearX = x1 + t * dx;
  const nearY = y1 + t * dy;
  return Math.hypot(px - nearX, py - nearY);
}

// True if (x, y) in viewBox space falls on the glyph's stroke.
function isGlyphPixel(x, y) {
  const halfStroke = STROKE_WIDTH / 2;
  for (const c of CIRCLES) {
    const d = Math.hypot(x - c.cx, y - c.cy);
    if (Math.abs(d - c.r) <= halfStroke) return true;
  }
  for (const l of LINES) {
    if (distanceToSegment(x, y, l.x1, l.y1, l.x2, l.y2) <= halfStroke) return true;
  }
  return false;
}

// Renders one size x size RGBA icon: brand-purple background, white glyph,
// supersampled SUPERSAMPLE x SUPERSAMPLE per pixel for anti-aliased edges.
function renderIcon(size) {
  const scale = (size * CONTENT_FRACTION) / VIEWBOX;
  const offset = (size - VIEWBOX * scale) / 2;
  const pixels = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let coverage = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const sampleX = px + (sx + 0.5) / SUPERSAMPLE;
          const sampleY = py + (sy + 0.5) / SUPERSAMPLE;
          const vx = (sampleX - offset) / scale;
          const vy = (sampleY - offset) / scale;
          if (isGlyphPixel(vx, vy)) coverage++;
        }
      }
      coverage /= SUPERSAMPLE * SUPERSAMPLE;

      const idx = (py * size + px) * 4;
      for (let c = 0; c < 3; c++) {
        pixels[idx + c] = Math.round(BG_COLOR[c] * (1 - coverage) + FG_COLOR[c] * coverage);
      }
      pixels[idx + 3] = 255;
    }
  }
  return pixels;
}

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return ~crc >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Encodes a size x size RGBA pixel buffer (8-bit depth, no per-row filter)
// as a standalone PNG file buffer.
function encodePng(size, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method
  const ihdr = pngChunk("IHDR", ihdrData);

  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let row = 0; row < size; row++) {
    const rowStart = row * (size * 4 + 1);
    raw[rowStart] = 0; // filter type: none
    pixels.copy(raw, rowStart + 1, row * size * 4, (row + 1) * size * 4);
  }
  const idat = pngChunk("IDAT", zlib.deflateSync(raw));

  const iend = pngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function writeIcon(size, fileName) {
  const pixels = renderIcon(size);
  const png = encodePng(size, pixels);
  fs.writeFileSync(path.join(ICONS_DIR, fileName), png);
  console.log(`Wrote public/icons/${fileName} (${size}x${size})`);
}

fs.mkdirSync(ICONS_DIR, { recursive: true });
writeIcon(180, "apple-touch-icon.png");
writeIcon(192, "icon-192.png");
writeIcon(512, "icon-512.png");
