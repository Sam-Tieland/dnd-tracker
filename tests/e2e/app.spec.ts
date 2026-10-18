import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { fakeTemplate } from '../../src/ui/pdf/testing/fake-template';

async function createKael(page: Page) {
  await page.goto('./');
  await page.getByRole('link', { name: 'New character' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Kael');
  await page.getByLabel('New class', { exact: true }).selectOption('srd:class:fighter');
  await page.getByRole('button', { name: 'Add class' }).click();
  await page.getByLabel('New class', { exact: true }).selectOption('srd:class:wizard');
  await page.getByRole('button', { name: 'Add class' }).click();
  await expect(page.getByText(/Multiclass prerequisite not met for Fighter/)).toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: 'Kael' })).toBeVisible();
}

async function damage(page: Page, amount: string) {
  await page.getByLabel('Amount').fill(amount);
  await page.getByRole('button', { name: /Damage/ }).click();
}

test('create a multiclass character, take damage, undo, rest, and find it again', async ({ page }) => {
  await createKael(page);
  await expect(page.getByText('Fighter 1 / Wizard 1 · Level 2')).toBeVisible();
  const hp = page.getByTestId('hp');
  await expect(hp).toHaveText('14/14');
  await damage(page, '5');
  await expect(hp).toHaveText('9/14');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(hp).toHaveText('14/14');
  await damage(page, '5');
  await page.getByRole('button', { name: 'Long Rest' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Take Long Rest' }).click();
  await expect(hp).toHaveText('14/14');
  await damage(page, '3');
  await expect(hp).toHaveText('11/14');
  await page.getByRole('link', { name: 'Back' }).click();
  await page.getByRole('link', { name: /Kael/ }).click();
  await expect(page.getByTestId('hp')).toHaveText('11/14');
  await page.reload();
  await expect(page.getByTestId('hp')).toHaveText('11/14');
});

test('a subclass chosen on level 1 gives no features until its level, and the level buttons are tappable', async ({ page, browserName }) => {
  await createKael(page);
  await page.getByRole('link', { name: 'Edit' }).click();
  const addFighter = page.getByRole('button', { name: 'Add Fighter level' });
  await expect(addFighter).toBeVisible();
  if (browserName === 'webkit') {
    const box = await addFighter.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await page.locator('section.class-block').filter({ has: page.getByRole('heading', { name: 'Fighter' }) }).getByLabel('Subclass').selectOption('srd:subclass:champion');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('tab', { name: 'Features' }).click();
  await expect(page.getByText('Improved Critical')).toHaveCount(0);
  await page.getByRole('link', { name: 'Edit' }).click();
  await addFighter.click();
  await addFighter.click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('tab', { name: 'Features' }).click();
  await expect(page.getByText('Improved Critical').first()).toBeVisible();
});

test('export a character as a JSON file', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'On the iPad export opens the share sheet; that is checked by hand (spec §16).');
  await createKael(page);
  await page.getByRole('link', { name: 'Back' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^kael-\d{4}-\d{2}-\d{2}\.json$/);
  const json = JSON.parse(await readFile(await file.path(), 'utf8'));
  expect(json).toMatchObject({ format: 'dnd-tracker-export', version: 1, kind: 'character', characters: [{ name: 'Kael' }] });
});

test('exports a filled character sheet', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'On the iPad the PDF opens the share sheet; that is checked by hand (spec §16).');
  await createKael(page);
  await page.getByRole('link', { name: 'Back' }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByTestId('sheet-input').setInputFiles({ name: 'sheet.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await fakeTemplate()) });
  await expect(page.getByText('Sheet: sheet.pdf')).toBeVisible();
  await page.getByRole('link', { name: 'Back' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF Kael' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^kael-\d{4}-\d{2}-\d{2}\.pdf$/);
  const doc = await PDFDocument.load(await readFile(await file.path()));
  expect(doc.getForm().getTextField('CharacterName').getText()).toBe('Kael');
});

test('imports an exported character as a copy', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Needs the download of the export test; the file chooser itself is the same on the iPad.');
  await createKael(page);
  await page.getByRole('link', { name: 'Back' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const path = await (await download).path();
  // Import sits next to New character on the list.
  await page.getByTestId('import-input').setInputFiles(path);
  const dialog = page.getByRole('dialog', { name: 'Import file' });
  await expect(dialog.getByText('Already on this device')).toBeVisible();
  await dialog.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByText('Imported: 0 new, 0 replaced, 1 copies, 0 content item(s).')).toBeVisible();
  await expect(page.getByRole('link', { name: /Kael/ })).toHaveCount(2);
});

test('reports an invalid import file', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Settings' }).click();
  // The list has an import input too; wait until Settings has replaced it.
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByTestId('import-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByText('This file is not an export of this app.')).toBeVisible();
});

test('switches the interface to Dutch and the theme to dark', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByLabel('Language').selectOption('nl');
  await expect(page.getByRole('heading', { name: 'Instellingen' })).toBeVisible();
  await page.getByLabel('Thema').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('works offline after the first visit', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Offline runs in Chromium here; on the iPad it is checked by hand in airplane mode (spec §16).');
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible();
});

async function fakeBook(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pages; i++) doc.addPage([300, 400]).drawText(`Test page ${i}`, { x: 40, y: 200 });
  return Buffer.from(await doc.save());
}

test('read a book from the sheet', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', "Playwright's WebKit cannot store a Blob in IndexedDB (UnknownError); on the iPad the book flow is checked by hand (spec §16).");
  test.setTimeout(90_000);
  const index = {
    format: 'dnd-tracker-book-index',
    version: 1,
    books: [
      {
        bookId: 'tce',
        pdfPages: 20,
        pageMap: [{ fromPdf: 1, toPdf: 20, firstBook: 1, perPdfPage: 1 }],
        entries: [
          { id: 'chapter-a', title: 'Chapter A', type: 'chapter', bookPage: 3, contentIds: [] },
          { id: 'test-spellcasting', title: 'Test Casting', type: 'feature', bookPage: 7, parentId: 'chapter-a', contentIds: ['srd:feature:cleric:1:spellcasting'] },
        ],
      },
    ],
  };

  await page.goto('./');
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByTestId('book-input').setInputFiles({ name: "Tasha's Test.pdf", mimeType: 'application/pdf', buffer: await fakeBook(20) });
  const dialog = page.getByRole('dialog', { name: 'Which book is this?' });
  await dialog.getByLabel('Which book is this?').selectOption('tce');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/Tasha's Test\.pdf/)).toBeVisible();
  await page.getByTestId('book-index-input').setInputFiles({ name: 'index.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(index)) });
  await expect(page.getByText(/Table of contents imported/)).toBeVisible();

  await page.getByRole('link', { name: 'Back' }).click();
  await page.getByRole('link', { name: 'New character' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Mira');
  await page.getByLabel('New class', { exact: true }).selectOption('srd:class:cleric');
  await page.getByRole('button', { name: 'Add class' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: 'Mira' })).toBeVisible();

  await page.getByRole('tab', { name: 'Features' }).click();
  await page.locator('details.feature', { hasText: 'Spellcasting' }).first().locator('summary').click();
  const inBook = page.getByRole('link', { name: /^Read Spellcasting in Tasha's Cauldron of Everything, p\. 7$/ });
  await expect(inBook).toBeVisible();
  await inBook.click();

  await expect(page.getByTestId('page-label')).toHaveText('p. 7');
  await expect(page.locator('.book-reader canvas').first()).toBeVisible();

  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Mira' })).toBeVisible();

  await page.goto('./#/books');
  await page.reload();
  await expect(page.getByTestId('page-label')).toHaveText('p. 7');
});
