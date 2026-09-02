import {
  azPageArticle,
  digestArticle,
  fullPage,
  gameArticle,
  popularPageArticle,
  popularWidget,
  siteHeader,
  updatesPageArticle,
} from '../fixtures';

const view = new URLSearchParams(window.location.search).get('page') ?? 'home';
const pageMarkup: Record<string, { bodyClass: string; content: string }> = {
  single: { bodyClass: 'single single-post', content: gameArticle },
  digest: { bodyClass: 'single single-post category-updates-digest', content: digestArticle },
  popular: { bodyClass: 'page page-template-default', content: popularPageArticle },
  az: { bodyClass: 'page page-template-default', content: azPageArticle },
  updates: { bodyClass: 'page page-template-default', content: updatesPageArticle },
  archive: {
    bodyClass: 'archive date',
    content: `<header class="page-header"><h1 class="page-title">Monthly Archives: August 2026</h1></header>${gameArticle}${gameArticle.replaceAll('Sample Game', 'Archive Game')}`,
  },
  search: {
    bodyClass: 'search search-results',
    content: `<header class="page-header"><h1 class="page-title">Search Results for: sample</h1></header>${gameArticle.replaceAll('entry-content', 'entry-summary')}${gameArticle.replaceAll('entry-content', 'entry-summary').replaceAll('Sample Game', 'Search Result Game')}`,
  },
};
const selected = pageMarkup[view];
if (selected) {
  document.body.className = selected.bodyClass;
  document.body.innerHTML = `${siteHeader}<div id="page"><main id="main"><div id="primary"><div id="content">${selected.content}</div></div></main>${popularWidget}</div>`;
} else {
  document.body.className = 'home blog';
  document.body.innerHTML = fullPage;
}

const assets = [
  '/test/e2e/assets/cover.svg',
  '/test/e2e/assets/shot-1.svg',
  '/test/e2e/assets/shot-2.svg',
  '/test/e2e/assets/shot-3.svg',
];
document.querySelectorAll<HTMLImageElement>('.game-info img').forEach((image) => {
  image.src = assets[0] ?? '';
});
document
  .querySelectorAll<HTMLImageElement>('.entry-content a img, .entry-summary a img')
  .forEach((image, index) => {
    image.src = assets[(index % 3) + 1] ?? assets[1] ?? '';
  });
document.querySelectorAll<HTMLImageElement>('#block-2 img').forEach((image, index) => {
  image.src = assets[(index % 3) + 1] ?? assets[1] ?? '';
});

await import('../../dist/fitgirl-enhanced.user.js');
