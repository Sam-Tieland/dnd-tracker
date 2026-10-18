import type { PdfHandle } from './pdf';

/** 1 = the page width fits the reading area. */
export const ZOOM_STEPS = [1, 1.25, 1.5, 2, 2.5, 3, 4] as const;

/** CSS pixels per PDF point at which a page this wide fills the reading area. */
export function fitScale(pageWidthPt: number, viewWidthPx: number): number {
  return viewWidthPx / pageWidthPt;
}

/** Where the reading area scrolls to for one half of a two-page spread. */
export function scrollForHalf(half: 'whole' | 'left' | 'right', renderedWidthPx: number, viewWidthPx: number): number {
  return half === 'right' ? Math.max(0, renderedWidthPx - viewWidthPx) : 0;
}

/** A positive whole number after trimming, otherwise undefined. */
export function parseGoTo(input: string): number | undefined {
  const text = input.trim();
  if (!/^\d+$/.test(text)) return undefined;
  const page = Number(text);
  return page > 0 ? page : undefined;
}

/** The zoom step closest to a zoom, for example after a pinch. */
export function nearestZoom(zoom: number): number {
  return ZOOM_STEPS.reduce<number>((best, step) => (Math.abs(step - zoom) < Math.abs(best - zoom) ? step : best), ZOOM_STEPS[0]);
}

/** One zoom step further in (+1) or out (−1), stopping at the ends. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const at = ZOOM_STEPS.indexOf(nearestZoom(zoom) as (typeof ZOOM_STEPS)[number]);
  return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, at + direction))]!;
}

/** The render was replaced by a newer one before it started, or the document was closed. */
export class Superseded extends Error {
  constructor() {
    super('superseded');
    this.name = 'Superseded';
  }
}

/**
 * pdf.js cannot cancel a render and throws when one canvas is drawn twice at once. This runs one render at a time;
 * of the renders asked for meanwhile only the latest runs (the others reject with Superseded). destroy() waits for
 * the running render, so pdf.js never loses its document halfway through a page.
 */
export function serialRenders(handle: PdfHandle): PdfHandle {
  type Job = { args: Parameters<PdfHandle['render']>; resolve: () => void; reject: (error: unknown) => void };
  let waiting: Job | undefined;
  let running: Promise<void> | undefined;
  let closed = false;

  const pump = async () => {
    while (waiting) {
      const job = waiting;
      waiting = undefined;
      try {
        await handle.render(...job.args);
        job.resolve();
      } catch (error) {
        job.reject(error);
      }
    }
    running = undefined;
  };

  return {
    pageCount: handle.pageCount,
    pageSize: (pdfPage) => handle.pageSize(pdfPage),
    render(...args) {
      if (closed) return Promise.reject(new Superseded());
      return new Promise<void>((resolve, reject) => {
        waiting?.reject(new Superseded());
        waiting = { args, resolve, reject };
        running ??= pump();
      });
    },
    async destroy() {
      closed = true;
      waiting?.reject(new Superseded());
      waiting = undefined;
      await running;
      await handle.destroy();
    },
  };
}
