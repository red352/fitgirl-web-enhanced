import { describe, expect, it } from 'vitest';
import {
  classifySectionHeading,
  detectPageKind,
  DomTransaction,
  extractFacts,
  formatRelativeTime,
  parseArchiveGroups,
  parseArticle,
  parseArticleDate,
  parseDateString,
  parseNavigation,
  parsePopularItems,
  parseUpcomingItems,
  readLayoutMode,
  STORAGE_KEY,
} from '../src/dom';
import {
  archiveWidget,
  gameArticle,
  pinkPawGameArticle,
  popularWidget,
  siteHeader,
  specialArticle,
} from './fixtures';

function mount(markup: string): void {
  document.body.innerHTML = markup;
}

describe('DOM Parsing', () => {
  it('parses detail article, media, and merged download section', () => {
    mount(gameArticle);
    document.body.className = 'single single-post';
    const root = document.querySelector('article');
    expect(root).toBeInstanceOf(HTMLElement);
    const parsed = parseArticle(root as HTMLElement, detectPageKind());
    expect(parsed.kind).toBe('game');
    expect(parsed.pageKind).toBe('single');
    expect(parsed.cover?.alt).toBe('Sample Game cover');
    expect(parsed.sections.get('downloads')?.nodes).toHaveLength(4);
    expect(parsed.media).toHaveLength(4);
    expect(parsed.media.at(-1)?.video).toBeInstanceOf(HTMLVideoElement);
  });

  it('correctly traverses articles wrapped in Pink Paw layers, identifies award, and extracts all sections', () => {
    mount(pinkPawGameArticle);
    const root = document.querySelector('article') as HTMLElement;
    const parsed = parseArticle(root, 'single');
    expect(parsed.kind).toBe('game');
    expect(parsed.hasPinkPawAward).toBe(true);
    expect(parsed.cover?.alt).toBe('The Alters cover');
    expect(parsed.infoBlock?.tagName).toBe('P');
    expect(parsed.repackHeading?.textContent).toContain('The Alters: Deluxe Edition');
    expect(parsed.sections.get('downloads')?.nodes).toHaveLength(4);
    expect(parsed.sections.get('screenshots')?.nodes).toHaveLength(2);
    expect(parsed.media).toHaveLength(2);
    expect(parsed.sections.get('features')?.nodes).toHaveLength(2);
    expect(parsed.sections.get('description')?.nodes).toHaveLength(1);
    expect(parsed.wrapperContainers).toHaveLength(1);
  });

  it('preserves conservative type for non-game special articles', () => {
    mount(specialArticle);
    const root = document.querySelector('article') as HTMLElement;
    const parsed = parseArticle(root, 'listing');
    expect(parsed.kind).toBe('special');
    expect(parsed.title).toBe('Updates Digest');
    expect(parsed.infoBlock).toBeNull();
  });

  it('reuses game card parser for entry-summary on search results', () => {
    mount(gameArticle.replaceAll('entry-content', 'entry-summary'));
    document.body.className = 'search search-results';
    const parsed = parseArticle(document.querySelector('article') as HTMLElement, 'listing');
    expect(parsed.kind).toBe('game');
    expect(parsed.entry?.classList.contains('entry-summary')).toBe(true);
    expect(parsed.media).toHaveLength(4);
  });

  it('parses compressed single-line fact fields in search excerpts', () => {
    mount(
      '<p id="summary">#7122 Big Ambitions Genres/Tags: Managerial, Top-down, 3D Company: Hovgaard Games Languages: RUS/ENG/MULTI122 Original Size: 6.2 GB Repack Size: 1.6 GB Download Mirrors (Direct Links)</p>',
    );
    expect(extractFacts(document.querySelector('#summary'))).toMatchObject([
      { label: 'Genres/Tags', value: 'Managerial, Top-down, 3D' },
      { label: 'Company', value: 'Hovgaard Games' },
      { label: 'Languages', value: 'RUS/ENG/MULTI122' },
      { label: 'Original Size', value: '6.2 GB' },
      { label: 'Repack Size', value: '1.6 GB' },
    ]);
  });

  it('preserves parsed game facts when cover and screenshots are missing', () => {
    mount(`
      <article class="hentry">
        <header class="entry-header"><h2 class="entry-title">Coverless Game</h2></header>
        <div class="entry-content">
          <h3>Coverless Game Repack</h3>
          <p>Genres/Tags: Strategy<br>Original Size: 4 GB<br>Repack Size: 2 GB</p>
          <h3>Repack Features</h3><ul><li>Lossless</li></ul>
        </div>
      </article>`);
    const parsed = parseArticle(document.querySelector('article') as HTMLElement, 'listing');
    expect(parsed.kind).toBe('game');
    expect(parsed.cover).toBeNull();
    expect(parsed.media).toHaveLength(0);
  });

  it('classifies sections by semantic heading content', () => {
    const heading = document.createElement('h3');
    heading.textContent = 'Download Mirrors (Torrent)';
    expect(classifySectionHeading(heading)).toBe('downloads');
  });

  it('parses popular items by title, alt, and safe fallbacks', () => {
    mount(popularWidget);
    expect(parsePopularItems(document.querySelector('#block-2')).map((item) => item.title)).toEqual(
      ['Popular One', 'Popular Two', 'Popular repack 3'],
    );
  });

  it('preserves navigation hierarchy and parses monthly archives by year', () => {
    mount(`${siteHeader}${archiveWidget}`);
    const navigation = parseNavigation(document.querySelector('#site-header-menu'));
    expect(navigation).toHaveLength(5);
    expect(navigation[0]?.children[0]?.title).toBe('Top 50 Repacks');
    const archives = parseArchiveGroups(document.querySelector('.widget_archive'));
    expect(archives.map((group) => group.year)).toEqual(['2026', '2025']);
    expect(archives[0]?.items[0]).toMatchObject({ label: 'September 2026', count: '7' });
  });

  it('parses Upcoming Repacks in both text list and linked formats', () => {
    mount(`
      <div class="entry-content">
        <style>.wplp_outside { border: 1px; }</style>
        <h3>
          <span style="color: #339966;">⇢ Dragon's Dogma 2 (Denuvoless)</span><br>
          <span style="color: #339966;">⇢ Star Trucker: Cultivation Content Pack</span><br>
        </h3>
        <div class="wplp_outside"><a href="/released-game/">Released Game</a></div>
        <div style="color: red">DO NOT ASK FOR ANY PARTICULAR REPACKS IN COMMENTS.</div>
      </div>
    `);
    const upcomingItems = parseUpcomingItems(document.querySelector('.entry-content'));
    expect(upcomingItems).toEqual([
      { text: "Dragon's Dogma 2 (Denuvoless)", href: null },
      { text: 'Star Trucker: Cultivation Content Pack', href: null },
    ]);
  });
});

