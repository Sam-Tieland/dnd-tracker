import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import type { PdfHandle } from './pdf';
import { fitScale, nearestZoom, scrollForHalf, Superseded } from './reader-logic';

/** A swipe must travel this far (CSS pixels) to turn the page. */
const SWIPE_PX = 60;

interface PageViewProps {
  /** A handle whose renders are serialized (serialRenders). */
  pdf: PdfHandle;
  pdfPage: number;
  half: 'whole' | 'left' | 'right';
  /** The pdf page holds two book pages: zoom 1 fits one book page (half the scan) to the reading area. */
  spread: boolean;
  zoom: number;
  label: string;
  onFlip(direction: 1 | -1): void;
  onZoom(zoom: number): void;
  onError(error: unknown): void;
}

type Gesture = { kind: 'swipe'; x: number; y: number } | { kind: 'pinch'; distance: number; ratio: number } | { kind: 'done' };

/** Gives a canvas's pixels back at once; iPad Safari only frees canvas memory slowly otherwise. */
function release(canvas: Element | null) {
  if (canvas instanceof HTMLCanvasElement) {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Only the current pdf page, on one canvas; a new canvas replaces (and frees) the old one when it is drawn. */
export function PageView({ pdf, pdfPage, half, spread, zoom, label, onFlip, onZoom, onError }: PageViewProps) {
  const viewRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [viewWidth, setViewWidth] = useState(0);
  const [size, setSize] = useState<{ pdf: PdfHandle; pdfPage: number; width: number; height: number }>();
  const placed = useRef<{ pdfPage: number; half: string; zoom: number; width: number }>(undefined);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture>(undefined);
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useLayoutEffect(() => {
    const view = viewRef.current!;
    const measure = () => setViewWidth(view.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    pdf.pageSize(pdfPage).then(
      (s) => alive && setSize({ pdf, pdfPage, ...s }),
      (error: unknown) => alive && errorRef.current(error),
    );
    return () => {
      alive = false;
    };
  }, [pdf, pdfPage]);

  const current = size && size.pdf === pdf && size.pdfPage === pdfPage ? size : undefined;
  const fitWidth = current ? (spread ? current.width / 2 : current.width) : 0;
  const scale = current ? fitScale(fitWidth, viewWidth > 0 ? viewWidth : fitWidth) * zoom : undefined;
  const width = current && scale !== undefined ? current.width * scale : undefined;
  const height = current && scale !== undefined ? current.height * scale : undefined;
  const canSwipe = zoom === 1 && width !== undefined && width <= viewWidth + 1;

  // A new page starts at the top, on its half of the spread; a resized reading area lines that half up again; a new
  // zoom keeps the middle of what you were looking at. The half uses the width the fit used, so it lines up exactly.
  useLayoutEffect(() => {
    const view = viewRef.current;
    if (!view || width === undefined) return;
    const before = placed.current;
    const newPage = !before || before.pdfPage !== pdfPage || before.half !== half;
    if (newPage) view.scrollTop = 0;
    if (newPage || (before.zoom === zoom && before.width !== width)) {
      view.scrollLeft = scrollForHalf(half, width, viewWidth > 0 ? viewWidth : view.clientWidth);
    } else if (before.width !== width) {
      const ratio = width / before.width;
      view.scrollLeft = (view.scrollLeft + view.clientWidth / 2) * ratio - view.clientWidth / 2;
      view.scrollTop = (view.scrollTop + view.clientHeight / 2) * ratio - view.clientHeight / 2;
    }
    placed.current = { pdfPage, half, zoom, width };
  }, [pdfPage, half, zoom, width, viewWidth]);

  useEffect(() => {
    if (scale === undefined) return;
    let alive = true;
    const canvas = document.createElement('canvas');
    pdf.render(pdfPage, canvas, scale).then(
      () => {
        const sheet = sheetRef.current;
        if (!alive || !sheet) return release(canvas);
        // The sheet has the size; the canvas follows it, so a zoom shows at once (blurry) until the sharp one is drawn.
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        const old = sheet.firstElementChild;
        sheet.replaceChildren(canvas);
        release(old);
      },
      (error: unknown) => {
        release(canvas);
        if (alive && !(error instanceof Superseded)) errorRef.current(error);
      },
    );
    return () => {
      alive = false;
    };
  }, [pdf, pdfPage, scale]);

  useEffect(() => {
    const sheet = sheetRef.current;
    return () => release(sheet?.firstElementChild ?? null);
  }, []);

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const setPreview = (ratio: number | undefined) => {
    if (sheetRef.current) sheetRef.current.style.transform = ratio === undefined ? '' : `scale(${ratio})`;
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = { kind: 'swipe', x: e.clientX, y: e.clientY };
    else if (pointers.current.size === 2) gesture.current = { kind: 'pinch', distance: distance(), ratio: 1 };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (g?.kind === 'pinch' && g.distance > 0 && pointers.current.size === 2) {
      g.ratio = distance() / g.distance;
      setPreview(g.ratio);
    }
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (g?.kind === 'pinch') {
      setPreview(undefined);
      onZoom(nearestZoom(zoom * g.ratio));
      gesture.current = { kind: 'done' };
    } else if (g?.kind === 'swipe' && e.type === 'pointerup' && canSwipe) {
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) onFlip(dx < 0 ? 1 : -1);
    }
    if (pointers.current.size === 0) gesture.current = undefined;
  };

  return (
    <div
      ref={viewRef}
      className="book-view"
      role="region"
      aria-label={label}
      tabIndex={0}
      style={{ touchAction: canSwipe ? 'pan-y' : 'pan-x pan-y' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div
        ref={sheetRef}
        className="book-sheet"
        style={width === undefined || height === undefined ? undefined : { width: `${width}px`, height: `${height}px` }}
      />
    </div>
  );
}
