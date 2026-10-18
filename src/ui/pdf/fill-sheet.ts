import { REQUIRED_FIELDS } from './sheet-fields';
import type { SheetValues } from './sheet-values';

export class TemplateError extends Error {
  readonly code: 'not-pdf' | 'not-sheet';
  constructor(code: 'not-pdf' | 'not-sheet') {
    super(code === 'not-pdf' ? 'The file is not a PDF' : 'The PDF is not the character sheet');
    this.name = 'TemplateError';
    this.code = code;
  }
}

async function loadTemplate(bytes: Uint8Array) {
  const { PDFDocument } = await import('pdf-lib');
  try {
    return await PDFDocument.load(bytes);
  } catch {
    throw new TemplateError('not-pdf');
  }
}

/** Throws a TemplateError when the bytes are not a PDF or lack the fields that identify the character sheet. */
export async function checkTemplate(bytes: Uint8Array): Promise<void> {
  const doc = await loadTemplate(bytes);
  let names: Set<string>;
  try {
    names = new Set(doc.getForm().getFields().map((f) => f.getName()));
  } catch {
    // A damaged AcroForm is not a usable character sheet.
    throw new TemplateError('not-sheet');
  }
  if (!REQUIRED_FIELDS.every((name) => names.has(name))) throw new TemplateError('not-sheet');
}

/** A png or jpeg data URL as an embedded image; anything else (or a damaged picture) is skipped. */
async function embedImage(doc: Awaited<ReturnType<typeof loadTemplate>>, dataUrl: string) {
  const match = /^data:image\/(png|jpeg);base64,(.*)$/.exec(dataUrl);
  if (!match) return undefined;
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  try {
    return match[1] === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch {
    return undefined;
  }
}

const MAX_BLOCK_SIZE = 10;
const MIN_BLOCK_SIZE = 5;

/**
 * The largest font size (up to 10 pt) at which the text, wrapped on words, fits the box. Without it a short text in
 * a large box is drawn huge and a long word is cut off.
 */
export function blockFontSize(text: string, width: number, height: number, widthOf: (text: string, size: number) => number): number {
  const fits = (size: number) => {
    let lines = 0;
    for (const paragraph of text.split(/\r?\n/)) {
      let line = '';
      lines += 1;
      for (const word of paragraph.split(' ')) {
        if (widthOf(word, size) > width) return false;
        const next = line ? `${line} ${word}` : word;
        if (widthOf(next, size) > width) {
          lines += 1;
          line = word;
        } else {
          line = next;
        }
      }
    }
    return lines * size * 1.2 <= height;
  };
  for (let size = MAX_BLOCK_SIZE; size > MIN_BLOCK_SIZE; size -= 0.5) if (fits(size)) return size;
  return MIN_BLOCK_SIZE;
}

/** Fills the user's own fillable sheet; the form stays editable. Fields the template lacks are skipped. */
export async function fillSheet(template: Uint8Array, values: SheetValues): Promise<Uint8Array> {
  const doc = await loadTemplate(template);
  const form = doc.getForm();
  const fields = new Map(form.getFields().map((f) => [f.getName(), f]));
  const { PDFTextField, PDFCheckBox, PDFButton, StandardFonts } = await import('pdf-lib');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [name, value] of Object.entries(values.text)) {
    const field = fields.get(name);
    if (!(field instanceof PDFTextField)) continue;
    field.setText(value);
    const box = field.acroField.getWidgets()[0]?.getRectangle();
    if (field.isMultiline() && box && value) {
      // Two points of padding on every side, as the form draws it.
      const size = blockFontSize(value, box.width - 4, box.height - 4, (text, fontSize) => font.widthOfTextAtSize(text, fontSize));
      // Some fields of the official sheet have no default appearance to put the size in; they get one.
      if (field.acroField.getDefaultAppearance() === undefined) field.acroField.setDefaultAppearance(`/Helv ${size} Tf 0 g`);
      else field.setFontSize(size);
    }
  }
  for (const name of values.checks) {
    const field = fields.get(name);
    if (field instanceof PDFCheckBox) field.check();
  }
  for (const [name, dataUrl] of Object.entries(values.images ?? {})) {
    const field = fields.get(name);
    const image = await embedImage(doc, dataUrl);
    if (field instanceof PDFButton && image) field.setImage(image);
  }
  form.updateFieldAppearances();
  return doc.save();
}
