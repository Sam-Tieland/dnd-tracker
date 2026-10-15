import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { convertAll, OUTPUT_SCHEMAS } from './convert';

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/content/srd/generated');

// Validate every file first, so a schema failure never leaves a half-written, inconsistent generated tree.
const validated = Object.entries(convertAll()).map(([name, items]) => {
  const schema = OUTPUT_SCHEMAS[name as keyof typeof OUTPUT_SCHEMAS];
  return { name, parsed: z.array(schema).parse(items) };
});

mkdirSync(OUT_DIR, { recursive: true });
for (const { name, parsed } of validated) {
  writeFileSync(path.join(OUT_DIR, `${name}.json`), `${JSON.stringify(parsed, null, 2)}\n`);
  console.log(`${name}: ${parsed.length}`);
}
