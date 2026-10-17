/** The Windows-1252 characters in 0x80 to 0x9F that differ from Latin-1 control codes. */
const EXTRAS = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

const ALLOWED = new Set<string>(EXTRAS);
for (let code = 0x20; code <= 0x7e; code++) ALLOWED.add(String.fromCharCode(code));
for (let code = 0xa0; code <= 0xff; code++) ALLOWED.add(String.fromCharCode(code));
ALLOWED.add('\n');

/**
 * Text the standard PDF form font (WinAnsi, Windows-1252) can show. U+2212 (minus) becomes '-', a newline stays,
 * every other character outside Windows-1252 becomes '?'.
 */
export function toWinAnsi(text: string): string {
  let out = '';
  for (const char of text.replace(/\r\n?/g, '\n')) {
    if (char === '−') out += '-';
    else out += ALLOWED.has(char) ? char : '?';
  }
  return out;
}
