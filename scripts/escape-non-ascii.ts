/**
 * Escapes every non-ASCII character as `\uXXXX`, using surrogate pair escapes for
 * astral code points.
 *
 * Why this exists: Tampermonkey injects userscripts through an internal
 * `userscript.html` document that re-decodes the script source. Non-ASCII bytes can
 * be mangled on that path (Tampermonkey issue #720 reports locally loaded UTF-8
 * scripts being decoded as Latin-1, and CJK code pages even map the trailing byte
 * `0x5C` to a backslash, which swallows string quotes and shifts brackets). A single
 * mangled byte turns the whole script into an `Uncaught SyntaxError`, so nothing
 * loads at all. Keeping the distributed artifact pure ASCII removes that failure
 * class while the source stays readable.
 *
 * Surrogate pair escapes are required rather than `\u{1F43E}`: the `\u{...}` form is
 * only valid inside a regular expression when the `u` flag is set.
 */
export function escapeNonAscii(source: string): string {
  let escaped = '';
  for (const char of source) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) {
      escaped += char;
      continue;
    }
    if (codePoint > 0xffff) {
      const high = char.charCodeAt(0).toString(16).padStart(4, '0');
      const low = char.charCodeAt(1).toString(16).padStart(4, '0');
      escaped += `\\u${high}\\u${low}`;
      continue;
    }
    escaped += `\\u${codePoint.toString(16).padStart(4, '0')}`;
  }
  return escaped;
}
