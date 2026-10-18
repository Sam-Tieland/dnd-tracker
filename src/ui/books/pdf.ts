import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

/** Largest canvas iPad Safari will draw; beyond this, CSS scales the rest. */
export const MAX_CANVAS_PIXELS = 16_000_000;

/** pdf.js asks for the file in pieces of this size, so a 200 MB scan never sits in memory whole. */
const RANGE_CHUNK_SIZE = 1024 * 1024;

export interface PdfHandle {
  pageCount: number;
  /** Afmetingen van een pagina in PDF-punten. */
  pageSize(pdfPage: number): Promise<{ width: number; height: number }>;
  /** Tekent de pagina op canvas met deze schaal (punten → CSS-pixels) × devicePixelRatio, begrensd door MAX_CANVAS_PIXELS. */
  render(pdfPage: number, canvas: HTMLCanvasElement, cssScale: number): Promise<void>;
  destroy(): Promise<void>;
}

/** The largest scale ≤ cssScale·dpr at which a width × height (points) page stays within MAX_CANVAS_PIXELS. */
export function canvasScale(cssScale: number, dpr: number, width: number, height: number): number {
  const wanted = cssScale * dpr;
  if (width * height * wanted * wanted <= MAX_CANVAS_PIXELS) return wanted;
  let limit = Math.sqrt(MAX_CANVAS_PIXELS / (width * height));
  // The square root can round up by a hair; step down until the budget truly holds.
  while (width * height * limit * limit > MAX_CANVAS_PIXELS) limit *= 1 - 1e-12;
  return limit;
}

async function loadPdfjs() {
  // Only the worker's URL is static; pdf.js itself loads on first use, so the main bundle stays small.
  // The legacy build: older iPadOS Safari lacks built-ins the modern build uses (Map.prototype.getOrInsertComputed).
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

/** Opens a PDF from a Blob, reading only the byte ranges pdf.js asks for. A failed read rejects this and every later call. */
export async function openPdf(blob: Blob): Promise<PdfHandle> {
  const pdfjs = await loadPdfjs();

  // pdf.js has no way to hear that a range failed, so a failed read is kept here and every call races against it.
  let fail: (error: unknown) => void = () => {};
  const failed = new Promise<never>((_, reject) => {
    fail = reject;
  });
  failed.catch(() => {});
  const guard = <T>(work: Promise<T>): Promise<T> => Promise.race([work, failed]);

  class BlobRangeTransport extends pdfjs.PDFDataRangeTransport {
    override requestDataRange(begin: number, end: number): void {
      blob
        .slice(begin, end)
        .arrayBuffer()
        .then(
          (buffer) => this.onDataRange(begin, new Uint8Array(buffer)),
          (error: unknown) => {
            fail(error);
            void task.destroy();
          },
        );
    }
  }

  const task = pdfjs.getDocument({
    // The transport carries the file length; pdf.js 6 takes it from there.
    range: new BlobRangeTransport(blob.size, null),
    rangeChunkSize: RANGE_CHUNK_SIZE,
    disableAutoFetch: true,
    disableStream: true,
  });
  const doc = await guard(task.promise);

  return {
    pageCount: doc.numPages,
    async pageSize(pdfPage) {
      const page = await guard(doc.getPage(pdfPage));
      const { width, height } = page.getViewport({ scale: 1 });
      return { width, height };
    },
    async render(pdfPage, canvas, cssScale) {
      const page = await guard(doc.getPage(pdfPage));
      const base = page.getViewport({ scale: 1 });
      const scale = canvasScale(cssScale, window.devicePixelRatio || 1, base.width, base.height);
      const viewport = page.getViewport({ scale });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${base.width * cssScale}px`;
      canvas.style.height = `${base.height * cssScale}px`;
      try {
        await guard(page.render({ canvas, viewport }).promise);
      } finally {
        // Frees the page's decoded images, so memory does not grow over a long book (also after a failed render).
        page.cleanup();
      }
    },
    async destroy() {
      await task.destroy();
    },
  };
}
