import { describe, expect, it, vi } from 'vitest';
import { FitGirlEnhancedApp } from '../src/ui';
import { fullPage } from './fixtures';
import {
  THEME_STORAGE_KEY,
  getFastStoredTheme,
  readStoredTheme,
  writeStoredTheme,
} from '../src/preferences';

class NoopIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

function stubEnvironment(): void {
  vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function themeButtons(): HTMLButtonElement[] {
  return [
    ...document.querySelectorAll<HTMLButtonElement>('.fwe-segmented--theme .fwe-segmented__btn'),
  ];
}

function themeButton(value: string): HTMLButtonElement | undefined {
  return themeButtons().find((button) => button.dataset.theme === value);
}

describe('Theme preference storage', () => {
  it('follows the system until the reader picks a side', () => {
    // The design doc makes `system` the default: a reader who never touched the
    // control must not be locked into the palette the site shipped with.
    expect(getFastStoredTheme()).toBe('system');
  });

  it('reads a stored theme synchronously, before IndexedDB is open', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(getFastStoredTheme()).toBe('dark');
  });

  it('falls back to system for an unrecognised stored value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solarized');
    expect(getFastStoredTheme()).toBe('system');
  });

  it('round-trips through the async reader', async () => {
    expect(await readStoredTheme()).toBe('system');
    await writeStoredTheme('light');
    expect(await readStoredTheme()).toBe('light');
    await writeStoredTheme('dark');
    expect(await readStoredTheme()).toBe('dark');
  });
});

describe('Theme control', () => {
  it('renders a three-state theme row that defaults to system', async () => {
    stubEnvironment();
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    expect(themeButtons()).toHaveLength(3);
    expect(themeButton('light')?.textContent).toBe('Light');
    expect(themeButton('dark')?.textContent).toBe('Dark');
    expect(themeButton('system')?.textContent).toBe('System');
    expect(themeButton('system')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.dataset.fweTheme).toBe('system');
    vi.unstubAllGlobals();
  });

  it('applies a forced dark theme to the document and persists it', async () => {
    stubEnvironment();
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    themeButton('dark')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.documentElement.dataset.fweTheme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(themeButton('dark')?.getAttribute('aria-pressed')).toBe('true');
    expect(themeButton('system')?.getAttribute('aria-pressed')).toBe('false');
    vi.unstubAllGlobals();
  });

  it('applies a forced light theme and keeps the accent button readable', async () => {
    stubEnvironment();
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    themeButton('light')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.documentElement.dataset.fweTheme).toBe('light');
    expect(themeButton('light')?.classList.contains('fwe-segmented__btn--active')).toBe(true);
    vi.unstubAllGlobals();
  });

  it('restores a persisted dark theme on the next visit', async () => {
    stubEnvironment();
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    expect(document.documentElement.dataset.fweTheme).toBe('dark');
    expect(themeButton('dark')?.getAttribute('aria-pressed')).toBe('true');
    vi.unstubAllGlobals();
  });

  it('keeps the system state declarative instead of resolving it in script', async () => {
    // The palette for `system` is switched by `color-scheme: light dark` plus a
    // `prefers-color-scheme` token block. A JS resolver would have to re-run on
    // every OS flip and would re-flash the page; this test fails if one appears.
    stubEnvironment();
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    expect(document.documentElement.dataset.fweTheme).toBe('system');
    themeButton('system')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.documentElement.dataset.fweTheme).toBe('system');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    vi.unstubAllGlobals();
  });
});
