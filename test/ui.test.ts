import { describe, expect, it, vi } from 'vitest';
import { FitGirlEnhancedApp } from '../src/ui';
import { fullPage } from './fixtures';

class NoopIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

describe('Enhanced UI Lifecycle', () => {
  it('enhances media, archives, and navigation, and restores completely', async () => {
    vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    document.body.innerHTML = fullPage;
    const content = document.querySelector('#content') as HTMLElement;
    const original = content.innerHTML;
    const app = new FitGirlEnhancedApp();
    await app.start();

    expect(document.querySelectorAll('.fwe-game-layout')).toHaveLength(2);
    expect(document.querySelectorAll('.fwe-upcoming__body a')).toHaveLength(12);
    expect(document.querySelectorAll('.fwe-game-card .fwe-media__item')).toHaveLength(8);
    expect(document.querySelector('.fwe-game-card .fwe-media')?.hasAttribute('open')).toBe(true);

    const switches = document.querySelectorAll<HTMLButtonElement>('.fwe-switch');
    const mediaToggle = switches[1];
    mediaToggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.fwe-game-card .fwe-media')?.hasAttribute('open')).toBe(false);

    mediaToggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.fwe-game-card .fwe-media')?.hasAttribute('open')).toBe(true);

    expect(document.querySelector('.fwe-detail .fwe-media')).toBeNull();
    expect(document.querySelector('.fwe-media__gallery > br')).toBeNull();
    expect(
      document.querySelectorAll('.fwe-browse-dialog__content > .fwe-browse-nav > li'),
    ).toHaveLength(5);
    expect(document.querySelectorAll('.fwe-archive-year')).toHaveLength(2);

    const firstMediaItem = document.querySelector<HTMLAnchorElement>('.fwe-media__item');
    const lightboxDialog = document.querySelector<HTMLDialogElement>('.fwe-lightbox-dialog');
    expect(lightboxDialog).not.toBeNull();
    firstMediaItem?.click();
    expect(lightboxDialog?.hasAttribute('open')).toBe(true);
    expect(document.querySelector('.fwe-lightbox__counter')?.textContent).toBe('1 / 4');

    const nextBtn = document.querySelector<HTMLButtonElement>('.fwe-lightbox__nav--next');
    nextBtn?.click();
    expect(document.querySelector('.fwe-lightbox__counter')?.textContent).toBe('2 / 4');

    const closeBtn = document.querySelector<HTMLButtonElement>('.fwe-lightbox__btn--close');
    closeBtn?.click();
    expect(lightboxDialog?.hasAttribute('open')).toBe(false);

    const mutation = document.createComment('mutation');
    content.append(mutation);
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelectorAll('.fwe-game-layout')).toHaveLength(2);
    mutation.remove();

    const toggle = document.querySelector<HTMLButtonElement>('.fwe-switch');
    toggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.documentElement.dataset.fweMode).toBe('original');
    expect(document.querySelector('.fwe-game-layout')).toBeNull();
    const restored = content.cloneNode(true) as HTMLElement;
    expect(restored.innerHTML).toBe(original);
    expect(document.querySelector('#content-sidebar')).not.toBeNull();

    toggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelectorAll('.fwe-game-layout')).toHaveLength(2);
    vi.unstubAllGlobals();
  });

  it('switches interface language and dynamically updates live labels', async () => {
    vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    // Default language is 'en'
    expect(document.documentElement.dataset.fweLang).toBe('en');
    const viewSummary = document.querySelector('.fwe-view-control__trigger span');
    expect(viewSummary?.textContent).toBe('View');

    // Switch to zh-CN via segmented control button
    const zhBtn = document.querySelector<HTMLButtonElement>('.fwe-segmented__btn:last-child');
    expect(zhBtn?.textContent).toBe('中文');
    zhBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.documentElement.dataset.fweLang).toBe('zh-CN');
    expect(viewSummary?.textContent).toBe('视图');

    // Switch back to en
    const enBtn = document.querySelector<HTMLButtonElement>('.fwe-segmented__btn:first-child');
    expect(enBtn?.textContent).toBe('EN');
    enBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.documentElement.dataset.fweLang).toBe('en');
    expect(viewSummary?.textContent).toBe('View');
    vi.unstubAllGlobals();
  });
});
