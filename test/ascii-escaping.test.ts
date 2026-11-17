import { describe, expect, it } from 'vitest';
import { escapeNonAscii } from '../scripts/escape-non-ascii';

/**
 * These tests pin down that escaping is a pure text transform: the escaped output
 * must evaluate to exactly the same strings and match exactly the same inputs as
 * the original characters. Without them a future change to the escape format (for
 * example `\u{1F43E}`) could silently corrupt astral characters or regexes.
 */
describe('escapeNonAscii', () => {
  it('leaves ASCII untouched', () => {
    const ascii = 'const a = "plain ascii"; /* comment */\n\ttabs too';
    expect(escapeNonAscii(ascii)).toBe(ascii);
  });

  it('escapes BMP characters as four hex digits', () => {
    expect(escapeNonAscii('今天')).toBe('\\u4eca\\u5929');
    expect(escapeNonAscii('简体中文')).toBe('\\u7b80\\u4f53\\u4e2d\\u6587');
    expect(escapeNonAscii('→')).toBe('\\u2192');
    expect(escapeNonAscii('·')).toBe('\\u00b7');
    expect(escapeNonAscii('⇢')).toBe('\\u21e2');
  });

  it('escapes astral characters as surrogate pairs', () => {
    expect(escapeNonAscii('🐾')).toBe('\\ud83d\\udc3e');
  });

  it('produces output that only contains ASCII', () => {
    const escaped = escapeNonAscii('今天 → 🐾 · – — ‘ ’ “ ” ™ ® ©');
    expect([...escaped].every((char) => (char.codePointAt(0) ?? -1) <= 0x7f)).toBe(true);
  });

  it('keeps escaped string literals semantically identical', () => {
    const originals = [
      '\uD83D\uDC3E Pink Paw',
      '下一张 (→)',
      '简体中文',
      'Next (→)',
      '今天',
      '昨天',
    ];
    for (const original of originals) {
      expect(eval(`"${escapeNonAscii(original)}"`)).toBe(original);
    }
  });

  it('keeps escaped regular expressions semantically identical', () => {
    const pairs: Array<[RegExp, RegExp]> = [
      [/^[⇢→•\-*·\s]+/, /^[\u21e2\u2192\u2022\-*\u00b7\s]+/],
      [/[‘’]/g, /[\u2018\u2019]/g],
      [/[“”]/g, /[\u201c\u201d]/g],
      [/\s*[–—-]\s+.*$/, /\s*[\u2013\u2014-]\s+.*$/],
      [/[\s,+–—-]+$/, /[\s,+\u2013\u2014-]+$/],
      [
        /[:\-–—]?\s*\b([A-Za-z0-9'’-]+\s+)?Edition\*?\b/gi,
        /[:\-\u2013\u2014]?\s*\b([A-Za-z0-9'\u2019-]+\s+)?Edition\*?\b/gi,
      ],
      [/[™®©]/g, /[\u2122\u00ae\u00a9]/g],
      [/[:\-–—_,.!?']/g, /[:\-\u2013\u2014_,.!?']/g],
    ];

    const samples = [
      '  ⇢→•·*  Mirror 1',
      '•-* bullet',
      'plain text',
      '··*x',
      '‘a’b',
      'Game – rest',
      'Game—rest',
      'Game - rest',
      'Game, ',
      'Game – Deluxe Edition',
      'Game: Premium Edition',
      'Bob’s Edition',
      'Game™',
      'Game®',
      'Game©',
      '',
    ];

    for (const [index, [original, escaped]] of pairs.entries()) {
      for (const sample of samples) {
        const expected = JSON.stringify(sample.replace(original, ''));
        const actual = JSON.stringify(sample.replace(escaped, ''));
        expect(actual, `pair ${index} on ${JSON.stringify(sample)}`).toBe(expected);
      }
    }
  });

  it('is idempotent', () => {
    const source = '今天 → 🐾';
    const once = escapeNonAscii(source);
    expect(escapeNonAscii(once)).toBe(once);
  });
});
