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
  const names = new Set(doc.getForm().getFields().map((f) => f.getName()));
  if (!REQUIRED_FIELDS.every((name) => names.has(name))) throw new TemplateError('not-sheet');
}

/** Fills the user's own fillable sheet; the form stays editable. Fields the template lacks are skipped. */
export async function fillSheet(template: Uint8Array, values: SheetValues): Promise<Uint8Array> {
  const doc = await loadTemplate(template);
  const form = doc.getForm();
  const fields = new Map(form.getFields().map((f) => [f.getName(), f]));
  const { PDFTextField, PDFCheckBox } = await import('pdf-lib');
  for (const [name, value] of Object.entries(values.text)) {
    const field = fields.get(name);
    if (field instanceof PDFTextField) field.setText(value);
  }
  for (const name of values.checks) {
    const field = fields.get(name);
    if (field instanceof PDFCheckBox) field.check();
  }
  form.updateFieldAppearances();
  return doc.save();
}
