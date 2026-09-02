import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 720 },
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'wide', width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test(`${viewport.name} 无横向溢出并使用对应列数`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('data-fwe-mode', 'enhanced');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const columns = await page
      .locator('#content')
      .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(viewport.width >= 1152 ? 2 : 1);
  });
}

test('Upcoming、卡片和内容容器左右对齐', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await expect(page.locator('.menu-toggle')).toBeHidden();
  await expect(page.locator('.widget_archive')).toBeHidden();
  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => {
      const item = document.querySelector(selector)?.getBoundingClientRect();
      return item ? { left: item.left, right: item.right, width: item.width } : null;
    };
    return {
      content: rect('#content'),
      upcoming: rect('.fwe-upcoming'),
      card: rect('.fwe-game-card'),
    };
  });
  expect(geometry.upcoming?.left).toBeCloseTo(geometry.content?.left ?? 0, 0);
  expect(geometry.upcoming?.right).toBeCloseTo(geometry.content?.right ?? 0, 0);
  expect(geometry.card?.left).toBeCloseTo(geometry.content?.left ?? 0, 0);

  const upcomingDetails = page.locator('.fwe-upcoming__details');
  await expect(upcomingDetails).toHaveAttribute('open', '');
  await expect(page.locator('.fwe-upcoming__body a').first()).toBeVisible();
  expect(await page.locator('.fwe-upcoming__body a').count()).toBeGreaterThan(0);
});

test('列表媒体默认展开，所有媒体连续填充，且可通过设置切换默认折叠', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  const card = page.locator('.fwe-game-card').first();
  const media = card.locator('.fwe-media');
  await expect(media).toHaveAttribute('open', '');
  await expect(media.locator('.fwe-media__item')).toHaveCount(4);
  await expect(media.locator('.fwe-media__gallery > br')).toHaveCount(0);
  const positions = await media.locator('.fwe-media__item').evaluateAll((items) =>
    items.map((item) => {
      const rect = item.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  );
  expect(positions[0]?.x).toBeLessThan(positions[1]?.x ?? 0);
  expect(positions[2]?.y).toBeGreaterThan(positions[0]?.y ?? 0);
  expect(positions.every((item) => item.width > 0 && item.height > 0)).toBe(true);

  await page.locator('.fwe-view-control__trigger').click();
  const mediaSwitch = page.locator('.fwe-switch').nth(1);
  await mediaSwitch.click();
  await expect(media).not.toHaveAttribute('open');

  await page.reload();
  const reloadedCard = page.locator('.fwe-game-card').first();
  await expect(reloadedCard.locator('.fwe-media')).not.toHaveAttribute('open');

  await page.locator('.fwe-view-control__trigger').click();
  await page.locator('.fwe-switch').nth(1).click();
  await expect(reloadedCard.locator('.fwe-media')).toHaveAttribute('open', '');
});

test('详情图库默认展开，移动端单列且图片填充容器', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?page=single');
  const media = page.locator('.fwe-detail .fwe-media');
  await expect(media).toHaveAttribute('open', '');
  const dimensions = await media
    .locator('.fwe-media__item')
    .first()
    .evaluate((item) => {
      const image = item.querySelector('img');
      const outer = item.getBoundingClientRect();
      const inner = image?.getBoundingClientRect();
      const gallery = item.parentElement;
      const galleryStyle = gallery ? getComputedStyle(gallery) : null;
      return {
        outer: outer.width,
        inner: inner?.width,
        galleryContent:
          gallery && galleryStyle
            ? gallery.getBoundingClientRect().width -
              Number.parseFloat(galleryStyle.paddingLeft) -
              Number.parseFloat(galleryStyle.paddingRight)
            : undefined,
      };
    });
  expect(dimensions.inner).toBeCloseTo(dimensions.outer, 0);
  expect(dimensions.outer).toBeCloseTo(dimensions.galleryContent ?? 0, 0);
});

