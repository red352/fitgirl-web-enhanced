import { describe, expect, it, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { FitGirlEnhancedApp, refillThirdPartyCommentCounts } from '../src/ui';
import { setActiveLanguage } from '../src/i18n';
import {
  archiveListingPage,
  archiveListingPage2,
  archiveListingPage2Content,
  commentsSection,
  fullPage,
  gameArticle,
  pinkPawStreamPage,
  postNavigation,
  siteFooterExtras,
  siteHeader,
  siteSidebarExtras,
  withTodayDate,
} from './fixtures';

const sampleRatingCacheKey = 'fitgirl-web-enhanced:v1:rating:sample game: deluxe edition';

const singlePageWithNavigation = `
${siteHeader}
<div id="page"><main id="main"><div id="primary"><div id="content">${gameArticle}${postNavigation}</div></div>${siteSidebarExtras}</main>${siteFooterExtras}</div>`;

const singlePageWithComments = `
${siteHeader}
<div id="page"><main id="main"><div id="primary"><div id="content">${gameArticle}${postNavigation}${commentsSection}</div></div>${siteSidebarExtras}</main>${siteFooterExtras}</div>`;

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
    const page = document.querySelector('#page') as HTMLElement;
    const original = content.innerHTML;
    const originalPage = page.innerHTML;
    const app = new FitGirlEnhancedApp();
    await app.start();

    expect(document.querySelectorAll('.fwe-game-layout')).toHaveLength(2);
    expect(document.querySelectorAll('.fwe-upcoming__body a')).toHaveLength(12);
    expect(document.querySelectorAll('.fwe-game-card .fwe-media__item')).toHaveLength(12);
    expect(document.querySelector('.fwe-game-card .fwe-media')?.hasAttribute('open')).toBe(false);

    const switches = document.querySelectorAll<HTMLButtonElement>('.fwe-switch');
    const mediaToggle = switches[1];
    mediaToggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.fwe-game-card .fwe-media')?.hasAttribute('open')).toBe(true);

    mediaToggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.fwe-game-card .fwe-media')?.hasAttribute('open')).toBe(false);

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
    expect(document.querySelector('.fwe-lightbox__counter')?.textContent).toBe('1 / 6');

    const nextBtn = document.querySelector<HTMLButtonElement>('.fwe-lightbox__nav--next');
    nextBtn?.click();
    expect(document.querySelector('.fwe-lightbox__counter')?.textContent).toBe('2 / 6');

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
    expect(page.innerHTML).toBe(originalPage);
    expect(document.querySelector('#secondary')).not.toBeNull();
    expect(document.querySelector('#colophon')).not.toBeNull();

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
    // 详情页的上一篇/下一篇需要在页面里，才能验证语言切换是否追到它
    document.querySelector('#content')?.insertAdjacentHTML('beforeend', postNavigation);
    const app = new FitGirlEnhancedApp();
    await app.start();

    // Default language is 'en'
    expect(document.documentElement.dataset.fweLang).toBe('en');
    const viewSummary = document.querySelector('.fwe-view-control__trigger span');
    expect(viewSummary?.textContent).toBe('View');
    const postNavLabels = (): (string | null)[] =>
      [...document.querySelectorAll('#content > .post-navigation .meta-nav')].map(
        (node) => node.textContent,
      );
    expect(postNavLabels()).toEqual(['Previous Post', 'Next Post']);

    // Switch to zh-CN via segmented control button
    const zhBtn = document.querySelector<HTMLButtonElement>(
      '.fwe-segmented--lang .fwe-segmented__btn:last-child',
    );
    expect(zhBtn?.textContent).toBe('中文');
    zhBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.documentElement.dataset.fweLang).toBe('zh-CN');
    expect(viewSummary?.textContent).toBe('视图');
    expect(document.querySelector('.fwe-upcoming__details-link')?.textContent).toBe('详情与评论');
    expect(postNavLabels()).toEqual(['上一篇', '下一篇']);

    // Switch back to en
    const enBtn = document.querySelector<HTMLButtonElement>(
      '.fwe-segmented--lang .fwe-segmented__btn:first-child',
    );
    expect(enBtn?.textContent).toBe('EN');
    enBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.documentElement.dataset.fweLang).toBe('en');
    expect(viewSummary?.textContent).toBe('View');
    expect(document.querySelector('.fwe-upcoming__details-link')?.textContent).toBe(
      'View details & comments',
    );
    expect(postNavLabels()).toEqual(['Previous Post', 'Next Post']);
    vi.unstubAllGlobals();
  });

  it('keeps the view control anchored consistently and clears rating cache for immediate refresh', async () => {
    vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const viewControl = document.querySelector<HTMLElement>('.fwe-view-control');
    expect(viewControl).not.toBeNull();
    expect(document.documentElement.dataset.fweMode).toBe('enhanced');
    await Promise.resolve();

    const clearButton = document.querySelector<HTMLButtonElement>('.fwe-cache-clear-button');
    expect(clearButton).not.toBeNull();
    expect(clearButton?.disabled).toBe(false);
    expect(window.localStorage.getItem(sampleRatingCacheKey)).toBeNull();

    window.localStorage.setItem(
      sampleRatingCacheKey,
      JSON.stringify({ data: null, timestamp: Date.now() }),
    );
    clearButton?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(window.localStorage.getItem(sampleRatingCacheKey)).toBeNull();
    expect(document.querySelector('.fwe-view-control__status')?.textContent).toBe(
      'Rating cache cleared',
    );

    const ratingToggle = document.querySelectorAll<HTMLButtonElement>('.fwe-switch')[3];
    ratingToggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.documentElement.dataset.fweShowRatings).toBe('false');
    expect(clearButton?.disabled).toBe(false);
    window.localStorage.setItem(
      sampleRatingCacheKey,
      JSON.stringify({ data: null, timestamp: Date.now() }),
    );
    clearButton?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(window.localStorage.getItem(sampleRatingCacheKey)).toBeNull();

    expect(document.querySelector('.fwe-upcoming__details-link')?.getAttribute('href')).toBe(
      'http://localhost:3000/upcoming-repacks/',
    );

    const backToTop = document.querySelector<HTMLButtonElement>('.fwe-back-to-top');
    expect(backToTop).not.toBeNull();
    expect(backToTop?.classList.contains('fwe-back-to-top--visible')).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('Original content restoration', () => {
  it('surfaces comment count, categories and author as meta chips', async () => {
    stubEnvironment();
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const meta = document.querySelector('.fwe-game-card .fwe-article-meta');
    expect(meta).not.toBeNull();
    expect(meta?.querySelectorAll('.fwe-meta-chip').length).toBeGreaterThanOrEqual(4);
    expect(meta?.textContent).toContain('September 2, 2026');
    expect(meta?.querySelector('a[href="/category/lossless-repack/"]')).not.toBeNull();
    expect(meta?.querySelector('a[href="/category/pink-paw-award/"]')).not.toBeNull();
    expect(meta?.querySelector('a[href="/author/fitgirl/"]')).not.toBeNull();
    expect(meta?.querySelector('a[href="/sample-game/#respond"]')).not.toBeNull();
    expect(meta?.textContent).toContain('37 comments');

    // Tolstoy injects the live count into this node asynchronously, so it must survive the move
    const counter = document.querySelector('.fwe-game-card .tolstoycomments-cc');
    expect(counter).not.toBeNull();
    expect(counter?.closest('.fwe-article-meta')).toBe(meta);
    expect(counter?.textContent).toContain('37 comments');

    // The raw meta rows are emptied instead of being rendered a second time
    expect(document.querySelector('.fwe-game-card .entry-meta .cat-links a')).toBeNull();
    expect(document.querySelector('.fwe-game-card .entry-meta .byline a')).toBeNull();
    expect(document.querySelector('.fwe-game-card .entry-meta .comments-link a')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('restores sidebar and footer content inside the extras section', async () => {
    stubEnvironment();
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const extras = document.querySelector('.fwe-site-extras');
    expect(extras).not.toBeNull();
    expect(extras?.parentElement?.id).toBe('main');

    const text = extras?.textContent ?? '';
    expect(text).toContain('The ONLY official site for FitGirl Repacks');
    expect(text).toContain('Support the Cause');
    expect(text).toContain('My RSS Feed');
    expect(text).toContain('Subscribe to my releases via Email');
    expect(text).toContain('Press Play for my OST');
    expect(text).toContain('Today’s Most Popular Repacks');

    // 防伪警示必须带上该 class，CSS 才能把它从 display:none 里救回来
    const notice = extras?.querySelector('.fwe-extras-notice__text');
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain('The ONLY official site for FitGirl Repacks');
    expect(notice?.closest('.fwe-extras-notice')).not.toBeNull();

    expect(extras?.querySelectorAll('.fwe-directory-tile')).toHaveLength(10);
    expect(extras?.querySelector('.fwe-extras-block input[type="email"]')).not.toBeNull();
    // 页脚带里第一格是捐赠：热门块现在排在带子之前，故按带子作用域取标题
    expect(
      extras?.querySelector('.fwe-extras-block--strip .fwe-extras-block__title')?.textContent,
    ).toBe('Support the Cause');

    // Monthly archives stay inside the Browse dialog instead of being duplicated
    expect(extras?.querySelector('#archives-2')).toBeNull();
    expect(document.querySelector('#archives-2')?.closest('.fwe-site-extras')).toBeNull();

    // The footer widget ships theme CSS that must not leak into the enhanced layout
    expect(document.querySelector('#block-6 style')?.getAttribute('media')).toBe('not all');
    vi.unstubAllGlobals();
  });

  it('demotes the donation, RSS, subscription and OST widgets into one strip', async () => {
    // Four equal-weight cards said "this is content". The spec's call is that
    // only the scam warning and the popular grid deserve that weight, so the
    // four utility widgets become cells of a single low-weight footer band.
    stubEnvironment();
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const strip = document.querySelector('.fwe-extras-block--strip');
    expect(strip).not.toBeNull();
    // One band, not four blocks: the whole point of the demotion.
    expect(document.querySelectorAll('.fwe-extras-block--strip')).toHaveLength(1);

    const cells = [...(strip?.querySelectorAll('.fwe-extras-strip__cell') ?? [])];
    expect(cells).toHaveLength(4);
    expect(
      cells.map((cell) => cell.querySelector('.fwe-extras-block__title')?.textContent),
    ).toEqual([
      'Support the Cause',
      'My RSS Feed',
      'Subscribe to my releases via Email',
      'Press Play for my OST',
    ]);

    // Each cell carries its own widget's body, and nothing else moved in.
    expect(strip?.textContent).toContain('consider supporting the cause');
    expect(strip?.textContent).toContain('FitGirl RSS Feed');
    expect(strip?.querySelector('input[type="email"]')).not.toBeNull();
    expect(strip?.querySelector('button[type="submit"]')?.textContent).toBe('Subscribe');

    // The two blocks that keep their weight are untouched by the merge.
    const notice = document.querySelector('.fwe-extras-notice');
    expect(notice).not.toBeNull();
    expect(notice?.querySelector('.fwe-extras-block--strip')).toBeNull();
    expect(document.querySelector('.fwe-extras-block--wide')).not.toBeNull();
    expect(document.querySelectorAll('.fwe-extras-block--wide .fwe-directory-tile')).toHaveLength(
      10,
    );

    // The popular grid sits between the warning and the footer band: the band
    // is site chrome and belongs last.
    const blocks = [...(document.querySelector('.fwe-site-extras')?.children ?? [])].map(
      (node) => node.className,
    );
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toContain('fwe-extras-notice');
    expect(blocks[1]).toContain('fwe-extras-block--wide');
    expect(blocks[2]).toContain('fwe-extras-block--strip');

    // Monthly archives are still excluded from the band.
    expect(strip?.querySelector('#archives-2')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('把 OST 格的 YouTube iframe 换成点击加载的海报瓦片', async () => {
    stubEnvironment();
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const tiles = [...document.querySelectorAll('.fwe-ost-tile')];
    expect(tiles).toHaveLength(2);
    expect(tiles[0]?.querySelector('img')?.getAttribute('src')).toBe(
      'https://i.ytimg.com/vi/72QAAOaYW2M/hqdefault.jpg',
    );
    expect(tiles[1]?.querySelector('img')?.getAttribute('src')).toBe(
      'https://i.ytimg.com/vi/IFzUTKsrbN8/hqdefault.jpg',
    );
    // 瓦片是海报占位：播放图标与本地化的无障碍标签都在
    expect(document.querySelectorAll('.fwe-ost-tile__play svg')).toHaveLength(2);
    expect(tiles[0]?.getAttribute('aria-label')).toBe('Play soundtrack');
    // iframe 留在 DOM 里，但 src 已被撤除——只靠 display: none 藏起来的
    // iframe 依然会连出去，撤掉 src 才真正停掉在途的播放器加载
    const frames = [...document.querySelectorAll<HTMLIFrameElement>('iframe')];
    expect(frames).toHaveLength(2);
    frames.forEach((frame) => expect(frame.hasAttribute('src')).toBe(false));
    // 待加载类与 --ost 的格子类都挂上了
    const pending = document.querySelectorAll('.fwe-ost-pending');
    expect(pending).toHaveLength(2);
    expect(document.querySelectorAll('.fwe-extras-strip__cell--ost')).toHaveLength(1);

    // 点击瓦片：瓦片消失，iframe 放出来，原 src 写回（另一枚仍未连接）
    (tiles[0] as HTMLElement).click();
    expect(document.querySelectorAll('.fwe-ost-tile')).toHaveLength(1);
    expect(document.querySelectorAll('.fwe-ost-pending')).toHaveLength(1);
    expect(frames[0]?.getAttribute('src')).toBe('https://www.youtube.com/embed/72QAAOaYW2M');
    expect(frames[1]?.hasAttribute('src')).toBe(false);

    // 切回原站模式：瓦片与类都不留残渣，src 逐字还原
    document.querySelector<HTMLButtonElement>('.fwe-switch')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.fwe-ost-tile')).toBeNull();
    expect(document.querySelector('.fwe-ost-pending')).toBeNull();
    expect(document.querySelectorAll('.fwe-ost-tile__play svg')).toHaveLength(0);
    expect(document.querySelectorAll('.fwe-extras-strip__cell--ost')).toHaveLength(0);
    const restored = [...document.querySelectorAll<HTMLIFrameElement>('#custom_html-4 iframe')];
    expect(restored).toHaveLength(2);
    expect(restored[0]?.getAttribute('src')).toBe('https://www.youtube.com/embed/72QAAOaYW2M');
    expect(restored[1]?.getAttribute('src')).toBe('https://www.youtube.com/embed/IFzUTKsrbN8');
    vi.unstubAllGlobals();
  });

  it('restores the strip widgets back to the sidebar on original mode', async () => {
    // The merge changes the container, not the moves: every widget has to land
    // back in #primary-sidebar, in its original order, or the restoration
    // guarantee is broken by a cosmetic refactor. (Byte-exact restoration of the
    // whole page is covered separately; this pins the band's own contribution.)
    stubEnvironment();
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const before = [...(document.querySelector('#primary-sidebar')?.children ?? [])].map(
      (node) => node.id,
    );
    expect(before).toEqual([
      'custom_html-5',
      'custom_html-2',
      'blog_subscription-2',
      'archives-2',
      'custom_html-4',
    ]);

    document.querySelector<HTMLButtonElement>('.fwe-switch')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.documentElement.dataset.fweMode).toBe('original');
    expect(document.querySelector('.fwe-extras-block--strip')).toBeNull();
    const after = [...(document.querySelector('#primary-sidebar')?.children ?? [])].map(
      (node) => node.id,
    );
    expect(after).toEqual(before);
    vi.unstubAllGlobals();
  });

  it('keeps single post navigation visible while infinite scroll is enabled', async () => {
    stubEnvironment();
    document.body.className = 'single single-post';
    document.body.innerHTML = singlePageWithNavigation;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const nav = document.querySelector<HTMLElement>('#content > .post-navigation');
    expect(nav).not.toBeNull();
    expect(nav?.style.display).toBe('');

    const infiniteToggle = document.querySelectorAll<HTMLButtonElement>('.fwe-switch')[2];
    infiniteToggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      (document.querySelector('#content > .post-navigation') as HTMLElement | null)?.style
        .display ?? '',
    ).toBe('');

    infiniteToggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      (document.querySelector('#content > .post-navigation') as HTMLElement | null)?.style
        .display ?? '',
    ).toBe('');

    const extras = document.querySelector('.fwe-site-extras');
    expect(extras).not.toBeNull();
    expect(extras?.textContent).toContain('Support the Cause');
    vi.unstubAllGlobals();
  });

  it('把上一篇/下一篇的英文标签本地化，并给标题留两行截断', async () => {
    // 构造器会用 navigator.language 重置全局语言，所以语言环境必须在这里设定
    localStorage.clear();
    vi.stubGlobal('navigator', { language: 'zh-CN' });
    stubEnvironment();
    document.body.innerHTML = singlePageWithNavigation;
    const app = new FitGirlEnhancedApp();
    await app.start();
    expect(document.documentElement.dataset.fweLang).toBe('zh-CN');

    const labels = [...document.querySelectorAll('#content > .post-navigation .meta-nav')].map(
      (node) => node.textContent,
    );
    expect(labels).toEqual(['上一篇', '下一篇']);

    // 每枚链接带一个箭头图标，标题由 CSS 截断
    const icons = document.querySelectorAll('#content > .post-navigation .nav-links a .fwe-icon');
    expect(icons).toHaveLength(2);

    // next 箭头必须紧跟在标签之后（标签 → 箭头 → 标题），不是标签之前
    const nextArrow = document.querySelectorAll('.fwe-nav-arrow')[1];
    const links = document.querySelectorAll<HTMLAnchorElement>(
      '#content > .post-navigation .nav-links a',
    );
    expect(links[1]?.children[1]).toBe(nextArrow);

    // 标题必须单独包在 .fwe-nav-title 里，不跟标签挤在同一行内流。
    // 否则 CSS 的 2 行 clamp 是「标签 + 标题」合并算的，标题只剩 1 行就被截断。
    for (const link of links) {
      const title = link.querySelector('.fwe-nav-title');
      expect(title, 'each nav link wraps its title in .fwe-nav-title').not.toBeNull();
      expect(title?.textContent).toBeTruthy();
      // .meta-nav 与 .fwe-nav-title 是兄弟，标题不再是 <a> 的裸文本节点
      expect(link.querySelector('.meta-nav')?.nextElementSibling).not.toBe(title); // 中间隔着箭头
      expect(
        [...link.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()),
      ).toBe(false);
    }

    // 切语言后标题仍在包好的 span 里（applyLanguage 只改 .meta-nav 的文本节点）
    const enBtn = [...document.querySelectorAll<HTMLButtonElement>('.fwe-segmented__btn')].find(
      (b) => b.textContent === 'EN',
    );
    enBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelectorAll('#content > .post-navigation .fwe-nav-title')).toHaveLength(2);
    setActiveLanguage('zh-CN');

    // 切回原站模式：包标题的 span 全部回收，还原成裸文本节点
    document.querySelector<HTMLButtonElement>('.fwe-switch')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.documentElement.dataset.fweMode).toBe('original');
    expect(
      [...document.querySelectorAll('#content > .post-navigation .meta-nav')].map(
        (node) => node.textContent,
      ),
    ).toEqual(['Previous Post', 'Next Post']);
    expect(document.querySelectorAll('.fwe-nav-arrow')).toHaveLength(0);

    setActiveLanguage('en');
    vi.unstubAllGlobals();
  });

  it('把 extras 插到评论区之前，避免评论 iframe 长高时把内容踹飞', async () => {
    stubEnvironment();
    document.body.innerHTML = singlePageWithComments;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const extras = document.querySelector('.fwe-site-extras') as HTMLElement;
    const comments = document.querySelector<HTMLElement>(
      '#content > div[data-source-theme="tolstoycomments"], #content > .tolstoycomments-feed',
    );
    expect(extras).not.toBeNull();
    expect(comments).not.toBeNull();

    // 同一父节点，且 extras 排在评论区之前
    expect(extras.parentElement).toBe(comments?.parentElement);
    expect(
      extras.compareDocumentPosition(comments as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // 仍然跟在 post-navigation 之后，不插到文章前面
    const nav = document.querySelector('#content > .post-navigation') as HTMLElement;
    expect(nav.compareDocumentPosition(extras) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // 切回原站模式后不留残渣
    document.querySelector<HTMLButtonElement>('.fwe-switch')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.fwe-site-extras')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('fully restores sidebar and footer markup when switching back to the original layout', async () => {
    stubEnvironment();
    document.body.innerHTML = fullPage;
    const page = document.querySelector('#page') as HTMLElement;
    const originalPage = page.innerHTML;
    const app = new FitGirlEnhancedApp();
    await app.start();

    expect(document.querySelector('.fwe-site-extras')).not.toBeNull();
    expect(
      document.querySelector('.fwe-game-card .tolstoycomments-cc')?.closest('.fwe-article-meta'),
    ).not.toBeNull();

    const toggle = document.querySelector<HTMLButtonElement>('.fwe-switch');
    toggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector('.fwe-site-extras')).toBeNull();
    expect(page.innerHTML).toBe(originalPage);
    expect(document.querySelector('#secondary .site-description')).not.toBeNull();
    expect(document.querySelector('#block-6 .widgettitle')).not.toBeNull();
    expect(document.querySelector('#block-6 style')?.hasAttribute('media')).toBe(false);
    expect(document.querySelector('article.hentry .entry-meta .comments-link a')).not.toBeNull();
    vi.unstubAllGlobals();
  });
});

/** 可控的 IntersectionObserver 测试替身：记录 observe 目标，便于精准触发 */
class ControllableIntersectionObserver {
  static instances: ControllableIntersectionObserver[] = [];

  private readonly callback: IntersectionObserverCallback;
  private readonly observed: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    ControllableIntersectionObserver.instances.push(this);
  }

  observe = (target: Element): void => {
    this.observed.push(target);
  };

  disconnect = (): void => undefined;

  unobserve = (): void => undefined;

  /** 触发「哨兵进入视口」——只有观察 .fwe-infinite-sentinel 的实例才响应 */
  triggerSentinelVisible(): boolean {
    if (!this.observed.some((el) => el.classList.contains('fwe-infinite-sentinel'))) return false;
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
    return true;
  }
}

/**
 * 「元素一进 DOM 就在视口内」的替身。
 *
 * 评分徽章是靠 IntersectionObserver 懒加载的，真实浏览器里要等滚动；测试里
 * 需要在 observe 的瞬间就拿到回调，否则断言只能靠轮询真实计时器。
 * 哨兵被排除在外——否则无限滚动会立刻自己去抓下一页。
 */
class ImmediatelyVisibleIntersectionObserver {
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe = (target: Element): void => {
    // Deferred to a microtask: a real browser reports intersections after layout,
    // and the rating container is only appended to the card after `observe()`
    // returns. Firing synchronously would run before the node has a parent.
    if (target.classList.contains('fwe-infinite-sentinel')) return;
    queueMicrotask(() => {
      this.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    });
  };

  disconnect = (): void => undefined;

  unobserve = (): void => undefined;
}

/** 触发「哨兵进入视口」：只有观察 .fwe-infinite-sentinel 的实例才响应 */
function triggerSentinel(): void {
  const sentinelObserver = ControllableIntersectionObserver.instances.find((instance) =>
    instance.triggerSentinelVisible(),
  );
  expect(sentinelObserver).toBeDefined();
}

describe('Infinite scroll restoration', () => {
  function stubInfiniteEnvironment(
    fetchImpl: (input: RequestInfo | URL) => Promise<unknown>,
  ): void {
    ControllableIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', ControllableIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('fetch', vi.fn(fetchImpl));
  }

  const fetchOnlyPage2 = async (input: RequestInfo | URL): Promise<unknown> => {
    const url = String(input);
    if (url.includes('/page/2/')) {
      return { ok: true, status: 200, text: async () => archiveListingPage2 } as Response;
    }
    return { ok: false, status: 503, text: async () => '' } as Response;
  };

  it('removes infinite-scroll-loaded articles when returning to the original layout', async () => {
    stubInfiniteEnvironment(fetchOnlyPage2);
    document.body.innerHTML = archiveListingPage;
    const content = document.querySelector('#content') as HTMLElement;
    const original = content.innerHTML;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 第 2 页的两篇文章已被插入流中
    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);
    expect(content.innerHTML).not.toBe(original);

    const toggle = document.querySelector<HTMLButtonElement>('.fwe-switch');
    toggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.documentElement.dataset.fweMode).toBe('original');
    expect(content.innerHTML).toBe(original);
    vi.unstubAllGlobals();
  });

  it('restores the original pagination markup after loading a further page', async () => {
    stubInfiniteEnvironment(fetchOnlyPage2);
    document.body.innerHTML = archiveListingPage;
    const content = document.querySelector('#content') as HTMLElement;
    const original = content.innerHTML;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const nav = content.querySelector<HTMLElement>(
      ':scope > .navigation, :scope > .paging-navigation',
    );
    expect(nav?.querySelector('a.next')?.getAttribute('href')).toBe('/page/2/');

    triggerSentinel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 分页导航已指向第 3 页
    expect(nav?.querySelector('a.next')?.getAttribute('href')).toBe('/page/3/');

    const toggle = document.querySelector<HTMLButtonElement>('.fwe-switch');
    toggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(nav?.querySelector('a.next')?.getAttribute('href')).toBe('/page/2/');
    expect(content.innerHTML).toBe(original);
    vi.unstubAllGlobals();
  });
});

describe('Infinite scroll skeleton', () => {
  /**
   * 一个停在半路的 fetch：请求已发出、响应还没回来。加载中的 DOM 只在这段
   * 窗口里存在，`await` 一让出就会跳到下一阶段，所以必须能挂住它。
   */
  function createPendingFetch(): {
    fetchImpl: (input: RequestInfo | URL) => Promise<unknown>;
    settle: () => void;
  } {
    let settle!: () => void;
    const gate = new Promise<void>((resolve) => {
      settle = resolve;
    });
    return {
      fetchImpl: async (input) => {
        const url = String(input);
        if (!url.includes('/page/2/')) {
          return { ok: false, status: 503, text: async () => '' } as Response;
        }
        await gate;
        return { ok: true, status: 200, text: async () => archiveListingPage2 } as Response;
      },
      settle: () => settle(),
    };
  }

  /** jsdom 默认 innerWidth=1024（1 列）；列数决定骨架卡张数，需要可控 */
  function stubViewportWidth(width: number): void {
    vi.stubGlobal('innerWidth', width);
  }

  function stubSkeletonEnvironment(
    fetchImpl: (input: RequestInfo | URL) => Promise<unknown>,
  ): void {
    ControllableIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', ControllableIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('fetch', vi.fn(fetchImpl));
  }

  /** 等到 loadNextPage 真正挂在 await fetch 上 */
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('renders skeleton cards instead of a spinner while the next page loads', async () => {
    const pending = createPendingFetch();
    stubSkeletonEnvironment(pending.fetchImpl);
    stubViewportWidth(1440);
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();

    // N = 当前列数（1440px → 2 列）：骨架要铺满即将到来的那一行
    const skeletons = document.querySelectorAll('.fwe-skeleton-card');
    expect(skeletons).toHaveLength(2);

    // 骨架本身就是进度指示，不再额外放一个转圈
    expect(document.querySelector('.fwe-infinite-loader__spinner')).toBeNull();

    // sentinel 里仍保留一行小字
    expect(document.querySelector('.fwe-skeleton__label')?.textContent).toBe(
      'Loading more repacks...',
    );

    // 占位与真实卡同形：标题两行、meta 一行、事实四行、画廊、按钮
    const first = skeletons[0] as HTMLElement;
    expect(first.querySelectorAll('.fwe-skeleton__title-line')).toHaveLength(2);
    expect(first.querySelectorAll('.fwe-skeleton__meta-line')).toHaveLength(1);
    expect(first.querySelectorAll('.fwe-skeleton__fact-row')).toHaveLength(4);
    expect(first.querySelector('.fwe-skeleton__gallery')).not.toBeNull();
    expect(first.querySelector('.fwe-skeleton__actions')).not.toBeNull();

    pending.settle();
    await tick();
    await tick();

    // 内容落地后骨架消失，真实卡入流
    expect(document.querySelector('.fwe-skeleton')).toBeNull();
    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);
    vi.unstubAllGlobals();
  });

  it('drops the skeleton when the user returns to the original layout', async () => {
    const pending = createPendingFetch();
    stubSkeletonEnvironment(pending.fetchImpl);
    stubViewportWidth(1440);
    document.body.innerHTML = archiveListingPage;
    const content = document.querySelector('#content') as HTMLElement;
    const original = content.innerHTML;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();
    expect(document.querySelector('.fwe-skeleton')).not.toBeNull();

    const toggle = document.querySelector<HTMLButtonElement>('.fwe-switch');
    toggle?.click();
    await tick();

    // Nothing the enhancement generated may outlive it. The sentinel is itself
    // a transaction node, so today the placeholder goes with it either way —
    // this guards the outcome, so a later refactor that parks the skeleton
    // somewhere persistent fails here instead of on a reader's screen.
    expect(document.documentElement.dataset.fweMode).toBe('original');
    expect(content.innerHTML).toBe(original);
    expect(document.querySelector('.fwe-skeleton')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('scales the skeleton row to a single column on a phone viewport', async () => {
    const pending = createPendingFetch();
    stubSkeletonEnvironment(pending.fetchImpl);
    stubViewportWidth(390);
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();

    expect(document.querySelectorAll('.fwe-skeleton-card')).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});

describe('Infinite scroll URL and page memory', () => {
  /**
   * M2 的 sessionStorage 键。基名与 `preferences.ts` 的既有键同一命名空间；
   * 后缀是当前列表路径——sessionStorage 在标签页内跨导航存活，不带路径的话，
   * 从首页滚到第 3 页再点进 A-Z 列表，会拿上一个列表的页数去补齐，白抓一堆
   * 不属于当前列表的页面。
   */
  const PAGES_KEY_PREFIX = 'fitgirl-web-enhanced:v1:infinite-pages:';
  /**
   * 与实现同一套归一化：键挂在列表根上，不挂在当前 URL 上。断言时故意传
   * `/page/2/`——URL 已经被 replaceState 改写，键却必须还认得这个列表。
   */
  const pagesKey = (pathname = '/'): string =>
    `${PAGES_KEY_PREFIX}${pathname.replace(/\/page\/\d+\/?$/, '') || '/'}`;

  function stubInfiniteEnvironment(
    fetchImpl: (input: RequestInfo | URL) => Promise<unknown>,
  ): void {
    ControllableIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', ControllableIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('fetch', vi.fn(fetchImpl));
  }

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  /** 只回第 2 页；其余一律 503，好把「补多了 / 补错了」暴露出来 */
  const fetchOnlyPage2 = async (input: RequestInfo | URL): Promise<unknown> => {
    const url = String(input);
    if (url.includes('/page/2/')) {
      return { ok: true, status: 200, text: async () => archiveListingPage2 } as Response;
    }
    return { ok: false, status: 503, text: async () => '' } as Response;
  };

  /**
   * 记录整个窗口期内是否渲染过骨架。插入与移除可能发生在同一个微任务链里，
   * 等回调跑起来时节点已经没了，所以只能翻 MutationRecord 本身。
   */
  function watchForSkeleton(): { saw: () => boolean; stop: () => void } {
    let saw = false;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches('.fwe-skeleton') || node.querySelector('.fwe-skeleton')) {
            saw = true;
          }
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return {
      saw: () => saw,
      stop: () => observer.disconnect(),
    };
  }

  /** 有界轮询等补齐落完，不把测试写成死等 */
  async function settle(minArticles: number): Promise<void> {
    for (let index = 0; index < 30; index += 1) {
      if (document.querySelectorAll('#content article.hentry').length >= minArticles) return;
      await tick();
    }
  }

  it('rewrites the URL with replaceState and never pushes a history entry', async () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const addEventListener = vi.spyOn(window, 'addEventListener');
    stubInfiniteEnvironment(fetchOnlyPage2);
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();
    await tick();

    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);
    /*
     * 第一阶段只做 replaceState。pushState 会把每一页塞进浏览器历史，用户按
     * 后退只会在我们自己的条目里打转，拿不到真正想回的上一页；而 research 要的
     * 核心价值（可分享、刷新不丢位置）replaceState 已经给全了。popstate 恢复
     * 列为可选项，本次不碰。
     */
    expect(window.location.pathname).toBe('/page/2/');
    expect(pushState).not.toHaveBeenCalled();
    expect(addEventListener.mock.calls.filter(([type]) => type === 'popstate')).toHaveLength(0);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('remembers the loaded page count in sessionStorage', async () => {
    stubInfiniteEnvironment(fetchOnlyPage2);
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();
    await tick();

    // 键名走项目命名空间，值就是已加载页数（初始文档算第 1 页）。
    // URL 此时已被 replaceState 改写成 /page/2/，键却仍挂在列表根上——
    // 这条断言钉的就是「键不能在 replaceState 之后跑掉」。
    expect(pagesKey('/page/2/')).toBe('fitgirl-web-enhanced:v1:infinite-pages:/');
    expect(window.sessionStorage.getItem(pagesKey('/page/2/'))).toBe('2');
    vi.unstubAllGlobals();
  });

  it('silently catches up to the remembered page count after a reload', async () => {
    window.sessionStorage.setItem(pagesKey(), '2');
    stubInfiniteEnvironment(fetchOnlyPage2);
    document.body.innerHTML = archiveListingPage;
    const skeletonWatcher = watchForSkeleton();
    const app = new FitGirlEnhancedApp();
    await app.start();

    await settle(4);

    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);
    // 静默：补齐整个过程不允许出现骨架——用户刷新是为了回到原位，不是再看一次动画
    expect(skeletonWatcher.saw()).toBe(false);
    // 补齐后 URL 落在最后一页，与手动滚到底的状态一致
    expect(window.location.pathname).toBe('/page/2/');
    skeletonWatcher.stop();
    vi.unstubAllGlobals();
  });

  it('ignores a corrupt or out-of-range remembered count', async () => {
    // 第 1 页本来就在文档里，所以这些值都不该触发任何补齐
    for (const raw of ['', 'abc', '0', '-3', '1']) {
      window.sessionStorage.setItem(pagesKey(), raw);
      stubInfiniteEnvironment(fetchOnlyPage2);
      document.body.innerHTML = archiveListingPage;
      const app = new FitGirlEnhancedApp();
      await app.start();
      await settle(3);

      expect(
        document.querySelectorAll('#content article.hentry'),
        `remembered count "${raw}"`,
      ).toHaveLength(2);
      vi.unstubAllGlobals();
    }
  });
});

describe('Infinite scroll failure tiers', () => {
  function stubInfiniteEnvironment(
    fetchImpl: (input: RequestInfo | URL) => Promise<unknown>,
  ): void {
    ControllableIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', ControllableIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('fetch', vi.fn(fetchImpl));
  }

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  const sentinelText = (): string =>
    document.querySelector('#content > .fwe-infinite-sentinel')?.textContent ?? '';

  /**
   * 「有下一页链接、但这一页没有新文章」的页面：文章 id 与第 1 页完全相同，
   * 去重后 0 篇。真实站点偶尔会这样（缓存页 / 置顶重复），不能当成失败重试，
   * 也不能无限抓下去。
   */
  const duplicatePageContent = archiveListingPage2Content
    .replaceAll('Archive Game 3', 'Archive Game 1')
    .replaceAll('Archive Game 4', 'Archive Game 2')
    .replaceAll('post-85103', 'post-85101')
    .replaceAll('post-85104', 'post-85102');

  it('reports a network failure with its own message and keeps a retry', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stubInfiniteEnvironment(() => Promise.reject(new TypeError('Failed to fetch')));
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();
    await tick();

    // 网络层错误与 HTTP 错误必须分开：用户能做的动作完全不同
    expect(sentinelText()).toContain('Network error');
    expect(sentinelText()).not.toContain('HTTP');
    // 退路必须留着——load-more 本身就是 research 要的那条路
    const retry = document.querySelector<HTMLButtonElement>('.fwe-infinite-loader');
    expect(retry?.tagName).toBe('BUTTON');

    // warn 最多一条，且不带 stack（429 回退链的教训是 warn 太吵）
    expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
    for (const call of warn.mock.calls) {
      expect(call.some((arg) => arg instanceof Error)).toBe(false);
    }
    vi.unstubAllGlobals();
    warn.mockRestore();
  });

  it('reports an HTTP failure with the status code in one warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stubInfiniteEnvironment(() =>
      Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve('') } as Response),
    );
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();
    await tick();

    expect(sentinelText()).toContain('HTTP 503');
    expect(sentinelText()).not.toContain('Network error');
    // 一条 warn 封顶，带 status，不带 stack
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.join(' ')).toContain('503');
    expect(warn.mock.calls[0]?.some((arg) => arg instanceof Error)).toBe(false);
    vi.unstubAllGlobals();
    warn.mockRestore();
  });

  /*
   * M4 的短路（「哨兵里已经有一枚按钮就别重摆」）是为了防止 processArticles()
   * 每次插入后摧毁用户正要点的按钮。但它不能连同「文案也不许更新」一起挡住：
   * 否则同一枚按钮上的状态码会永远停在第一次失败的那个数上——用户重试之后看到
   * 的还是旧状态码，报障时会给出完全错误的信息。
   */
  it('updates the status code when a retry fails with a different one', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/page/2/')) {
        // 第一次 503，重试后换成 500：文案必须跟着变
        return fetchMock.mock.calls.length <= 1
          ? ({ ok: false, status: 503, text: async () => '' } as Response)
          : ({ ok: false, status: 500, text: async () => '' } as Response);
      }
      return { ok: false, status: 503, text: async () => '' } as Response;
    });
    stubInfiniteEnvironment(fetchMock);
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();
    await tick();
    expect(sentinelText()).toContain('HTTP 503');

    // 点上重试：这次换成 500
    const retry = document.querySelector<HTMLButtonElement>(
      '#content > .fwe-infinite-sentinel button.fwe-infinite-loader',
    );
    expect(retry).not.toBeNull();
    retry?.click();
    await tick();
    await tick();

    // 文案必须换成新的状态码，而不是留着 503
    expect(sentinelText()).toContain('HTTP 500');
    expect(sentinelText()).not.toContain('HTTP 503');
    // 按钮必须还在：重试失败也要留退路
    expect(
      document.querySelector('#content > .fwe-infinite-sentinel button.fwe-infinite-loader'),
    ).not.toBeNull();
    vi.unstubAllGlobals();
    warn.mockRestore();
  });

  it('treats a page with no new articles as the end and stops asking', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            `<!doctype html><html><body><div id="content" class="site-content">${duplicatePageContent}</div></body></html>`,
          ),
      } as Response),
    );
    stubInfiniteEnvironment(fetchMock);
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();
    await tick();

    // 空结果是「没有了」，不是失败：文案与重试按钮都不一样
    expect(sentinelText()).toContain('No more repacks');
    expect(sentinelText()).not.toContain('HTTP');
    // 结束态不该再给重试——没有东西可重试
    expect(document.querySelector('.fwe-infinite-loader')).toBeNull();
    // 文章数不变
    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(2);
    // 空结果不是错误，不该往控制台里写
    expect(warn).not.toHaveBeenCalled();

    // hasNextPage 已置 false：再触发哨兵也不该再发请求
    triggerSentinel();
    await tick();
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    warn.mockRestore();
  });
});

