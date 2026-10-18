import { describe, expect, it } from 'vitest';
import { kael, registry } from '../../rules/testing/fixtures';
import { blockFontSize, checkTemplate, fillSheet, TemplateError } from './fill-sheet';
import { sheetValues } from './sheet-values';
import { fakeTemplate } from './testing/fake-template';

async function load(bytes: Uint8Array) {
  const { PDFDocument } = await import('pdf-lib');
  return PDFDocument.load(bytes);
}

/** A 1x1 red PNG. */
const TINY_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

describe('fillSheet', () => {
  it('fills text fields and checks boxes', async () => {
    const out = await fillSheet(await fakeTemplate(), { text: { CharacterName: 'Kael', STR: '17' }, checks: ['Check Box 11'] });
    const form = (await load(out)).getForm();
    expect(form.getTextField('CharacterName').getText()).toBe('Kael');
    expect(form.getTextField('STR').getText()).toBe('17');
    expect(form.getCheckBox('Check Box 11').isChecked()).toBe(true);
    expect(form.getCheckBox('Check Box 18').isChecked()).toBe(false);
  }, 15000);

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

  it('draws a picture into an image button and skips a damaged one', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const source = await PDFDocument.create();
    const png = await source.embedPng(TINY_PNG);
    expect(png.width).toBe(1);
    const dataUrl = `data:image/png;base64,${btoa(String.fromCharCode(...TINY_PNG))}`;
    const out = await fillSheet(await fakeTemplate(), {
      text: {},
      checks: [],
      images: { 'CHARACTER IMAGE': dataUrl, 'Faction Symbol Image': 'data:image/jpeg;base64,AAAA' },
    });
    const form = (await load(out)).getForm();
    const widget = form.getButton('CHARACTER IMAGE').acroField.getWidgets()[0];
    const appearance = widget.getNormalAppearance();
    expect(appearance).toBeDefined();
    expect(form.getButton('Faction Symbol Image')).toBeDefined();
  });

  it('fills a name with characters outside WinAnsi', async () => {
    const named = { ...kael(), name: 'Łukasz Привет ✓', details: { backstory: 'Een ✓ verhaal' } };
    const out = await fillSheet(await fakeTemplate(), sheetValues(named, registry));
    expect((await load(out)).getForm().getTextField('CharacterName').getText()).toContain('ukasz');
  });
});

describe('blockFontSize', () => {
  // Every letter is half the font size wide.
  const widthOf = (text: string, size: number) => text.length * size * 0.5;

  it('caps a short text at 10 pt', () => {
    expect(blockFontSize('Order.', 200, 100, widthOf)).toBe(10);
  });

  it('shrinks until the wrapped text fits', () => {
    const size = blockFontSize('word '.repeat(60).trim(), 100, 60, widthOf);
    expect(size).toBeLessThan(10);
    expect(size).toBeGreaterThanOrEqual(5);
  });

  it('shrinks until a long word fits the width', () => {
    expect(blockFontSize('Neverwinter', 40, 100, widthOf)).toBeLessThanOrEqual(40 / (11 * 0.5));
  });

  it('never goes below 5 pt', () => {
    expect(blockFontSize('x '.repeat(5000), 50, 20, widthOf)).toBe(5);
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

  it('turns a malformed form into a not-sheet error', async () => {
    const { PDFDocument, PDFName } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.catalog.set(PDFName.of('AcroForm'), PDFName.of('Broken'));
    const err = await checkTemplate(await doc.save()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TemplateError);
    expect((err as TemplateError).code).toBe('not-sheet');
  });
});
