import { deflateSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export type Pixel = (x: number, y: number) => [number, number, number];

/** A minimal RGB PNG encoder (8 bits per channel, no filtering): enough for app icons without another dependency. */
export function encodePng(size: number, pixel: Pixel): Buffer {
  const row = size * 3 + 1;
  const raw = Buffer.alloc(row * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) raw.set(pixel(x, y), y * row + 1 + x * 3);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits per channel
  header[9] = 2; // colour type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** The app icon: a light hexagon (a d20 seen from above) on dark red, small enough to survive maskable cropping. */
export function iconPixel(size: number): Pixel {
  const centre = size / 2;
  const radius = size * 0.34;
  return (x, y) => {
    const dx = Math.abs(x + 0.5 - centre);
    const dy = Math.abs(y + 0.5 - centre);
    const inside = dx <= (radius * Math.sqrt(3)) / 2 && dy <= radius - dx / Math.sqrt(3);
    return inside ? [0xf7, 0xf4, 0xee] : [0x8b, 0x1e, 0x1e];
  };
}