describe('Infinite scroll load-more fallback', () => {
  function stubInfiniteEnvironment(
    fetchImpl: (input: RequestInfo | URL) => Promise<unknown>,
  ): void {
    ControllableIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', ControllableIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('fetch', vi.fn(fetchImpl));
  }

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  const fetchOnlyPage2 = async (input: RequestInfo | URL): Promise<unknown> => {
    const url = String(input);
    if (url.includes('/page/2/')) {
      return { ok: true, status: 200, text: async () => archiveListingPage2 } as Response;
    }
    return { ok: false, status: 503, text: async () => '' } as Response;
  };

  /** 关掉「无限滚动」开关：默认是开的，所以得显式写一条关闭偏好 */
  function stubInfiniteScrollDisabled(): void {
    window.localStorage.setItem('fitgirl-web-enhanced:v1:infinite-scroll', 'false');
    window.localStorage.setItem(
      'fitgirl-web-enhanced:v1:infinite-scroll:updated-at',
      String(Date.now()),
    );
  }

  it('shows a clickable load-more button instead of hiding the sentinel', async () => {
    stubInfiniteScrollDisabled();
    stubInfiniteEnvironment(fetchOnlyPage2);
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    /*
     * 关掉自动加载不该等于「没有退路」。sentinel 以前被 display:none 掉，用户只
     * 能去翻原站分页；现在它该端出一枚「加载更多」按钮，点的还是同一个
     * loadNextPage()。
     */
    const sentinel = document.querySelector<HTMLElement>('#content > .fwe-infinite-sentinel');
    expect(sentinel).not.toBeNull();
    expect(sentinel?.style.display).not.toBe('none');

    const button = sentinel?.querySelector<HTMLButtonElement>('button.fwe-infinite-loader');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('Load more repacks');

    // 关着的时候不许自己去抓：没有哨兵观察器，页面加载完不该多发请求
    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).not.toHaveBeenCalled();

    // 按钮点的就是同一个 loadNextPage()：点一下，第 2 页落地
    button?.click();
    await tick();
    await tick();
    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);

    /*
     * 常驻退路的意思是它一直在：抓到第 2 页之后按钮重新摆出来，还能继续要
     * 第 3 页。若这里让它消失，用户滚到底就再也没有下一步了——那恰恰是本轮
     * 要修的问题。按钮仍带同一套文案，不会因为成功过一次就变成「已全部加载」。
     */
    const afterLoad = document.querySelector<HTMLButtonElement>(
      '#content > .fwe-infinite-sentinel button.fwe-infinite-loader',
    );
    expect(afterLoad).not.toBeNull();
    expect(afterLoad?.textContent).toContain('Load more repacks');

    // 分页导航跟着推进，说明这一页真的走完了完整流程
    const nextHref = document
      .querySelector<HTMLAnchorElement>(
        '#content .nav-links a.next, #content .paging-navigation a.next',
      )
      ?.getAttribute('href');
    expect(nextHref).toBe('/page/3/');
    vi.unstubAllGlobals();
  });

  it('keeps the original pagination nav visible and rewrites it through the transaction', async () => {
    stubInfiniteScrollDisabled();
    stubInfiniteEnvironment(fetchOnlyPage2);
    document.body.innerHTML = archiveListingPage;
    const content = document.querySelector('#content') as HTMLElement;
    const app = new FitGirlEnhancedApp();
    await app.start();

    /*
     * 分页导航就是 research 要的那条 pagination 退路，关掉自动加载后它必须真的
     * 看得见点得着——不是被 `fwe-source-hidden` 藏起来的那种「可见」。
     */
    const nav = document.querySelector<HTMLElement>(
      '#content > .navigation, #content > .paging-navigation',
    );
    expect(nav).not.toBeNull();
    expect(nav?.classList.contains('fwe-source-hidden')).toBe(false);
    expect(getComputedStyle(nav as Element).display).not.toBe('none');

    /*
     * 没有哨兵观察器可触发（关着自动加载时压根没建），所以这里点的就是 M4 端出
     * 来的那枚按钮——它和原分页导航是并排的两条退路。
     */
    const button = document.querySelector<HTMLButtonElement>(
      '#content > .fwe-infinite-sentinel button.fwe-infinite-loader',
    );
    expect(button).not.toBeNull();
    button?.click();
    await tick();
    await tick();

    // 导航内容跟着推进，且是走 transaction.setChildren——切回 original 不能残留
    const nextHref = nav?.querySelector<HTMLAnchorElement>('a.next')?.getAttribute('href');
    expect(nextHref).toBe('/page/3/');
    expect(content.querySelectorAll('article.hentry')).toHaveLength(4);

    // 切回 original：加载过的文章与改写过的导航都必须消失
    const toggle = document.querySelector<HTMLButtonElement>('.fwe-switch');
    toggle?.click();
    await tick();
    await tick();
    expect(content.querySelectorAll('article.hentry')).toHaveLength(2);
    vi.unstubAllGlobals();
  });

  /*
   * 关掉自动加载之前，哨兵上可能正摆着 M3 的失败文案（比如「HTTP 503」）。此刻
   * 用户的心智是「自动加载靠不住，我手动点」——如果关掉开关后按钮上还留着旧的
   * 状态码，用户会以为刚才那次失败还没解决，或者更糟：照着错的码去报障。
   *
   * 所以这一档必须换成「加载更多」：按钮还是同一枚、还是同一个 loadNextPage()，
   * 只是语义从「重试上一次失败」变成「手动再要一页」。
   */
  it('replaces a stale failure message with the load-more copy when switched off', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stubInfiniteEnvironment(() =>
      Promise.resolve({ ok: false, status: 503, text: async () => '' } as Response),
    );
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    // 先制造一次失败：哨兵上留下 HTTP 503
    triggerSentinel();
    await tick();
    await tick();
    const text = (): string =>
      document.querySelector('#content > .fwe-infinite-sentinel')?.textContent ?? '';
    expect(text()).toContain('HTTP 503');

    // 关掉「无限滚动」开关（控制菜单里第三枚 switch）
    const infiniteSwitch = document.querySelector<HTMLButtonElement>(
      '.fwe-switch[role="switch"][aria-label*="nfinite"]',
    );
    expect(infiniteSwitch).not.toBeNull();
    infiniteSwitch?.click();
    await tick();
    await tick();

    // 文案必须换成「加载更多」，旧状态码不许残留
    expect(text()).toContain('Load more repacks');
    expect(text()).not.toContain('HTTP 503');
    // 按钮仍是那一枚，点的仍是同一个 loadNextPage()
    expect(
      document.querySelector('#content > .fwe-infinite-sentinel button.fwe-infinite-loader'),
    ).not.toBeNull();
    vi.unstubAllGlobals();
    warn.mockRestore();
  });
});

