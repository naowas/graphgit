const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function png(size) {
  // 2x2 gradient background + white graph glyph made of 3 dots and 2 connecting bars
  const bg = [0x2b, 0x2e, 0x35, 0xff];
  const accent = [0x4f, 0x8c, 0xff, 0xff];
  const white = [0xff, 0xff, 0xff, 0xff];
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const dot = (dx, dy, r, col) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d2 = (x - dx) ** 2 + (y - dy) ** 2;
        if (d2 <= r * r) {
          const i = (y * size + x) * 4;
          px[i] = col[0];
          px[i + 1] = col[1];
          px[i + 2] = col[2];
          px[i + 3] = col[3];
        }
      }
    }
  };
  // background
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = bg[0];
    px[i * 4 + 1] = bg[1];
    px[i * 4 + 2] = bg[2];
    px[i * 4 + 3] = bg[3];
  }
  // connecting bars (branch lines)
  const bar = (x1, y1, x2, y2, w, col) => {
    const steps = size * 2;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const bx = x1 + (x2 - x1) * t;
      const by = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * size * 0.06;
      dot(bx, by, w, col);
    }
  };
  const d = size * 0.22; // lane offsets
  bar(cx - d, size * 0.2, cx - d, size * 0.8, size * 0.045, accent);
  bar(cx + d, size * 0.35, cx + d, size * 0.8, size * 0.045, accent);
  bar(cx - d, size * 0.5, cx + d, size * 0.5, size * 0.04, accent);
  // commit dots
  dot(cx - d, size * 0.2, size * 0.075, white);
  dot(cx - d, size * 0.8, size * 0.075, white);
  dot(cx + d, size * 0.35, size * 0.075, white);
  dot(cx + d, size * 0.8, size * 0.075, white);
  return Buffer.from(px.buffer);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf) >>> 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

let CRC_TABLE;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let crc = -1;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return crc ^ -1;
}

function writePng(file, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const px = png(size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const pngBuf = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', require('node:zlib').deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(file, pngBuf);
  console.log('wrote', file, size + 'x' + size);
}

const dir = path.join(__dirname, '..', 'build');
fs.mkdirSync(dir, { recursive: true });
for (const s of [256, 512]) writePng(path.join(dir, `icon-${s}.png`), s);
fs.copyFileSync(path.join(dir, 'icon-512.png'), path.join(dir, 'icon.png'));
console.log('build/icon.png ready');
