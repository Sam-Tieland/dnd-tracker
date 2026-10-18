/** Test only: a PDF of blank pages, each showing "P<n>"; from page `spreadFrom` (1-based) on, pages are twice as wide (a two-page spread). */
export async function fakePdf(pages: number, opts: { spreadFrom?: number } = {}): Promise<Blob> {
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let n = 1; n <= pages; n++) {
    const spread = opts.spreadFrom !== undefined && n >= opts.spreadFrom;
    const page = doc.addPage([spread ? 1224 : 612, 792]);
    page.drawText(`P${n}`, { x: 50, y: 700, size: 24, font });
  }
  const bytes = await doc.save();
  return new Blob([bytes.slice().buffer], { type: 'application/pdf' });
}
