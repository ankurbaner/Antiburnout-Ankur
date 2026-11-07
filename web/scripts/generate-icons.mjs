import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const source = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const colours = [...source.matchAll(/fill="(#\w+)"/g)].map((match) => match[1].slice(1).match(/../g).map((hex) => parseInt(hex, 16)));
const tokens = source.match(/ d="([^"]+)"/)[1].match(/[a-zA-Z]|-?\d*\.?\d+/g);
const polygon = [];
let i = 0, command = '', x = 0, y = 0, previousControl = [0, 0];
while (i < tokens.length) {
  if (/[a-zA-Z]/.test(tokens[i])) command = tokens[i++];
  if (command.toLowerCase() === 'z') break;
  const relative = command === command.toLowerCase();
  const point = () => [Number(tokens[i++]) + (relative ? x : 0), Number(tokens[i++]) + (relative ? y : 0)];
  if (command.toLowerCase() === 'm') {
    [x, y] = point();
    polygon.push([x, y]);
  } else if (['c', 's'].includes(command.toLowerCase())) {
    const a = command.toLowerCase() === 'c' ? point() : [2 * x - previousControl[0], 2 * y - previousControl[1]];
    const b = point(), end = point();
    for (let step = 1; step <= 64; step++) {
      const t = step / 64, u = 1 - t;
      polygon.push([u ** 3 * x + 3 * u ** 2 * t * a[0] + 3 * u * t ** 2 * b[0] + t ** 3 * end[0], u ** 3 * y + 3 * u ** 2 * t * a[1] + 3 * u * t ** 2 * b[1] + t ** 3 * end[1]]);
    }
    previousControl = b;
    [x, y] = end;
  } else throw new Error(`Unsupported logo path command: ${command}`);
}
const insideEye = (x, y) => {
  let inside = false;
  for (let a = 0, b = polygon.length - 1; a < polygon.length; b = a++) {
    const [ax, ay] = polygon[a], [bx, by] = polygon[b];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
};
const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, bytes) => {
  const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, bytes])));
  return Buffer.concat([length, name, bytes, crc]);
};
for (const [name, size, maskable] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, false]]) {
  const pixels = Buffer.alloc((size * 4 + 1) * size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const sum = [0, 0, 0, 0];
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      let x = (px + (sx + 0.5) / 2) * 64 / size, y = (py + (sy + 0.5) / 2) * 64 / size;
      if (maskable) { x = (x - 32) / 0.54 + 32; y = (y - 32) / 0.54 + 32; }
      const cornerX = Math.max(16 - x, x - 48, 0), cornerY = Math.max(16 - y, y - 48, 0);
      const square = x >= 0 && x <= 64 && y >= 0 && y <= 64 && cornerX ** 2 + cornerY ** 2 <= 16 ** 2;
      let colour = [...colours[0], maskable || square ? 255 : 0];
      if (square && insideEye(x, y)) colour = [...colours[1], 255];
      if ((x - 32) ** 2 + (y - 32) ** 2 <= 8 ** 2) colour = [...colours[2], 255];
      colour.forEach((channel, index) => { sum[index] += channel; });
    }
    const offset = py * (size * 4 + 1) + 1 + px * 4;
    sum.forEach((value, index) => { pixels[offset + index] = Math.round(value / 4); });
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  writeFileSync(new URL(`../public/${name}`, import.meta.url), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]));
  console.log(`Generated ${name} (${size}×${size}) from favicon.svg`);
}
