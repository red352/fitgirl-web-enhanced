import { describe, expect, it } from 'vitest';
import {
  classifySectionHeading,
  detectPageKind,
  DomTransaction,
  extractFacts,
  parseArticle,
  parseArchiveGroups,
  parseNavigation,
  parsePopularItems,
  parseUpcomingItems,
  readLayoutMode,
  STORAGE_KEY,
} from '../src/dom';
import { archiveWidget, gameArticle, popularWidget, siteHeader, specialArticle } from './fixtures';

function mount(markup: string): void {
  document.body.innerHTML = markup;
}

describe('DOM 解析', () => {
  it('解析详情文章、媒体和合并下载区', () => {
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

  it('无法解析的特殊文章保持为保守类型', () => {
    mount(specialArticle);
    const root = document.querySelector('article') as HTMLElement;
    const parsed = parseArticle(root, 'listing');
    expect(parsed.kind).toBe('special');
    expect(parsed.title).toBe('Updates Digest');
    expect(parsed.infoBlock).toBeNull();
  });

  it('搜索结果的 entry-summary 复用游戏卡片解析', () => {
    mount(gameArticle.replaceAll('entry-content', 'entry-summary'));
    document.body.className = 'search search-results';
    const parsed = parseArticle(document.querySelector('article') as HTMLElement, 'listing');
    expect(parsed.kind).toBe('game');
    expect(parsed.entry?.classList.contains('entry-summary')).toBe(true);
    expect(parsed.media).toHaveLength(4);
  });

  it('解析搜索摘要中被压在同一行的游戏字段', () => {
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

  it('缺少封面和截图时仍保留可解析的游戏信息', () => {
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

  it('同时按标题语义识别栏目', () => {
    const heading = document.createElement('h3');
    heading.textContent = 'Download Mirrors (Torrent)';
    expect(classifySectionHeading(heading)).toBe('downloads');
  });

  it('按 title、alt 和安全回退解析热门榜单', () => {
    mount(popularWidget);
    expect(parsePopularItems(document.querySelector('#block-2')).map((item) => item.title)).toEqual(
      ['Popular One', 'Popular Two', 'Popular repack 3'],
    );
  });

  it('保留导航层级并按年份解析月度归档', () => {
    mount(`${siteHeader}${archiveWidget}`);
    const navigation = parseNavigation(document.querySelector('#site-header-menu'));
    expect(navigation).toHaveLength(5);
    expect(navigation[0]?.children[0]?.title).toBe('Top 50 Repacks');
    const archives = parseArchiveGroups(document.querySelector('.widget_archive'));
    expect(archives.map((group) => group.year)).toEqual(['2026', '2025']);
    expect(archives[0]?.items[0]).toMatchObject({ label: 'September 2026', count: '7' });
  });

  it('解析文本列表与链接格式的 Upcoming Repacks', () => {
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

describe('状态与恢复', () => {
  it('损坏的持久化值回退增强布局', () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    expect(readLayoutMode()).toBe('enhanced');
  });

  it('恢复节点顺序、属性、类和生成节点', () => {
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
});
