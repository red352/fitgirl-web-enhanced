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
await disableAnimations();
await page.screenshot({
  path: resolve(assetsDir, 'listing-mobile.png'),
  fullPage: true,
  animations: 'disabled',
});

// 3. 桌面详情页 (Desktop Detail)
console.log('Capturing detail-desktop.png...');
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto('http://127.0.0.1:4178/test/e2e/?page=single');
await page.waitForSelector('.fwe-detail');
await disableAnimations();
await page.screenshot({
  path: resolve(assetsDir, 'detail-desktop.png'),
  fullPage: true,
  animations: 'disabled',
});

// 4. 移动端热门榜单抽屉 (Mobile Popular Sheet)
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

// 5. 桌面多媒体交互灯箱 (Desktop Lightbox)
console.log('Capturing lightbox-desktop.png...');
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto('http://127.0.0.1:4178/test/e2e/');
await page.waitForSelector('.fwe-game-card .fwe-media__item');
await page.click('.fwe-game-card .fwe-media__item');
await page.waitForSelector('.fwe-lightbox-dialog[open]');
await disableAnimations();
await page.screenshot({
  path: resolve(assetsDir, 'lightbox-desktop.png'),
  fullPage: false,
  animations: 'disabled',
});

// 6. 桌面卡片快捷模态弹窗 (Desktop Card Detail Modal)
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
