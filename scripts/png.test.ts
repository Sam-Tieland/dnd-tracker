import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { encodePng, iconPixel } from './png';

describe('encodePng', () => {
  it('writes a PNG signature, the size and the pixels', () => {
    const png = encodePng(4, (x) => (x < 2 ? [255, 0, 0] : [0, 0, 255]));
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([4, 4]);
    expect(png.subarray(37, 41).toString('ascii')).toBe('IDAT');
    const raw = inflateSync(png.subarray(41, 41 + png.readUInt32BE(33)));
    expect([...raw.subarray(0, 13)]).toEqual([0, 255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0, 255]);
  });

  it('draws the hexagon in the middle and leaves the corners red', () => {
    const pixel = iconPixel(192);
    expect(pixel(96, 96)).toEqual([0xf7, 0xf4, 0xee]);
    expect(pixel(0, 0)).toEqual([0x8b, 0x1e, 0x1e]);
  });
});
