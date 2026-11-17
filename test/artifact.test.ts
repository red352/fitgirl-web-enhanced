import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactPath = resolve(root, 'dist/fitgirl-enhanced.user.js');

function isAscii(char: string): boolean {
  return (char.codePointAt(0) ?? -1) <= 0x7f;
}

function isPrintableWhitespace(char: string): boolean {
  return char === '\n' || char === '\t';
}

function findNonAsciiLines(source: string): Array<{ line: number; text: string }> {
  const offenders: Array<{ line: number; text: string }> = [];
  const lines = source.split('\n');
  for (const [index, line] of lines.entries()) {
    if ([...line].every(isAscii)) continue;
    offenders.push({ line: index + 1, text: line.trim().slice(0, 80) });
  }
  return offenders;
}

function hasControlCharacters(source: string): boolean {
  return [...source].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code < 0x20 && !isPrintableWhitespace(char);
  });
}

/**
 * Tampermonkey injects userscripts through an internal `userscript.html` document
 * that re-decodes the script source. Non-ASCII bytes in that path can be mangled,
 * which turns the whole script into an `Uncaught SyntaxError` and nothing loads.
 * The distributed artifact must therefore stay pure ASCII, with non-ASCII source
 * text escaped as `\uXXXX` sequences.
 */
describe('dist/fitgirl-enhanced.user.js', () => {
  const artifact = readFileSync(artifactPath, 'utf8');

  it('exists', () => {
    expect(artifact.length).toBeGreaterThan(0);
  });

  it('contains only ASCII characters', () => {
    expect(findNonAsciiLines(artifact)).toEqual([]);
  });

  it('has no BOM, carriage returns or control characters', () => {
    expect(artifact.codePointAt(0)).not.toBe(0xfeff);
    expect(artifact).not.toContain('\r');
    expect(hasControlCharacters(artifact)).toBe(false);
  });

  it('parses as a classic script', () => {
    expect(() => new Function(artifact)).not.toThrow();
  });

  it('declares the package version in its metadata block', () => {
    const pattern = new RegExp(`^// @version\\s+${pkg.version.replace(/\./g, '\\.')}$`, 'm');
    expect(pattern.test(artifact)).toBe(true);
  });

  it('escapes rather than drops non-ASCII source text', () => {
    // Resolve `\uXXXX` (and surrogate pair) escapes the way a JS engine would.
    const decoded = artifact.replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
    expect(decoded).toContain('今天');
    expect(decoded).toContain('昨天');
    expect(decoded).toContain('简体中文');
    expect(decoded).toContain('🐾');
  });
});
