import { describe, expect, it } from 'vitest';
import { kael, registry } from '../../rules/testing/fixtures';
import { checkTemplate, fillSheet, TemplateError } from './fill-sheet';
import { sheetValues } from './sheet-values';
import { fakeTemplate } from './testing/fake-template';

async function load(bytes: Uint8Array) {
  const { PDFDocument } = await import('pdf-lib');
  return PDFDocument.load(bytes);
}

describe('fillSheet', () => {
  it('fills text fields and checks boxes', async () => {
    const out = await fillSheet(await fakeTemplate(), { text: { CharacterName: 'Kael', STR: '17' }, checks: ['Check Box 11'] });
    const form = (await load(out)).getForm();
    expect(form.getTextField('CharacterName').getText()).toBe('Kael');
    expect(form.getTextField('STR').getText()).toBe('17');
    expect(form.getCheckBox('Check Box 11').isChecked()).toBe(true);
    expect(form.getCheckBox('Check Box 18').isChecked()).toBe(false);
  });

  it('keeps the form fillable', async () => {
    const out = await fillSheet(await fakeTemplate(), { text: { CharacterName: 'Kael' }, checks: [] });
    const form = (await load(out)).getForm();
    expect(form.getFields().length).toBeGreaterThan(100);
    expect(form.getTextField('CharacterName').isReadOnly()).toBe(false);
  });

  it('skips a field the template lacks', async () => {
    const out = await fillSheet(await fakeTemplate(), { text: { NoSuchField: 'x', CharacterName: 'A' }, checks: ['No such box'] });
    expect((await load(out)).getForm().getTextField('CharacterName').getText()).toBe('A');
  });

  it('fills a name with characters outside WinAnsi', async () => {
    const named = { ...kael(), name: 'Łukasz Привет ✓', details: { backstory: 'Een ✓ verhaal' } };
    const out = await fillSheet(await fakeTemplate(), sheetValues(named, registry));
    expect((await load(out)).getForm().getTextField('CharacterName').getText()).toContain('ukasz');
  });
});

describe('checkTemplate', () => {
  it('accepts the sheet', async () => {
    await expect(checkTemplate(await fakeTemplate())).resolves.toBeUndefined();
  });

  it('rejects a PDF without the sheet fields', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    doc.addPage();
    const err = await checkTemplate(await doc.save()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TemplateError);
    expect((err as TemplateError).code).toBe('not-sheet');
  });

  it('rejects bytes that are not a PDF', async () => {
    const err = await checkTemplate(new TextEncoder().encode('hello')).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TemplateError);
    expect((err as TemplateError).code).toBe('not-pdf');
  });
});
