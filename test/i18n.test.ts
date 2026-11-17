import { describe, expect, it } from 'vitest';
import { translations } from '../src/i18n';

/** Reads one raw translation value, so both tables can be compared as plain maps. */
function valueOf(table: object, key: string): string {
  return (table as Record<string, string | undefined>)[key] ?? '';
}

/** Interpolation tokens in a string, sorted so declaration order does not matter. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([\w-]+)\}/g)].map((match) => match[1] ?? '').sort();
}

/**
 * `translations` is declared `as const` and `t()` falls back to English, so a
 * key that exists only in `en` renders English inside the zh-CN UI without any
 * error — TypeScript sees two independent literal objects and the fallback is a
 * runtime `??`, not a contract. These tests are the only guard against that
 * silent half-translation.
 */
describe('i18n translation tables', () => {
  it('keeps en and zh-CN on the same keys in the same order', () => {
    const enKeys = Object.keys(translations.en);
    const zhKeys = Object.keys(translations['zh-CN']);

    expect(enKeys.filter((key) => !zhKeys.includes(key))).toEqual([]);
    expect(zhKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
    // Same set is not enough: parallel tables are edited side by side, and a key
    // inserted in only one place usually means the matching edit was missed.
    expect(zhKeys).toEqual(enKeys);
  });

  it('keeps the same interpolation placeholders on both sides', () => {
    const mismatched = Object.keys(translations.en)
      .filter((key) => {
        const en = placeholders(valueOf(translations.en, key)).join('|');
        const zh = placeholders(valueOf(translations['zh-CN'], key)).join('|');
        return en !== zh;
      })
      .map((key) => ({ key, en: valueOf(translations.en, key) }));
    expect(mismatched).toEqual([]);
  });
});
