import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const VENDOR_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../vendor/srd-5.2.1');

export function readVendor(file: string): string {
  return readFileSync(path.join(VENDOR_DIR, file), 'utf8').replace(/\r\n/g, '\n');
}
