/* 生成 PWA 图标 icon-192.png / icon-512.png（零依赖：手写 PNG 编码 + 像素绘制）
   图案与 App 视觉一致：深靛坐标纸 + 朱红自记曲线 + 笔尖圆点
   用法：node gen-icons.js */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* CRC32 */
const TABLE = (function () {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 3 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    rgb.copy(raw, y * stride + 1, y * w * 3, (y + 1) * w * 3);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const BG = [14, 35, 56];        /* 深靛 */
const GRID = [27, 58, 92];      /* 网格 */
const PEN = [200, 54, 43];      /* 朱红 */

function curveY(t) {            /* 归一化曲线 t∈[0,1] → y∈[0,1] */
  return 0.62 - 0.26 * Math.sin(t * 3.4 + 0.6) - 0.06 * Math.sin(t * 9.0);
}

function draw(size) {
  const rgb = Buffer.alloc(size * size * 3);
  const step = Math.max(8, Math.round(size / 16));
  const gw = Math.max(1, Math.round(size / 256));
  const lw = size * 0.035;
  const dotX = 0.62, dotY = curveY(dotX), dotR = size * 0.055, haloR = dotR * 2.1;

  function set(x, y, c, a) {
    if (a === undefined) a = 1;
    const i = (y * size + x) * 3;
    for (let k = 0; k < 3; k++) rgb[i + k] = Math.round(rgb[i + k] * (1 - a) + c[k] * a);
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      set(x, y, BG);
      if (x % step < gw || y % step < gw) set(x, y, GRID, 0.85);
    }
  }
  /* 曲线：逐列画竖段，抗锯齿用覆盖度 */
  for (let x = 0; x < size; x++) {
    const cy = curveY(x / (size - 1)) * size;
    for (let y = Math.max(0, Math.floor(cy - lw)); y <= Math.min(size - 1, Math.ceil(cy + lw)); y++) {
      const d = Math.abs(y - cy);
      const cov = Math.max(0, Math.min(1, (lw / 2 + 0.5 - d)));
      if (cov > 0) set(x, y, PEN, cov);
    }
  }
  /* 笔尖：外晕 + 实心点 */
  const px = dotX * size, py = dotY * size;
  for (let y = Math.max(0, Math.floor(py - haloR)); y <= Math.min(size - 1, Math.ceil(py + haloR)); y++) {
    for (let x = Math.max(0, Math.floor(px - haloR)); x <= Math.min(size - 1, Math.ceil(px + haloR)); x++) {
      const d = Math.hypot(x - px, y - py);
      if (d <= dotR) set(x, y, PEN, 1);
      else if (d <= haloR) set(x, y, PEN, 0.22 * (1 - (d - dotR) / (haloR - dotR)));
    }
  }
  return encodePNG(size, size, rgb);
}

[192, 512].forEach(function (s) {
  const out = path.join(__dirname, 'icon-' + s + '.png');
  fs.writeFileSync(out, draw(s));
  console.log('written', out, fs.statSync(out).size, 'bytes');
});