describe('Infinite scroll accessibility', () => {
  function stubInfiniteEnvironment(
    fetchImpl: (input: RequestInfo | URL) => Promise<unknown>,
  ): void {
    ControllableIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', ControllableIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('fetch', vi.fn(fetchImpl));
  }

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  const sentinel = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('#content > .fwe-infinite-sentinel');

  /** 一个能挂住请求的 fetch：加载中的 DOM 只在这段窗口里存在 */
  function createGatedFetch(page: string): {
    fetchImpl: (input: RequestInfo | URL) => Promise<unknown>;
    release: () => void;
  } {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    return {
      fetchImpl: async (input) => {
        const url = String(input);
        if (!url.includes('/page/2/')) {
          return { ok: false, status: 503, text: async () => '' } as Response;
        }
        await gate;
        return { ok: true, status: 200, text: async () => page } as Response;
      },
      release: () => release(),
    };
  }

  /*
   * 第 2 页且不带下一页链接：用来把流程推到「已全部加载」。
   *
   * 必须是**完整页面**而不是 `#content` 片段：`loadNextPage()` 靠
   * `doc.querySelector('#content > .navigation, …)` 找新导航，喂片段的话
   * `newNav` 是 null，导航不会被换掉、`hasNextPage` 也会被误置成 false。
   * 真实站点返回的永远是完整页面，所以这是测试替身的形状问题，不是产品缺陷。
   */
  const lastPage = archiveListingPage2.replace(
    '<a href="/page/3/" class="next" rel="next"><span class="meta-nav">Next</span></a>',
    '',
  );

  it('marks the sentinel as a polite status region before anything loads', async () => {
    stubInfiniteEnvironment(() =>
      Promise.resolve({ ok: false, status: 503, text: async () => '' } as Response),
    );
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    /*
     * `role="status"` 自带 `aria-live="polite"`，但两个都显式写上：读屏软件对
     * 隐式 live region 的支持并不整齐，而这条区域是全页面唯一的状态播报口。
     */
    expect(sentinel()?.getAttribute('role')).toBe('status');
    expect(sentinel()?.getAttribute('aria-live')).toBe('polite');
    vi.unstubAllGlobals();
  });

  it('announces loading, then the loaded page, through the same region', async () => {
    const gated = createGatedFetch(archiveListingPage2);
    stubInfiniteEnvironment(gated.fetchImpl);
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();

    // 加载中：骨架自带一行小字，它就是播报文本（骨架卡本身 aria-hidden）
    expect(sentinel()?.textContent).toContain('Loading more repacks');
    expect(sentinel()?.getAttribute('role')).toBe('status');

    gated.release();
    await tick();
    await tick();

    // 完成：落地后播报「加载了第几页」，让读屏用户知道内容真的变了
    expect(sentinel()?.textContent).toContain('Loaded page 2');
    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);
    vi.unstubAllGlobals();
  });

  it('announces the end of the list instead of going silent', async () => {
    const gated = createGatedFetch(lastPage);
    stubInfiniteEnvironment(gated.fetchImpl);
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();
    gated.release();
    await tick();
    await tick();
    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);

    // 再触发一次：这一页没有 next 链接，该播报「已全部加载」
    triggerSentinel();
    await tick();
    await tick();
    expect(sentinel()?.textContent).toContain('All repacks loaded');
    vi.unstubAllGlobals();
  });

  it('announces a failure with the tier message inside the same region', async () => {
    stubInfiniteEnvironment(() =>
      Promise.resolve({ ok: false, status: 503, text: async () => '' } as Response),
    );
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();
    await tick();

    // 失败文案就在 status 区域里，重试按钮也是——不用再另开一个播报口
    expect(sentinel()?.getAttribute('role')).toBe('status');
    expect(sentinel()?.textContent).toContain('HTTP 503');
    expect(
      sentinel()?.querySelector<HTMLButtonElement>('button.fwe-infinite-loader'),
    ).not.toBeNull();
    vi.unstubAllGlobals();
  });

  it('never steals focus while inserting new cards', async () => {
    const gated = createGatedFetch(archiveListingPage2);
    stubInfiniteEnvironment(gated.fetchImpl);
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    // 用户可能正停在某个控件上（比如刚点开控制菜单），加载不该把焦点抢走
    const probe = document.createElement('button');
    probe.type = 'button';
    probe.textContent = 'probe';
    document.body.append(probe);
    probe.focus();
    expect(document.activeElement).toBe(probe);

    triggerSentinel();
    await tick();
    gated.release();
    await tick();
    await tick();

    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);
    // 新卡 insertBefore 在 sentinel 之前，且全程没有 focus() 调用
    expect(document.activeElement).toBe(probe);
    vi.unstubAllGlobals();
  });
});

