import {
  archiveListingContent,
  azPageArticle,
  commentsSection,
  digestArticle,
  fullPage,
  gameArticle,
  pinkPawGameArticle,
  popularPageArticle,
  popularWidget,
  postNavigation,
  siteFooterExtras,
  siteHeader,
  siteSidebarExtras,
  updatesPageArticle,
} from '../fixtures';

const ratingSeed = {
  'fitgirl-web-enhanced:v1:rating:sample game: deluxe edition': {
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
  },
  'fitgirl-web-enhanced:v1:rating:second game: deluxe edition': {
    data: {
      appId: 1245620,
      name: 'ELDEN RING',
      positivePercent: 93,
      scoreDesc: 'Very Positive',
      totalReviews: 842100,
      totalPositive: 783153,
      totalNegative: 58947,
      metascore: 96,
      steamUrl: 'https://store.steampowered.com/app/1245620/',
      steamDbUrl: 'https://steamdb.info/app/1245620/',
    },
    timestamp: Date.now(),
  },
  'fitgirl-web-enhanced:v1:rating:the alters: deluxe edition': {
    data: {
      appId: 1601570,
      name: 'The Alters',
      positivePercent: 91,
      scoreDesc: 'Very Positive',
      totalReviews: 14850,
      totalPositive: 13513,
      totalNegative: 1337,
      metascore: 85,
      steamUrl: 'https://store.steampowered.com/app/1601570/',
      steamDbUrl: 'https://steamdb.info/app/1601570/',
    },
    timestamp: Date.now(),
  },
};

for (const [key, value] of Object.entries(ratingSeed)) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

const view = new URLSearchParams(window.location.search).get('page') ?? 'home';
const pageMarkup: Record<string, { bodyClass: string; content: string }> = {
  single: {
    bodyClass: 'single single-post',
    content: `${gameArticle}${postNavigation}${commentsSection}`,
  },
  pink: {
    bodyClass: 'single single-post category-lossless-repack category-pink-paw-award',
    content: `${pinkPawGameArticle}${postNavigation}${commentsSection}`,
  },
  digest: { bodyClass: 'single single-post category-updates-digest', content: digestArticle },
  popular: { bodyClass: 'page page-template-default', content: popularPageArticle },
  az: { bodyClass: 'page page-template-default', content: azPageArticle },
  updates: { bodyClass: 'page page-template-default', content: updatesPageArticle },
  archive: {
    bodyClass: 'archive date list-view',
    content: `<header class="page-header"><h1 class="page-title">Monthly Archives: August 2026</h1></header>${gameArticle}${gameArticle.replaceAll('Sample Game', 'Archive Game')}`,
  },
  // 带分页导航的归档流：无限滚动会去抓 /page/2/，用于验证加载骨架屏
  paged: {
    bodyClass: 'archive date list-view',
    content: `<header class="page-header"><h1 class="page-title">Monthly Archives: August 2026</h1></header>${archiveListingContent}`,
  },
  search: {
    bodyClass: 'search search-results list-view',
    content: `<header class="page-header"><h1 class="page-title">Search Results for: sample</h1></header>${gameArticle.replaceAll('entry-content', 'entry-summary')}${gameArticle.replaceAll('entry-content', 'entry-summary').replaceAll('Sample Game', 'Search Result Game')}`,
  },
};
const selected = pageMarkup[view];
if (selected) {
  document.body.className = selected.bodyClass;
  document.body.innerHTML = `${siteHeader}<div id="page"><main id="main"><div id="primary"><div id="content" class="site-content">${selected.content}</div></div>${siteSidebarExtras}</main>${popularWidget}${siteFooterExtras}</div>`;
} else {
  // 复现真实站点首页：≤400px 时主题切到 list-view 紧凑列表并隐藏 .entry-content
  document.body.className = 'home blog list-view';
  document.body.innerHTML = fullPage;
}

/*
 * 复刻主题 twentyfourteen-fg 在 `@media screen and (max-width: 400px)` 下的规则：
 * 真实站点首页/搜索/归档页会带 body.list-view，并以 (0,4,0) 特异性隐藏
 * .entry-content/.entry-summary。增强模式必须覆盖它，否则移动端卡片只剩标题、
 * upcoming 区块塌成空壳（该 bug 只在真实站点出现，unit fixture 无法复现）。
 */
const themeListViewController = document.createElement('style');
themeListViewController.id = 'fwe-theme-list-view';
themeListViewController.textContent = `
  @media screen and (max-width: 400px) {
    .list-view .site-content .type-post .entry-content,
    .list-view .site-content .type-page .entry-content,
    .list-view .site-content .type-post .entry-summary,
    .list-view .site-content .type-page .entry-summary {
      display: none;
    }
  }
`;
document.head.append(themeListViewController);

/*
 * 复刻 twentyfourteen-fg 给 `.site-content .entry-header/.entry-content` 写死的
 * `background-color:#fff`（真实站点 style.css:1171 / 1303，特异性 (0,2,0)）。
 * 之前 fixture 没有这条，暗色快照一直是干净的，掩盖了一个线上 bug：我们的
 * 中和规则若用 `:where(...)`（特异性 (0,1,1)）会被这条压过，暗色下卡片内部变成
 * 白底 + 浅字。注入后 e2e 的「白底必须被中和」断言才真正覆盖线上场景。
 * JS 写的内联 <style> 在用户脚本 GM_addStyle 之前执行（脚本 run-at document-idle），
 * 所以下面这条先入场、用户的 CSS 后入场，胜负纯看特异性，与线上一致。
 */
const themeWhiteBackgrounds = document.createElement('style');
themeWhiteBackgrounds.id = 'fwe-theme-white-backgrounds';
themeWhiteBackgrounds.textContent = `
  .site-content .entry-header { background-color: #fff; }
  .site-content .entry-content,
  .site-content .entry-summary,
  .page-content { background-color: #fff; }
`;
document.head.append(themeWhiteBackgrounds);

const assets = [
  '/test/e2e/assets/cover.svg',
  '/test/e2e/assets/shot-1.svg',
  '/test/e2e/assets/shot-2.svg',
  '/test/e2e/assets/shot-3.svg',
];
document
  .querySelectorAll<HTMLImageElement>('.game-info img, a[href*="cover"] img')
  .forEach((image) => {
    image.src = assets[0] ?? '';
  });
document
  .querySelectorAll<HTMLAnchorElement>('.entry-content a:has(img), .entry-summary a:has(img)')
  .forEach((anchor, index) => {
    const asset = assets[(index % 3) + 1] ?? assets[1] ?? '';
    anchor.href = asset;
    const img = anchor.querySelector('img');
    if (img) img.src = asset;
  });
document.querySelectorAll<HTMLImageElement>('#block-2 img').forEach((image, index) => {
  image.src = assets[(index % 3) + 1] ?? assets[1] ?? '';
});

await import('../../dist/fitgirl-enhanced.user.js');
