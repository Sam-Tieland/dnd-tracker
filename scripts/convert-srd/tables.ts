export interface Cell {
  text: string;
  colspan: number;
  header: boolean;
}

export interface Table {
  head: Cell[][];
  body: Cell[][];
}

export function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRows(html: string): Cell[][] {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(/<(td|th)([^>]*)>([\s\S]*?)<\/\1>/g)].map((cell) => ({
      header: cell[1] === 'th',
      colspan: Number(/colspan="(\d+)"/.exec(cell[2])?.[1] ?? '1'),
      text: stripTags(cell[3]),
    })),
  );
}

export function parseTables(md: string): Table[] {
  return [...md.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)].map((table) => ({
    head: parseRows(/<thead>([\s\S]*?)<\/thead>/.exec(table[1])?.[1] ?? ''),
    body: parseRows(/<tbody>([\s\S]*?)<\/tbody>/.exec(table[1])?.[1] ?? ''),
  }));
}

/** The first table after a `**Caption**` line. */
export function tableAfter(md: string, caption: string): Table {
  const start = md.indexOf(`**${caption}**`);
  if (start < 0) throw new Error(`table caption "${caption}" not found`);
  const table = parseTables(md.slice(start))[0];
  if (!table) throw new Error(`no table after caption "${caption}"`);
  return table;
}

/** A body row with one header cell spanning columns, such as "Simple Melee Weapons". */
export function isSectionRow(row: Cell[]): boolean {
  return row.length === 1 && row[0].colspan > 1;
}
