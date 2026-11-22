/**
 * Draws Spellbranch's placeholder icon: a cream branch on green.
 * It is not a Wizards symbol and not the Expo logo. Replace the PNGs
 * when real icon and splash art exist; re-run this script to regenerate
 * the placeholder: `node scripts/generate-mark.mjs`
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "images");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, t, data, crc]);
}

function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x / width, y / height);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function inEllipse(nx, ny, cx, cy, rx, ry, rotation) {
  const dx = nx - cx;
  const dy = ny - cy;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const u = (dx * cos + dy * sin) / rx;
  const v = (-dx * sin + dy * cos) / ry;
  return u * u + v * v <= 1;
}

function isMark(nx, ny) {
  const stem = inEllipse(nx, ny, 0.5, 0.56, 0.045, 0.28, 0.12);
  const leafL = inEllipse(nx, ny, 0.36, 0.42, 0.16, 0.07, -0.9);
  const leafR = inEllipse(nx, ny, 0.64, 0.5, 0.15, 0.065, 0.75);
  const leafLow = inEllipse(nx, ny, 0.38, 0.64, 0.13, 0.055, -1.05);
  return stem || leafL || leafR || leafLow;
}

const GREEN = [20, 53, 40, 255];
const CREAM = [243, 236, 223, 255];
const CLEAR = [0, 0, 0, 0];
const WHITE = [255, 255, 255, 255];

mkdirSync(root, { recursive: true });

writeFileSync(
  join(root, "icon.png"),
  png(1024, 1024, (x, y) => (isMark(x, y) ? CREAM : GREEN)),
);
writeFileSync(
  join(root, "splash-icon.png"),
  png(512, 512, (x, y) => (isMark(x, y) ? CREAM : CLEAR)),
);
writeFileSync(
  join(root, "favicon.png"),
  png(48, 48, (x, y) => (isMark(x, y) ? CREAM : GREEN)),
);
writeFileSync(
  join(root, "android-icon-foreground.png"),
  png(1024, 1024, (x, y) => {
    const nx = (x - 0.5) / 0.62 + 0.5;
    const ny = (y - 0.5) / 0.62 + 0.5;
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return CLEAR;
    return isMark(nx, ny) ? CREAM : CLEAR;
  }),
);
writeFileSync(
  join(root, "android-icon-monochrome.png"),
  png(1024, 1024, (x, y) => {
    const nx = (x - 0.5) / 0.62 + 0.5;
    const ny = (y - 0.5) / 0.62 + 0.5;
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return CLEAR;
    return isMark(nx, ny) ? WHITE : CLEAR;
  }),
);

console.log("wrote placeholder icons to", root);