describe('Infinite scroll performance', () => {
  function stubInfiniteEnvironment(
    fetchImpl: (input: RequestInfo | URL) => Promise<unknown>,
  ): void {
    ControllableIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', ControllableIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('fetch', vi.fn(fetchImpl));
  }

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  /**
   * M6 的第一项是「验证 `finally` 里的 `processArticles()` 是否冗余」。
   *
   * 这条测试就是那份验证：它钉住「新插入的文章在加载解析完的那一刻就已经是
   * 卡片」。若把 `finally` 的调用删掉，改造只能等 MutationObserver 的 100ms
   * 防抖——那 100ms 里用户看到的是未经改造的原始文章。所以这个调用不是冗余，
   * 删了会直接打破本条。
   */
  it('transforms newly loaded articles immediately, not after the observer debounce', async () => {
    stubInfiniteEnvironment(async (input) => {
      const url = String(input);
      if (url.includes('/page/2/')) {
        return { ok: true, status: 200, text: async () => archiveListingPage2 } as Response;
      }
      return { ok: false, status: 503, text: async () => '' } as Response;
    });
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();
    await tick();

    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);
    /*
     * 只翻微任务、不等 100ms。`data-fwe-ready` 是改造完成的标记，四篇全带上
     * 才说明改造是同步完成的——靠 MutationObserver 的话此刻还是原始文章。
     */
    expect(document.querySelectorAll('#content article.hentry[data-fwe-ready]')).toHaveLength(4);
    // 改造后的卡片才有的类名：证明走的是完整改造路径而不是只插了 DOM
    expect(document.querySelectorAll('#content .fwe-game-card')).toHaveLength(4);
    vi.unstubAllGlobals();
  });

  /**
   * M6 的第二项是把 `existingIds` 从「每次全量重建」改成增量维护。这条测试
   * 保证改造不改变去重语义：第 2 页的文章 id 与第 1 页重复时必须被剔除。
   */
  it('keeps deduping already-loaded articles across successive pages', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      // 第 2 页与第 3 页都服务同一批 id，模拟站点把同一列表重复输出
      if (url.includes('/page/2/') || url.includes('/page/3/')) {
        return { ok: true, status: 200, text: async () => archiveListingPage2 } as Response;
      }
      return { ok: false, status: 503, text: async () => '' } as Response;
    });
    stubInfiniteEnvironment(fetchMock);
    document.body.innerHTML = archiveListingPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    triggerSentinel();
    await tick();
    await tick();
    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);

    // 手动再要一页：内容与第 2 页完全相同，一篇都不该多出来
    triggerSentinel();
    await tick();
    await tick();
    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);
    vi.unstubAllGlobals();
  });

  /**
   * M6 把 `existingIds` 改成增量维护后，最容易踩的坑就是**陈旧 id**：
   * `disableEnhanced()` 会 `restore()` 掉整条流，`enableEnhanced()` 再从原始
   * 文章重建。若那份增量 Set 不跟着重置，切回来再要第 2 页时，第 2 页的文章会被
   * 当成「已经加载过」而全部剔除——用户看到的是内容凭空消失。
   *
   * 这条测试就是那道闸门：先写红，再按它去实现重置。
   */
  it('re-loads a page after a mode round-trip instead of deduping it away', async () => {
    stubInfiniteEnvironment(async (input) => {
      const url = String(input);
      if (url.includes('/page/2/')) {
        return { ok: true, status: 200, text: async () => archiveListingPage2 } as Response;
      }
      return { ok: false, status: 503, text: async () => '' } as Response;
    });
    document.body.innerHTML = archiveListingPage;
    const content = document.querySelector('#content') as HTMLElement;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const layoutSwitch = document.querySelector<HTMLButtonElement>('.fwe-switch');
    const tickTwice = async (): Promise<void> => {
      await tick();
      await tick();
    };

    triggerSentinel();
    await tickTwice();
    expect(document.querySelectorAll('#content article.hentry')).toHaveLength(4);

    // 切回原站模式：整条流被 restore 掉，只剩初始两篇
    layoutSwitch?.click();
    await tickTwice();
    expect(content.querySelectorAll('article.hentry')).toHaveLength(2);

    // 再切回增强模式：流被重建，此刻仍只有初始两篇
    layoutSwitch?.click();
    await tickTwice();
    expect(content.querySelectorAll('article.hentry')).toHaveLength(2);

    /*
     * 关键断言：再要一次第 2 页，文章必须重新出现。增量 Set 若在这一轮还记着
     * 上一轮的 id，第 2 页会被判为「全部重复」而一篇不插——那就是内容丢失。
     */
    triggerSentinel();
    await tickTwice();
    expect(content.querySelectorAll('article.hentry')).toHaveLength(4);
    vi.unstubAllGlobals();
  });
});