test('顶部保留桌面悬浮子菜单，Browse 提供完整路由和归档', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  const primary = page.locator('.fwe-nav-priority').first();
  await primary.hover();
  const subMenu = primary.locator('.sub-menu');
  await expect(subMenu).toBeVisible();
  const subMenuLink = subMenu.locator('a').first();
  await subMenuLink.hover();
  await expect(subMenu).toBeVisible();
  await expect(subMenuLink).toBeVisible();
  await page.getByRole('button', { name: '浏览站点路由和月度归档' }).click();
  const browse = page.locator('.fwe-browse-dialog');
  await expect(browse).toBeVisible();
  await expect(browse.getByText('Monthly Archives')).toBeVisible();
  await expect(browse.getByRole('link', { name: 'September 2026' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(browse).not.toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('#site-header-menu')).toBeHidden();
  await expect(page.getByRole('button', { name: '浏览站点路由和月度归档' })).toBeVisible();
});

test('Digest、搜索和月度归档保持统一卡片布局', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  const cardWidth = await page
    .locator('.fwe-game-card')
    .first()
    .evaluate((node) => node.getBoundingClientRect().width);
  const digestWidth = await page
    .locator('.fwe-digest')
    .evaluate((node) => node.getBoundingClientRect().width);
  expect(digestWidth).toBeCloseTo(cardWidth, 0);

  await page.goto('./?page=search&s=sample');
  await expect(page.locator('.fwe-search-card')).toHaveCount(2);
  expect(
    await page
      .locator('.fwe-search-source')
      .evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).display === 'none')),
  ).toBe(true);
  const searchOverflow = await page
    .locator('.fwe-search-card')
    .first()
    .evaluate((node) => getComputedStyle(node).overflow);
  expect(searchOverflow).not.toBe('clip');

  await page.goto('./?page=archive');
  await expect(page.locator('.page-title')).toContainText('Monthly Archives');
  await expect(page.locator('.fwe-game-card')).toHaveCount(2);
});

test('首页两列卡片依次填满，且隐藏内容容器内的非文章杂项元素', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  const cards = page.locator('#content > article.hentry:not(.fwe-upcoming)');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(2);
  const rects = await cards.evaluateAll((list) =>
    list.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
      };
    }),
  );
  expect(rects[0]?.left).toBeLessThan(rects[1]?.left ?? 0);
  expect(rects[0]?.top).toBeCloseTo(rects[1]?.top ?? 0, 1);
});

test('独立页面（popular、a-z、updates）使用单列居中布局且占满内容区', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const pageName of ['popular', 'az', 'updates']) {
    await page.goto(`./?page=${pageName}`);
    const geometry = await page.evaluate(() => {
      const content = document.querySelector('#content')?.getBoundingClientRect();
      const article = document.querySelector('#content article')?.getBoundingClientRect();
      return {
        contentLeft: content?.left,
        contentWidth: content?.width,
        articleLeft: article?.left,
        articleWidth: article?.width,
      };
    });
    expect(geometry.articleLeft).toBeCloseTo(geometry.contentLeft ?? 0, 0);
    expect(geometry.articleWidth).toBeCloseTo(geometry.contentWidth ?? 0, 0);
  }
});

test('Digest 折叠符号改为原生 disclosure', async ({ page }) => {
  await page.goto('./?page=digest');
  await expect(page.locator('.fwe-inline-disclosure')).toHaveCount(2);
  await expect(page.locator('.fwe-inline-disclosure .su-spoiler-icon')).toHaveCount(0);
  const first = page.locator('.fwe-inline-disclosure').first();
  await first.locator('summary').press('Enter');
  await expect(first).toHaveAttribute('open', '');
});

test('布局选择跨刷新保持，原站模式仅使用固定恢复入口', async ({ page }) => {
  await page.goto('./');
  const viewControl = page.locator('.fwe-view-control');
  await viewControl.locator('summary').click();
  const toggle = page.getByRole('switch', { name: '切换增强布局与原站布局' });
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-fwe-mode', 'original');
  await expect(page.locator('.fwe-view-control')).toHaveCSS('position', 'fixed');
  await expect(page.locator('.fwe-popular-button')).toBeHidden();
  await expect(page.locator('.fwe-browse-button')).toBeHidden();
  await expect(page.locator('.fwe-search')).toBeHidden();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-fwe-mode', 'original');
  await viewControl.locator('summary').click();
  await toggle.click();
  await expect(page.locator('.fwe-game-layout')).toHaveCount(2);
});

test('热门面板支持焦点圈定、Esc 与焦点归还', async ({ page }) => {
  await page.goto('./');
  const trigger = page.locator('.fwe-popular-button');
  await trigger.click();
  const dialog = page.locator('.fwe-popular-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('.fwe-popular-item__link').last().focus();
  await page.keyboard.press('Tab');
  await expect(dialog.locator('.fwe-icon-button')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('桌面和移动视觉快照', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await expect(page).toHaveScreenshot('listing-desktop.png', { fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page).toHaveScreenshot('listing-mobile.png', { fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./?page=single');
  await expect(page).toHaveScreenshot('detail-desktop.png', { fullPage: true });
});
