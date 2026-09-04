import { createServer } from 'vite';
import { chromium } from 'playwright';
import console from 'node:console';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const root = resolve(import.meta.dirname, '..');
const assetsDir = resolve(root, 'docs/assets');
await mkdir(assetsDir, { recursive: true });

const server = await createServer({
  root,
  server: {
    port: 4178,
    strictPort: true,
  },
});
await server.listen();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  deviceScaleFactor: 1,
  colorScheme: 'light',
});

const ratingSeed = {
  'fitgirl-web-enhanced:v1:rating:sample game: deluxe edition': {
    data: {
      appId: 1091500,
      name: 'Cyberpunk 2077',
      positivePercent: 89,
      scoreDesc: '特别好评',
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
  'fitgirl-web-enhanced:v1:rating:sample game': {
    data: {
      appId: 1091500,
      name: 'Cyberpunk 2077',
      positivePercent: 89,
      scoreDesc: '特别好评',
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
      scoreDesc: '特别好评',
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
      scoreDesc: '特别好评',
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

await context.addInitScript((seed) => {
  for (const [key, val] of Object.entries(seed)) {
    globalThis.localStorage.setItem(key, JSON.stringify(val));
  }
}, ratingSeed);

const page = await context.newPage();

const disableAnimations = async () => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition-duration: 0s !important;
        animation-duration: 0s !important;
      }
    `,
  });
};

// 1. 桌面浏览页 (Desktop Listing)
console.log('Capturing listing-desktop.png...');
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto('http://127.0.0.1:4178/test/e2e/');
await page.waitForSelector('.fwe-game-card');
await page.waitForSelector('.fwe-rating-badge');
await disableAnimations();
await page.screenshot({
  path: resolve(assetsDir, 'listing-desktop.png'),
  fullPage: true,
  animations: 'disabled',
});

// 2. 移动端浏览页 (Mobile Listing)
console.log('Capturing listing-mobile.png...');
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://127.0.0.1:4178/test/e2e/');
await page.waitForSelector('.fwe-game-card');
await page.waitForSelector('.fwe-rating-badge');
await page.waitForTimeout(400);
await disableAnimations();
await page.screenshot({
  path: resolve(assetsDir, 'listing-mobile.png'),
  fullPage: true,
  animations: 'disabled',
});

// 3. Steam 游戏评分与评测详情浮层 (Steam Rating Popover)
console.log('Capturing rating-popover.png...');
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://127.0.0.1:4178/test/e2e/');
await page.waitForSelector('.fwe-rating-badge');
await disableAnimations();
await page.hover('.fwe-rating-badge');
await page.waitForSelector('.fwe-rating-popover[aria-hidden="false"]');
await page.screenshot({
  path: resolve(assetsDir, 'rating-popover.png'),
  fullPage: false,
  animations: 'disabled',
});

// 4. 桌面详情页 (Desktop Detail)
console.log('Capturing detail-desktop.png...');
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto('http://127.0.0.1:4178/test/e2e/?page=single');
await page.waitForSelector('.fwe-detail');
await page.waitForSelector('.fwe-fact--rating');
await disableAnimations();
await page.screenshot({
  path: resolve(assetsDir, 'detail-desktop.png'),
  fullPage: true,
  animations: 'disabled',
});

// 5. Pink Paw Award 荣誉游戏详情页 (Pink Paw Award Detail)
console.log('Capturing pink-paw-desktop.png...');
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto('http://127.0.0.1:4178/test/e2e/?page=pink');
await page.waitForSelector('.fwe-paw-badge');
await disableAnimations();
await page.screenshot({
  path: resolve(assetsDir, 'pink-paw-desktop.png'),
  fullPage: true,
  animations: 'disabled',
});

// 6. 移动端热门榜单抽屉 (Mobile Popular Sheet)
console.log('Capturing popular-mobile.png...');
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://127.0.0.1:4178/test/e2e/');
await page.waitForSelector('.fwe-popular-button');
await page.click('.fwe-popular-button');
await page.waitForSelector('.fwe-popular-dialog[open]');
await disableAnimations();
await page.screenshot({
  path: resolve(assetsDir, 'popular-mobile.png'),
  fullPage: false,
  animations: 'disabled',
});

// 7. 桌面多媒体交互灯箱 (Desktop Lightbox)
console.log('Capturing lightbox-desktop.png...');
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto('http://127.0.0.1:4178/test/e2e/');
await page.waitForSelector('.fwe-game-card .fwe-media__item');
await page.click('.fwe-game-card .fwe-media__item');
await page.waitForSelector('.fwe-lightbox-dialog[open]');
await page.waitForSelector('.fwe-lightbox-dialog[open] img');
await page.waitForTimeout(200);
await disableAnimations();
await page.screenshot({
  path: resolve(assetsDir, 'lightbox-desktop.png'),
  fullPage: false,
  animations: 'disabled',
});

// 8. 桌面卡片快捷模态弹窗 (Desktop Card Detail Modal)
console.log('Capturing modal-desktop.png...');
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto('http://127.0.0.1:4178/test/e2e/');
await page.waitForSelector('.fwe-card-btn--primary');
await page.click('.fwe-card-btn--primary');
await page.waitForSelector('.fwe-game-dialog[open]');
await disableAnimations();
await page.screenshot({
  path: resolve(assetsDir, 'modal-desktop.png'),
  fullPage: false,
  animations: 'disabled',
});

await browser.close();
await server.close();
console.log('All screenshots captured and saved to docs/assets successfully!');
