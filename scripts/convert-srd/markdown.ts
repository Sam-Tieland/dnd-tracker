export interface Section {
  title: string;
  body: string;
}

/** Split at headings with exactly `depth` hashes. The first section (title '') holds the text before the first heading. */
export function splitSections(md: string, depth: number): Section[] {
  const prefix = `${'#'.repeat(depth)} `;
  const sections: Section[] = [];
  let title = '';
  let lines: string[] = [];
  for (const line of md.split(/\r?\n/)) {
    if (line.startsWith(prefix)) {
      sections.push({ title, body: lines.join('\n').trim() });
      title = line.slice(prefix.length).trim();
      lines = [];
    } else {
      lines.push(line);
    }
  }
  sections.push({ title, body: lines.join('\n').trim() });
  return sections;
}

export function requireSection(sections: Section[], match: string | RegExp, context: string): Section {
  const found = sections.find((s) => (typeof match === 'string' ? s.title === match : match.test(s.title)));
  if (!found) throw new Error(`${context}: section "${String(match)}" not found`);
  return found;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Value of a `**Label:** value` line. */
export function field(md: string, label: string): string | undefined {
  const match = new RegExp(`^\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.+)$`, 'm').exec(md);
  return match?.[1].trim();
}

export function requireField(md: string, label: string, context: string): string {
  const value = field(md, label);
  if (value === undefined) throw new Error(`${context}: field "${label}" not found`);
  return value;
}

/** Drop `**Label:** value` lines for the given labels. */
export function withoutFields(md: string, labels: string[]): string {
  return md
    .split('\n')
    .filter((line) => !labels.some((label) => line.startsWith(`**${label}:**`)))
    .join('\n')
    .trim();
}

/** First integer in the text ("+2" -> 2, "30 feet" -> 30); 0 when there is none ("—"). */
export function toInt(text: string | undefined): number {
  const match = /-?\d+/.exec(text ?? '');
  return match ? Number(match[0]) : 0;
}
