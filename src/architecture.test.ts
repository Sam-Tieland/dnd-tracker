import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const LAYERS = ['rules', 'content', 'model', 'dice', 'storage', 'i18n', 'ui'] as const;
type Layer = (typeof LAYERS)[number];

/** Spec §4: rules is pure and knows no storage or UI, storage knows no rules, nothing but ui imports ui. */
const ALLOWED: Record<Layer, { layers: readonly Layer[]; packages: readonly string[] }> = {
  rules: { layers: ['rules', 'content', 'model'], packages: [] },
  content: { layers: ['content'], packages: ['zod'] },
  model: { layers: ['model', 'content'], packages: ['zod'] },
  dice: { layers: ['dice'], packages: [] },
  storage: { layers: ['storage', 'model', 'content'], packages: ['zod', 'dexie'] },
  i18n: { layers: ['i18n'], packages: ['react'] },
  ui: { layers: LAYERS, packages: ['*'] },
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

function layerOf(file: string): Layer | undefined {
  const first = path.relative(SRC, file).split(path.sep)[0];
  return (LAYERS as readonly string[]).includes(first) ? (first as Layer) : undefined;
}

function importsOf(file: string): string[] {
  const code = readFileSync(file, 'utf8');
  const pattern = /\bfrom\s+['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [...code.matchAll(pattern)].map((m) => m[1] ?? m[2] ?? m[3]);
}

const files = walk(SRC).filter((f) => layerOf(f) !== undefined && !f.includes(`${path.sep}testing${path.sep}`));

describe('architecture', () => {
  it.each(files.map((f) => [path.relative(SRC, f), f]))('%s only imports what its layer may use', (_name, file) => {
    const allowed = ALLOWED[layerOf(file)!];
    for (const spec of importsOf(file)) {
      if (spec.startsWith('.')) {
        const target = layerOf(path.resolve(path.dirname(file), spec));
        expect(target === undefined || allowed.layers.includes(target), spec).toBe(true);
      } else if (!allowed.packages.includes('*')) {
        const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
        expect(allowed.packages, spec).toContain(pkg);
      }
    }
  });

  const rules = files.filter((f) => layerOf(f) === 'rules');
  it.each(rules.map((f) => [path.relative(SRC, f), f]))('%s uses no clock, randomness, storage or browser', (_name, file) => {
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/\b(Date|Math\.random|crypto|indexedDB|localStorage|sessionStorage|fetch|window|document|navigator|setTimeout|setInterval)\b/);
  });
});
