import {
  azPageArticle,
  digestArticle,
  fullPage,
  gameArticle,
  pinkPawGameArticle,
  popularPageArticle,
  popularWidget,
  siteHeader,
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
  single: { bodyClass: 'single single-post', content: gameArticle },
  pink: {
    bodyClass: 'single single-post category-lossless-repack category-pink-paw-award',
    content: pinkPawGameArticle,
  },
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
