import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const userscript = resolve(root, 'dist/fitgirl-enhanced.user.js');
const output = resolve(root, 'test-results');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

const targets = [
  { name: 'home', url: 'https://fitgirl-repacks.site/', viewport: { width: 1440, height: 1000 } },
  {
    name: 'detail',
    url: 'https://fitgirl-repacks.site/big-ambitions/',
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'detail-mobile',
    url: 'https://fitgirl-repacks.site/big-ambitions/',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'search',
    url: 'https://fitgirl-repacks.site/?s=big+ambitions',
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'digest',
    url: 'https://fitgirl-repacks.site/updates-digest-for-august-31-2026/',
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'popular-page',
    url: 'https://fitgirl-repacks.site/popular-repacks/',
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'az-page',
    url: 'https://fitgirl-repacks.site/all-my-repacks-a-z/',
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'updates-page',
    url: 'https://fitgirl-repacks.site/updates-list/',
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'monthly-archive',
    url: 'https://fitgirl-repacks.site/2026/08/',
    viewport: { width: 1440, height: 1000 },
  },
];

for (const target of targets.filter(
  (item) => !process.env.FWE_LIVE_TARGET || item.name === process.env.FWE_LIVE_TARGET,
)) {
  const context = await browser.newContext({ viewport: target.viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const source = await page.evaluate(() => ({
    bodyClass: document.body.className,
    articles: document.querySelectorAll('#content article.hentry, article.hentry').length,
    popular: document.querySelectorAll('#block-2 a[href] img').length,
  }));
  await page.addScriptTag({ path: userscript });
  await page.waitForSelector('html[data-fwe-mode="enhanced"]', { timeout: 15_000 });
  await page.waitForTimeout(750);
  const description = page.locator('.fwe-disclosure--description').first();
  if ((await description.count()) > 0) await description.locator('summary').click();
  const enhanced = await page.evaluate(() => ({
    cards: document.querySelectorAll('.fwe-game-card').length,
    details: document.querySelectorAll('.fwe-detail').length,
    special: document.querySelectorAll('.fwe-special').length,
    disclosures: document.querySelectorAll('.fwe-disclosure').length,
    media: document.querySelectorAll('.fwe-media__item').length,
    openListingGalleries: document.querySelectorAll(
      'body:not(.single-post) .fwe-game-card .fwe-media[open]',
    ).length,
    openDetailGalleries: document.querySelectorAll('.fwe-detail .fwe-media[open]').length,
    popularRows: document.querySelectorAll('.fwe-popular-item').length,
    digest: document.querySelectorAll('.fwe-digest').length,
    popularDirectory: document.querySelectorAll('.fwe-directory-popular').length,
    azDirectory: document.querySelectorAll('.fwe-directory-az').length,
    updatesDirectory: document.querySelectorAll('.fwe-directory-updates').length,
    searchVisible: (() => {
      const search = document.querySelector('.fwe-search');
      return search !== null && getComputedStyle(search).display !== 'none';
    })(),
    archivesInBrowse: document.querySelectorAll('.fwe-archive-year a').length,
    menuToggleHidden: (() => {
      const node = document.querySelector('.menu-toggle');
      return node ? getComputedStyle(node).display === 'none' : true;
    })(),
    descriptionHeight: Math.round(
      document
        .querySelector('.fwe-disclosure--description .su-spoiler-content')
        ?.getBoundingClientRect().height ?? 0,
    ),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    sidebarsVisible: [...document.querySelectorAll('#primary-sidebar, #content-sidebar')].some(
      (node) => getComputedStyle(node).display !== 'none',
    ),
    header: (() => {
      const node = document.querySelector('#masthead');
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        height: Math.round(rect.height),
        display: getComputedStyle(node).display,
      };
    })(),
    headerItems: [
      ...document.querySelectorAll(
        '#masthead .site-title, #masthead nav, #site-header-menu, .fwe-search, .fwe-popular-button',
      ),
    ].map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        className: node.className,
        tagName: node.tagName,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        display: getComputedStyle(node).display,
      };
    }),
    scrollY: Math.round(document.defaultView?.scrollY ?? 0),
  }));
  await page.screenshot({ path: resolve(output, `live-${target.name}.png`), fullPage: false });
  results.push({ target: target.name, source, enhanced, errors });
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
