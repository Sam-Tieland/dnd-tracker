import { describe, expect, it } from 'vitest';
import { isSectionRow, parseTables, stripTags, tableAfter } from './tables';

const fixture = `**Bard Features**

<table>
  <thead>
    <tr>
      <th>Level</th>
      <th>Cantrips</th>
      <th colspan="2">——Spell Slots per Spell Level——</th>
    </tr>
    <tr>
      <th>  </th>
      <th>  </th>
      <th>1</th>
      <th>2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>2</td>
      <td>2</td>
      <td>—</td>
      <td></td>
    </tr>
  </tbody>
</table>`;

describe('tables', () => {
  it('parses head rows with colspan and keeps trailing empty cells', () => {
    const table = tableAfter(fixture, 'Bard Features');
    expect(table.head[0].map((c) => [c.text, c.colspan])).toEqual([
      ['Level', 1],
      ['Cantrips', 1],
      ['——Spell Slots per Spell Level——', 2],
    ]);
    expect(table.body[0].map((c) => c.text)).toEqual(['1', '2', '2', '—', '']);
  });

  it('detects section rows', () => {
    const [table] = parseTables(
      '<table><tbody><tr><th colspan="6"><em>Simple Melee Weapons</em></th></tr><tr><td>Club</td></tr></tbody></table>',
    );
    expect(isSectionRow(table.body[0])).toBe(true);
    expect(table.body[0][0].text).toBe('Simple Melee Weapons');
    expect(isSectionRow(table.body[1])).toBe(false);
  });

  it('decodes entities when stripping tags', () => {
    expect(stripTags('<em>Thieves&#39; Tools &amp; more</em>')).toBe("Thieves' Tools & more");
  });

  it('throws when the caption is missing', () => {
    expect(() => tableAfter(fixture, 'Wizard Features')).toThrow('table caption "Wizard Features" not found');
  });
});
