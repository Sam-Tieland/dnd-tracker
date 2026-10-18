import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MAX_CANVAS_PIXELS, RANGE_CHUNK_SIZE, canvasScale, openPdf } from './pdf';
import { fakePdf } from './testing/fake-pdf';

describe('canvasScale', () => {
  it('limits the canvas to the pixel budget', () => {
    const s = canvasScale(2, 2, 2164, 2800);
    const limit = Math.sqrt(MAX_CANVAS_PIXELS / (2164 * 2800));
    expect(2164 * 2800 * s * s).toBeLessThanOrEqual(16_000_000);
    expect(s).toBeGreaterThan(limit * 0.99);
    expect(canvasScale(0.5, 2, 1000, 1000)).toBe(1);
  });
});

describe('openPdf', () => {
  beforeAll(async () => {
    // Test only: Node has no Web Worker, so pdf.js runs its worker code (the same legacy build) on the main thread.
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  });
  afterEach(() => vi.restoreAllMocks());

  it('counts pages by reading only small ranges of a large file', async () => {
    const blob = await fakePdf(5, { paddingBytes: 3 * 1024 * 1024 });
    expect(blob.size).toBeGreaterThan(3 * 1024 * 1024);
    const slices: number[] = [];
    const realSlice = blob.slice.bind(blob);
    vi.spyOn(blob, 'slice').mockImplementation((begin, end, type) => {
      slices.push((end ?? blob.size) - (begin ?? 0));
      return realSlice(begin, end, type);
    });
    const pdf = await openPdf(blob);
    try {
      expect(pdf.pageCount).toBe(5);
      expect(await pdf.pageSize(1)).toEqual({ width: 612, height: 792 });
      expect(slices.length).toBeGreaterThan(0);
      expect(Math.max(...slices)).toBeLessThanOrEqual(RANGE_CHUNK_SIZE);
      expect(slices.reduce((a, b) => a + b, 0)).toBeLessThan(blob.size / 2);
    } finally {
      await pdf.destroy();
    }
  });

  it('reports a spread page as twice as wide', async () => {
    const pdf = await openPdf(await fakePdf(3, { spreadFrom: 2 }));
    try {
      expect(await pdf.pageSize(3)).toEqual({ width: 1224, height: 792 });
    } finally {
      await pdf.destroy();
    }
  });

  it('rejects when a part of the file cannot be read', async () => {
    const blob = await fakePdf(2);
    const error = new Error('read failed');
    vi.spyOn(blob, 'slice').mockImplementation(() => ({ arrayBuffer: () => Promise.reject(error) }) as unknown as Blob);
    await expect(openPdf(blob)).rejects.toBe(error);
  });
});
