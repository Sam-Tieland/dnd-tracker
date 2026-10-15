export type ContentSource = 'srd' | 'skeleton' | 'user';

/** Lowercase ASCII slug: "Monk's Focus" -> "monks-focus". */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Stable content id such as "srd:feature:barbarian:1:rage". Numbers are kept as-is, strings are slugged. */
export function contentId(source: ContentSource, type: string, ...parts: Array<string | number>): string {
  return [source, type, ...parts.map((part) => (typeof part === 'number' ? String(part) : slugify(part)))].join(':');
}
