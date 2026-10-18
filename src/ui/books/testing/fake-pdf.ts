/** Test only: a PDF of blank pages, each showing "P<n>"; from page `spreadFrom` (1-based) on, pages are twice as wide (a two-page spread). `paddingBytes` adds that much incompressible data as an attachment, so the file spans several range chunks. */
export async function fakePdf(pages: number, opts: { spreadFrom?: number; paddingBytes?: number } = {}): Promise<Blob> {
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let n = 1; n <= pages; n++) {
    const spread = opts.spreadFrom !== undefined && n >= opts.spreadFrom;
    const page = doc.addPage([spread ? 1224 : 612, 792]);
    page.drawText(`P${n}`, { x: 50, y: 700, size: 24, font });
  }
  if (opts.paddingBytes !== undefined) {
    const padding = new Uint8Array(opts.paddingBytes);
    // getRandomValues takes at most 65536 bytes per call.
    for (let at = 0; at < padding.length; at += 65536) crypto.getRandomValues(padding.subarray(at, at + 65536));
    await doc.attach(padding, 'padding.bin', { mimeType: 'application/octet-stream' });
  }
  const bytes = await doc.save();
  return new Blob([bytes.slice().buffer], { type: 'application/pdf' });
}
