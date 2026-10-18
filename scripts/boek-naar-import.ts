import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBuiltinContent } from '../src/content/load';
import { createRegistry } from '../src/content/registry';
import { buildBackup, parseExportFile, serializeExport } from '../src/storage/export';
import { parseBookFile, toUserContent, type BookSubclass } from './boek/convert';

/**
 * Usage: npm run boek -- <map met subclasses/*.md> <uitvoerbestand.json>
 * Writes an import file (a backup with own content and no characters). Keep it private: never in this repository.
 */
const [folder, output] = process.argv.slice(2);
if (!folder || !output) {
  console.error('Gebruik: npm run boek -- "<boekmap>" "<uitvoer.json>"');
  process.exit(1);
}

// The import file holds the player's notes: never write it where git could pick it up.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(output);
if (target.toLowerCase().startsWith(repo.toLowerCase() + sep)) {
  console.error('Schrijf het importbestand buiten de code-map (bijv. in je privé boekmap); het hoort niet in de repository.');
  process.exit(1);
}

const dir = join(folder, 'subclasses');
const warnings: string[] = [];
const subclasses: BookSubclass[] = [];
for (const name of readdirSync(dir).filter((n) => n.endsWith('.md')).sort()) {
  const parsed = parseBookFile(name, readFileSync(join(dir, name), 'utf8'));
  warnings.push(...parsed.warnings);
  if (parsed.subclass) subclasses.push(parsed.subclass);
}

const result = toUserContent(subclasses, createRegistry(loadBuiltinContent()));
warnings.push(...result.warnings);
const text = serializeExport(buildBackup([], result.items, new Date().toISOString()));
// The same gate the app uses on import: if this throws, the file would be refused there too.
const check = parseExportFile(text);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, text);

console.log(`Gelezen: ${subclasses.length} bestanden`);
console.log(`Aangevuld (PHB 2024): ${result.filled.length}`);
console.log(`Toegevoegd (Xanathar's/Tasha's): ${result.added.length}`);
console.log(`Overgeslagen (al compleet in de app): ${result.skipped.join(', ') || '-'}`);
console.log(`Inhoudsitems: ${check.customContent.length}, resources: ${result.items.filter((i) => 'effects' in i && i.effects.length > 0).length}`);
console.log(`Geschreven: ${output}`);
if (warnings.length > 0) console.log(`\nLet op (${warnings.length}):\n- ${warnings.join('\n- ')}`);