describe('Stream card hierarchy', () => {
  /** 已入缓存的 Steam 评分：让徽章无需走网络就能渲染 */
  const seedSteamRating = (metascore?: number): void => {
    window.localStorage.setItem(
      'fitgirl-web-enhanced:v1:rating:the alters: deluxe edition',
      JSON.stringify({
        data: {
          appId: 1601580,
          name: 'The Alters: Deluxe Edition',
          positivePercent: 93,
          scoreDesc: 'Very Positive',
          totalReviews: 1150,
          totalPositive: 1070,
          totalNegative: 80,
          metascore,
          steamUrl: 'https://store.steampowered.com/app/1601580/',
          steamDbUrl: 'https://steamdb.info/app/1601580/',
        },
        timestamp: Date.now(),
      }),
    );
  };

  function stubStreamEnvironment(): void {
    ControllableIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', ControllableIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  }

  it('keeps the score corner for the rating alone', async () => {
    stubStreamEnvironment();
    document.body.innerHTML = pinkPawStreamPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const right = document.querySelector('.fwe-game-card .fwe-header-right') as HTMLElement;
    expect(right).not.toBeNull();
    expect(right.querySelector('.fwe-time-ago')).toBeNull();
    expect(right.querySelector('.fwe-paw-badge')).toBeNull();
    expect(right.querySelector('.fwe-rating-container')).not.toBeNull();
    vi.unstubAllGlobals();
  });

  it('moves the pink paw award badge inline with the card title', async () => {
    stubStreamEnvironment();
    document.body.innerHTML = pinkPawStreamPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const paw = document.querySelector('.fwe-game-card .fwe-paw-badge') as HTMLElement;
    expect(paw).not.toBeNull();
    expect(paw.closest('.entry-title')).not.toBeNull();
    expect(paw.closest('.fwe-header-right')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('merges the relative time into the single date meta chip', async () => {
    stubStreamEnvironment();
    document.body.innerHTML = pinkPawStreamPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    // 日期 / 分类 / 作者 / 评论数 仍是四枚胶囊
    expect(
      document.querySelectorAll('.fwe-game-card .fwe-article-meta .fwe-meta-chip'),
    ).toHaveLength(4);
    expect(document.querySelector('.fwe-game-card .fwe-time-ago')).toBeNull();

    // fixture 日期久远，胶囊只显示绝对日期，且带上刷新用的 ISO 锚点
    const dateChip = document.querySelector<HTMLElement>(
      '.fwe-game-card .fwe-article-meta [data-date-iso]',
    );
    expect(dateChip).not.toBeNull();
    expect(dateChip?.textContent).toBe('September 2, 2026');
    vi.unstubAllGlobals();
  });

  it('prefixes the date chip with the relative time for recent posts', async () => {
    stubStreamEnvironment();
    document.body.innerHTML = withTodayDate(pinkPawStreamPage);
    const app = new FitGirlEnhancedApp();
    await app.start();

    const dateChip = document.querySelector<HTMLElement>(
      '.fwe-game-card .fwe-article-meta [data-date-iso]',
    );
    expect(dateChip?.textContent).toMatch(/^Today · /);
    vi.unstubAllGlobals();
  });

  it('drops the in-stream rank badge while keeping it on ranking pages', async () => {
    stubStreamEnvironment();
    document.body.innerHTML = pinkPawStreamPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    // 普通列表流：位置肉眼可数，排名徽章不携带信息
    expect(document.querySelector('.fwe-game-card .fwe-order-badge')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('keeps the score corner to a single Steam number', async () => {
    ControllableIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', ImmediatelyVisibleIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    seedSteamRating(88);
    document.body.innerHTML = pinkPawStreamPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    await vi.waitFor(() => {
      expect(document.querySelector('.fwe-game-card .fwe-rating-badge')).not.toBeNull();
    });

    // Metacritic 只在弹层内，卡片角只留一个 Steam 数字
    expect(document.querySelectorAll('.fwe-game-card .fwe-rating-pill')).toHaveLength(1);
    expect(document.querySelector('.fwe-game-card .fwe-rating-pill--meta')).toBeNull();
    expect(document.querySelector('.fwe-game-card .fwe-rating-percent')?.textContent).toBe('93%');

    // 爪印徽章虽在标题里，但不能污染解析出的标题——它同时是评分缓存键、
    // data-title 与 aria-label 的来源。
    expect(
      document.querySelector<HTMLElement>('.fwe-game-card .fwe-rating-container')?.dataset.title,
    ).toBe('The Alters: Deluxe Edition');
    vi.unstubAllGlobals();
  });

  it('clicking a rating badge toggles the popover', async () => {
    ControllableIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', ImmediatelyVisibleIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    seedSteamRating(88);
    document.body.innerHTML = pinkPawStreamPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const badge = await vi.waitFor(() => {
      const node = document.querySelector<HTMLElement>('.fwe-game-card .fwe-rating-badge');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    expect(badge.getAttribute('aria-expanded')).toBe('false');

    badge.click();
    const popover = document.querySelector('.fwe-rating-popover') as HTMLElement;
    expect(popover.classList.contains('fwe-rating-popover--visible')).toBe(true);
    expect(badge.getAttribute('aria-expanded')).toBe('true');

    badge.click();
    expect(popover.classList.contains('fwe-rating-popover--visible')).toBe(false);
    expect(badge.getAttribute('aria-expanded')).toBe('false');

    // Enter 也能开关
    badge.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(popover.classList.contains('fwe-rating-popover--visible')).toBe(true);
    vi.unstubAllGlobals();
  });

  it('详情页把评分收在头部徽章一个槽位，facts 行不再重复', async () => {
    vi.stubGlobal('IntersectionObserver', ImmediatelyVisibleIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    window.localStorage.setItem(
      sampleRatingCacheKey,
      JSON.stringify({
        data: {
          appId: 1091500,
          name: 'Cyberpunk 2077',
          positivePercent: 89,
          scoreDesc: 'Very Positive',
          totalReviews: 658920,
          totalPositive: 586438,
          totalNegative: 72482,
          metascore: 86,
          steamUrl: 'https://store.steampowered.com/app/1091500/',
          steamDbUrl: 'https://steamdb.info/app/1091500/',
          metacriticUrl: 'https://www.metacritic.com/game/cyberpunk-2077/',
        },
        timestamp: Date.now(),
      }),
    );
    document.body.className = 'single single-post';
    document.body.innerHTML = singlePageWithNavigation;
    const app = new FitGirlEnhancedApp();
    await app.start();

    await vi.waitFor(() => {
      expect(document.querySelector('.fwe-detail .fwe-rating-badge')).not.toBeNull();
    });

    // 同一个事实只出现一次：Steam % 在头部徽章，facts 行不再有 Rating 条目
    expect(document.querySelectorAll('.fwe-detail .fwe-fact--rating')).toHaveLength(0);
    const labels = [...document.querySelectorAll('.fwe-detail .fwe-fact__label')].map(
      (node) => node.textContent,
    );
    expect(labels).not.toContain('Rating');

    // Metacritic 没有丢，只是搬进了弹层
    document.querySelector<HTMLElement>('.fwe-detail .fwe-rating-badge')?.click();
    expect(document.querySelector('.fwe-rating-popover__meta-val')?.textContent).toBe('86/100');
    vi.unstubAllGlobals();
  });

  it('merges the two size rows into one fact row', async () => {
    stubStreamEnvironment();
    document.body.innerHTML = pinkPawStreamPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const facts = [...document.querySelectorAll('.fwe-game-card .fwe-fact')];
    const labels = facts.map((fact) => fact.querySelector('.fwe-fact__label')?.textContent ?? '');

    // 5 行变 4 行：Original Size / Repack Size 合成一行
    expect(labels.filter((label) => /Size/.test(label))).toHaveLength(1);
    expect(labels).toEqual(['Genres/Tags', 'Company', 'Languages', 'Original Size / Repack Size']);

    const merged = facts[3]?.querySelector('.fwe-fact__value')?.textContent;
    expect(merged).toBe('64.7 GB → 43.6 GB');
    vi.unstubAllGlobals();
  });

  it('gives the secondary card actions a quieter ghost treatment', async () => {
    stubStreamEnvironment();
    document.body.innerHTML = pinkPawStreamPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    // 下载链接独占粉色实心；特性介绍 / 详细介绍降为幽灵钮
    expect(document.querySelectorAll('.fwe-game-card .fwe-card-btn--ghost')).toHaveLength(2);
    const primary = document.querySelector('.fwe-game-card .fwe-card-btn--primary');
    expect(primary?.classList.contains('fwe-card-btn--ghost')).toBe(false);
    expect(document.querySelector('.fwe-game-card .fwe-card-btn')?.textContent).toBe(
      'Download Mirrors',
    );
    vi.unstubAllGlobals();
  });

  it('labels notice and digest cards so they do not read as games', async () => {
    stubStreamEnvironment();
    document.body.innerHTML = fullPage;
    const app = new FitGirlEnhancedApp();
    await app.start();

    const digest = document.querySelector('.fwe-digest');
    expect(digest).not.toBeNull();
    const kind = digest?.querySelector<HTMLElement>('.fwe-card-kind');
    expect(kind?.textContent).toBe('Digest');
    vi.unstubAllGlobals();
  });
});

describe('Third-party comment counts', () => {
  const tolstoyWindow = window as unknown as { tolstoycomments?: unknown };

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    delete tolstoyWindow.tolstoycomments;
    vi.unstubAllGlobals();
  });

  function stubTolstoyComment(update: Mock = vi.fn(async () => ({}))): Mock {
    tolstoyWindow.tolstoycomments = { comment: { update } };
    return update;
  }

  it('asks the plugin to refill the counts the server rendered empty', () => {
    document.body.innerHTML =
      '<span class="tolstoycomments-cc"></span><span class="tolstoycomments-cc">37 comments</span>';
    const update = stubTolstoyComment();
    refillThirdPartyCommentCounts();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when every count already has text', () => {
    document.body.innerHTML = '<span class="tolstoycomments-cc">37 comments</span>';
    const update = stubTolstoyComment();
    refillThirdPartyCommentCounts();
    expect(update).not.toHaveBeenCalled();
  });

  it('sends nothing when the page has no comment spans at all', () => {
    document.body.innerHTML = '<p>no comments here</p>';
    const update = stubTolstoyComment();
    refillThirdPartyCommentCounts();
    expect(update).not.toHaveBeenCalled();
  });

  it('stays silent when the plugin never loaded', () => {
    document.body.innerHTML = '<span class="tolstoycomments-cc"></span>';
    expect(() => refillThirdPartyCommentCounts()).not.toThrow();
  });

  it('swallows a synchronous throw from the plugin', () => {
    document.body.innerHTML = '<span class="tolstoycomments-cc"></span>';
    const update = vi.fn(() => {
      throw new Error('tc: server comment no load');
    });
    stubTolstoyComment(update);
    expect(() => refillThirdPartyCommentCounts()).not.toThrow();
  });

  it('swallows a rejected refill instead of leaking an unhandled rejection', async () => {
    document.body.innerHTML = '<span class="tolstoycomments-cc"></span>';
    const update = vi.fn(async () => {
      throw new Error('tc: server comment no load');
    });
    stubTolstoyComment(update);
    refillThirdPartyCommentCounts();
    await Promise.resolve();
    await Promise.resolve();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
