import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBuiltinContent } from '../src/content/load';
import { createRegistry } from '../src/content/registry';
import { runBookIndex } from './boeken/build-index';

/**
 * Usage: npm run boeken -- <boekmap> <uitvoer.json>
 * Reads <boekmap>/inhoud/*.json, subclasses/*.md and import/subclasses.json and writes the private table of contents.
 * Keep the output private: never in this repository.
 */
const [folder, output] = process.argv.slice(2);
if (!folder || !output) {
  console.error('Gebruik: npm run boeken -- "<boekmap>" "<uitvoer.json>"');
  process.exit(1);
}
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const result = runBookIndex(folder, output, repo, createRegistry(loadBuiltinContent()));
for (const line of result.lines) (result.code === 0 ? console.log : console.error)(line);
process.exit(result.code);