describe('State and Restoration', () => {
  it('falls back to enhanced layout for corrupted stored values', () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    expect(readLayoutMode()).toBe('enhanced');
  });

  it('restores node order, attributes, classes, and removes generated elements', () => {
    mount('<div id="source"><i id="a"></i><i id="b"></i></div><div id="target"></div>');
    const source = document.querySelector('#source') as HTMLElement;
    const target = document.querySelector('#target') as HTMLElement;
    const a = document.querySelector('#a') as HTMLElement;
    const generated = document.createElement('span');
    const transaction = new DomTransaction();
    transaction.move(a, target);
    transaction.setAttribute(a, 'aria-label', 'moved');
    transaction.addClass(a, 'active');
    transaction.insert(generated, target);
    transaction.restore();
    expect([...source.children].map((item) => item.id)).toEqual(['a', 'b']);
    expect(a.hasAttribute('aria-label')).toBe(false);
    expect(a.classList.contains('active')).toBe(false);
    expect(generated.isConnected).toBe(false);
  });

  it('accurately parses FitGirl European date formats and nested time elements', () => {
    // 1. span.entry-date with nested time[datetime]
    mount(
      '<header class="entry-header"><span class="entry-date"><a href="#"><time class="entry-date" datetime="2026-09-03T05:24:01+03:00">03/09/2026</time></a></span></header>',
    );
    const header = document.querySelector('header') as HTMLElement;
    const spanDate = header.querySelector('.entry-date') as HTMLElement;
    const parsed = parseArticleDate(spanDate, header);
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(8); // September (0-indexed 8)
    expect(parsed?.getDate()).toBe(3);

    // 2. Pure DD/MM/YYYY text format
    const parsedDmy = parseDateString('03/09/2026');
    expect(parsedDmy).not.toBeNull();
    expect(parsedDmy?.getFullYear()).toBe(2026);
    expect(parsedDmy?.getMonth()).toBe(8); // September
    expect(parsedDmy?.getDate()).toBe(3);

    // 3. English month text
    const parsedEng = parseDateString('September 2, 2026');
    expect(parsedEng).not.toBeNull();
    expect(parsedEng?.getMonth()).toBe(8);
    expect(parsedEng?.getDate()).toBe(2);
  });

  it('generates localized relative times accurately based on calendar days and post delta', () => {
    const fixedNow = new Date('2026-09-03T12:00:00Z');

    // 5 hours ago (posted today) -> Today / 今天
    const todayPost = new Date('2026-09-03T07:00:00Z');
    expect(formatRelativeTime(todayPost, fixedNow, 'en')).toBe('Today');
    expect(formatRelativeTime(todayPost, fixedNow, 'zh-CN')).toBe('今天');

    // 26 hours ago (posted yesterday) -> Yesterday / 昨天
    const yesterdayPost = new Date('2026-09-02T10:00:00Z');
    expect(formatRelativeTime(yesterdayPost, fixedNow, 'en')).toBe('Yesterday');
    expect(formatRelativeTime(yesterdayPost, fixedNow, 'zh-CN')).toBe('昨天');

    // 3 days ago -> 3d ago / 3天前
    const threeDaysAgo = new Date('2026-08-31T10:00:00Z');
    expect(formatRelativeTime(threeDaysAgo, fixedNow, 'en')).toBe('3d ago');
    expect(formatRelativeTime(threeDaysAgo, fixedNow, 'zh-CN')).toBe('3天前');

    // 10 days ago -> 1w ago / 1周前
    const tenDaysAgo = new Date('2026-08-24T10:00:00Z');
    expect(formatRelativeTime(tenDaysAgo, fixedNow, 'en')).toBe('1w ago');
    expect(formatRelativeTime(tenDaysAgo, fixedNow, 'zh-CN')).toBe('1周前');

    // 6 months ago -> 6mo ago / 6个月前
    const sixMonthsAgo = new Date('2026-03-03T10:00:00Z');
    expect(formatRelativeTime(sixMonthsAgo, fixedNow, 'en')).toBe('6mo ago');
    expect(formatRelativeTime(sixMonthsAgo, fixedNow, 'zh-CN')).toBe('6个月前');
  });
});
