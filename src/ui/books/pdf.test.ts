import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MAX_CANVAS_PIXELS, canvasScale, openPdf } from './pdf';
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

// Test only: Node lacks newer built-ins the modern build relies on (Map.prototype.getOrInsertComputed), so use the
// legacy build here, and, as Node has no Web Worker, let pdf.js run its worker code on the main thread.
vi.mock('pdfjs-dist', () => import('pdfjs-dist/legacy/build/pdf.mjs'));

describe('openPdf', () => {
  beforeAll(async () => {
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  });
  afterEach(() => vi.restoreAllMocks());

  it('counts pages without reading the whole file', async () => {
    const blob = await fakePdf(5);
    const spy = vi.spyOn(Blob.prototype, 'arrayBuffer');
    const pdf = await openPdf(blob);
    try {
      expect(pdf.pageCount).toBe(5);
      expect(spy.mock.contexts.some((context) => context === blob)).toBe(false);
      expect(spy).toHaveBeenCalled();
      expect(await pdf.pageSize(1)).toEqual({ width: 612, height: 792 });
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
});
