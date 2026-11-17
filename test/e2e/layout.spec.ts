import { expect, test } from '@playwright/test';
import { archiveListingPage2Content } from '../fixtures';

// 无限滚动抓取第 2 页时由路由回放的完整页面（含 #content 与两篇新卡）
const page2Content = archiveListingPage2Content;

/*
 * 页脚带里的 OST 格与线上同构，但脚本在 boot 时撤掉了播放器的 src、换成海报
 * 瓦片（见 prepareOstTiles）：播放器不再自连，页面的 load 事件也不会被它拖住，
 * 所以这里不需要拦截任何外网请求。海报缩略图（i.ytimg.com）是点击前唯一的外部
 * 请求。若将来 OST 又变成默认自连，无限滚动的计时测试会被再次撞穿，届时在这里
 * 补一条 `page.route('**://www.youtube.com/**', ...)` 即可。
 */
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 720 },
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'wide', width: 1920, height: 1080 },
];

const seededRatings = {
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

test.beforeEach(async ({ page }) => {
  await page.addInitScript((seed) => {
    for (const [key, value] of Object.entries(seed)) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, seededRatings);
});

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
      .locator('.fwe-stream')
      .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
    const expectedCols =
      viewport.width >= 2400 ? 4 : viewport.width >= 1700 ? 3 : viewport.width >= 1152 ? 2 : 1;
    expect(columns).toBe(expectedCols);

    // 元信息胶囊不得把标题压扁：任何视口下标题都必须留有可用宽度
    const titleWidth = await page
      .locator('.fwe-stream .fwe-game-card .entry-title')
      .first()
      .evaluate((node) => node.getBoundingClientRect().width);
    const cardWidth = await page
      .locator('.fwe-stream .fwe-game-card')
      .first()
      .evaluate((node) => node.getBoundingClientRect().width);
    expect(titleWidth).toBeGreaterThan(cardWidth * 0.35);
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
      return item
        ? {
            left: item.left,
            right: item.right,
            top: item.top,
            bottom: item.bottom,
            width: item.width,
          }
        : null;
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
  expect(geometry.upcoming?.top).toBeLessThan(geometry.card?.top ?? 0);

  const upcomingDetails = page.locator('.fwe-upcoming__details');
  await expect(upcomingDetails).toHaveAttribute('open', '');
  await expect(page.locator('.fwe-upcoming__body a').first()).toBeVisible();
  expect(await page.locator('.fwe-upcoming__body a').count()).toBeGreaterThan(0);

  const upcomingBody = page.locator('.fwe-upcoming__body');
  expect(
    await upcomingBody.evaluate(
      (node) => node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight,
    ),
  ).toBe(false);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await upcomingBody.evaluate(
        (node) => node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight,
      ),
    ).toBe(false);
    expect(
      await page.locator('.fwe-upcoming__details-link').evaluate((node) => {
        const link = node.getBoundingClientRect();
        const summary = node.parentElement?.getBoundingClientRect();
        return (
          link.left >= (summary?.left ?? 0) &&
          link.right <= (summary?.right ?? innerWidth) &&
          link.top >= (summary?.top ?? 0) &&
          link.bottom <= (summary?.bottom ?? innerHeight)
        );
      }),
    ).toBe(true);
  }
});

test('列表媒体默认折叠成 4 格胶片条，可通过设置切换默认展开', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  const card = page.locator('.fwe-game-card').first();
  const media = card.locator('.fwe-media');
  await expect(media).not.toHaveAttribute('open');

  // 折叠态仍看得到前 4 张，第 5 张起收起
  await expect(media.locator('.fwe-media__item')).toHaveCount(6);
  await expect(media.locator('.fwe-media__gallery > .fwe-media__item').nth(3)).toBeVisible();
  await expect(media.locator('.fwe-media__gallery > .fwe-media__item').nth(4)).toBeHidden();
  const columns = await media
    .locator('.fwe-media__gallery')
    .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(4);

  // 展开后 6 张全部连续填充
  await page.locator('.fwe-view-control__trigger').click();
  await page.locator('.fwe-switch').nth(1).click();
  await expect(media).toHaveAttribute('open', '');
  await expect(media.locator('.fwe-media__gallery > .fwe-media__item').nth(4)).toBeVisible();

  // 展开态回到 2 列连续填充：只断 nth(4) 可见的话，网格退成单列或 item 尺寸归零都能全绿
  const expanded = await media.locator('.fwe-media__gallery').evaluate((node) => ({
    columns: getComputedStyle(node).gridTemplateColumns.split(' ').length,
    sized: [...node.children].every((child) => {
      const rect = child.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }),
  }));
  expect(expanded.columns).toBe(2);
  expect(expanded.sized).toBe(true);

  await page.reload();
  await expect(page.locator('.fwe-game-card').first().locator('.fwe-media')).toHaveAttribute(
    'open',
    '',
  );
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

test('详情页模块原生完整展示，且保留直链折叠交互', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./?page=single');
  const sections = page.locator('.fwe-detail .fwe-detail-section');
  await expect(sections).toHaveCount(3);

  // 内部无 max-height 限制
  const maxHeight = await sections
    .first()
    .locator('.fwe-detail-section__content')
    .evaluate((el) => getComputedStyle(el).maxHeight);
  expect(maxHeight).toBe('none');

  // 原版“Click to show direct links”折叠形式保留且默认闭合
  const directLinks = page.locator('.fwe-detail .fwe-direct-links-details');
  if ((await directLinks.count()) > 0) {
    await expect(directLinks.first()).not.toHaveAttribute('open');
    await directLinks.first().locator('.fwe-direct-links-summary').click();
    await expect(directLinks.first()).toHaveAttribute('open', '');
  }
});

test('列表卡片采用底座按钮形式，点击秒开带有Tab的磨砂玻璃Dialog，保留直链折叠', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  const card = page.locator('.fwe-game-card').first();
  const actions = card.locator('.fwe-card-actions');
  await expect(actions).toBeVisible();

  const downloadBtn = actions.locator('.fwe-card-btn--primary');
  await expect(downloadBtn).toHaveText(/Download Mirrors/);

  // 点击 Download Mirrors 打开 Dialog
  await downloadBtn.click();
  const dialog = page.locator('.fwe-game-dialog');
  await expect(dialog).toBeVisible();

  // 默认激活 Downloads Tab，且内容严格隔离（仅 Downloads 可见，其他面板绝对隐藏）
  const activeTab = dialog.locator('.fwe-game-dialog__tab--active');
  await expect(activeTab).toHaveText(/Download Mirrors/);
  await expect(dialog.locator('.fwe-game-dialog__pane--downloads')).toBeVisible();
  await expect(dialog.locator('.fwe-game-dialog__pane--features')).not.toBeVisible();
  await expect(dialog.locator('.fwe-game-dialog__pane--description')).not.toBeVisible();

  // 检查直链折叠形式保留
  const directLinks = dialog.locator('.fwe-direct-links-details');
  if ((await directLinks.count()) > 0) {
    await expect(directLinks.first()).not.toHaveAttribute('open');
    await directLinks.first().locator('.fwe-direct-links-summary').click();
    await expect(directLinks.first()).toHaveAttribute('open', '');
  }

  // 切换到 Features Tab，内容严格切换（仅 Features 可见，Downloads 变为隐藏）
  const featuresTab = dialog.locator('.fwe-game-dialog__tab').nth(1);
  await featuresTab.click();
  await expect(dialog.locator('.fwe-game-dialog__pane--features')).toBeVisible();
  await expect(dialog.locator('.fwe-game-dialog__pane--downloads')).not.toBeVisible();

  // 按 Esc 关闭弹窗，焦点归还
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(downloadBtn).toBeFocused();
});

test('顶部保留桌面悬浮子菜单，Browse 提供完整路由和归档', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  const viewTrigger = page.locator('.fwe-view-control__trigger');
  const browseTrigger = page.locator('.fwe-browse-button');
  const desktopViewBox = await viewTrigger.boundingBox();
  const desktopBrowseBox = await browseTrigger.boundingBox();
  expect(desktopViewBox).not.toBeNull();
  expect(desktopBrowseBox).not.toBeNull();
  if (!desktopViewBox || !desktopBrowseBox) throw new Error('Desktop header controls unavailable');
  expect(desktopBrowseBox.x + desktopBrowseBox.width).toBeLessThanOrEqual(desktopViewBox.x);

  const primary = page.locator('.fwe-nav-priority').first();
  await primary.hover();
  const subMenu = primary.locator('.sub-menu');
  await expect(subMenu).toBeVisible();
  const subMenuLink = subMenu.locator('a').first();
  await subMenuLink.hover();
  await expect(subMenu).toBeVisible();
  await expect(subMenuLink).toBeVisible();
  await page.getByRole('button', { name: 'Browse site categories and monthly archives' }).click();
  const browse = page.locator('.fwe-browse-dialog');
  await expect(browse).toBeVisible();
  await expect(browse.getByText('Monthly Archives')).toBeVisible();
  await expect(browse.getByRole('link', { name: 'September 2026' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(browse).not.toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('#site-header-menu')).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Browse site categories and monthly archives' }),
  ).toBeVisible();
  const mobileViewBox = await page.locator('.fwe-view-control__trigger').boundingBox();
  const mobileBrowseBox = await page.locator('.fwe-browse-button').boundingBox();
  expect(mobileViewBox).not.toBeNull();
  expect(mobileBrowseBox).not.toBeNull();
  if (!mobileViewBox || !mobileBrowseBox) throw new Error('Mobile header controls unavailable');
  expect(mobileBrowseBox.x + mobileBrowseBox.width).toBeLessThanOrEqual(mobileViewBox.x);
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

test('首页多列卡片依次填满，且隐藏内容容器内的非文章杂项元素', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  const cards = page.locator('.fwe-stream > article.hentry');
  const firstCard = cards.nth(0);
  const secondCard = cards.nth(1);
  await expect(firstCard).toBeVisible();
  await expect(secondCard).toBeVisible();

  const firstRect = await firstCard.boundingBox();
  const secondRect = await secondCard.boundingBox();
  expect(firstRect).not.toBeNull();
  expect(secondRect).not.toBeNull();

  expect(firstRect?.x).toBeLessThan(secondRect?.x ?? 0);
  expect(firstRect?.y).toBeCloseTo(secondRect?.y ?? 0, 1);
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
  const enhancedBox = await viewControl.boundingBox();
  expect(enhancedBox).not.toBeNull();
  if (!enhancedBox) throw new Error('Enhanced view control unavailable');

  await viewControl.locator('summary').click();
  const toggle = page.getByRole('switch', { name: 'Toggle enhanced grid layout' });
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-fwe-mode', 'original');
  await expect(viewControl).toHaveCSS('position', 'fixed');
  const originalBox = await viewControl.boundingBox();
  expect(originalBox).not.toBeNull();
  if (!originalBox) throw new Error('Original view control unavailable');
  expect(originalBox.x + originalBox.width).toBe(enhancedBox.x + enhancedBox.width);
  expect(originalBox.y).toBe(enhancedBox.y);
  expect(originalBox.width).toBeLessThanOrEqual(enhancedBox.width);

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

test('媒体截图点击打开磨砂玻璃预览对话框并支持翻页与Esc关闭', async ({ page }) => {
  await page.goto('./');
  const firstItem = page.locator('.fwe-game-card .fwe-media__item').first();
  await firstItem.click();
  const dialog = page.locator('.fwe-lightbox-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.fwe-lightbox__counter')).toHaveText('1 / 6');

  await dialog.locator('.fwe-lightbox__nav--next').click();
  await expect(dialog.locator('.fwe-lightbox__counter')).toHaveText('2 / 6');

  await page.keyboard.press('ArrowLeft');
  await expect(dialog.locator('.fwe-lightbox__counter')).toHaveText('1 / 6');

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('移动端标题与评分同行，评论数与侧栏/页脚内容得到保留', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-fwe-mode', 'enhanced');

  const geometry = await page.evaluate(() => {
    const card = document.querySelector('.fwe-stream .fwe-game-card');
    const header = card?.querySelector('.entry-header');
    const title = card?.querySelector('.entry-title');
    if (!header || !title) return null;
    const headerStyle = getComputedStyle(header);
    const headerRect = header.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    return {
      display: headerStyle.display,
      contentWidth:
        headerRect.width -
        Number.parseFloat(headerStyle.paddingLeft) -
        Number.parseFloat(headerStyle.paddingRight),
      titleWidth: titleRect.width,
      titleHeight: titleRect.height,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry?.display).toBe('grid');
  expect(geometry?.titleWidth ?? 0).toBeGreaterThanOrEqual((geometry?.contentWidth ?? 0) * 0.5);
  expect(geometry?.titleHeight ?? 0).toBeGreaterThan(10);
  expect(geometry?.overflow ?? 1).toBeLessThanOrEqual(1);

  // 原始 .entry-meta 的日期 / 分类 / 作者 / 评论数迁移为胶囊
  const card = page.locator('.fwe-stream .fwe-game-card').first();
  await expect(card.locator('.fwe-article-meta .fwe-meta-chip')).toHaveCount(4);
  await expect(
    card.locator('.fwe-article-meta a[href="/category/lossless-repack/"]'),
  ).toBeVisible();
  await expect(card.locator('.fwe-article-meta a[href="/author/fitgirl/"]')).toBeVisible();
  await expect(card.locator('.fwe-article-meta .tolstoycomments-cc')).toHaveCount(1);

  // 侧栏与页脚内容在 #main 末尾复原
  const extras = page.locator('.fwe-site-extras');
  await expect(extras).toBeVisible();
  const notice = extras.locator('.fwe-extras-notice__text');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('The ONLY official site for FitGirl Repacks');
  await expect(notice).toContainText('Do not fall for fake and scam sites');
  // 防伪警示必须真正占位，不能是被 display:none 的空壳
  expect(await notice.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThan(10);
  await expect(extras.getByText('Support the Cause')).toBeVisible();
  await expect(extras.getByText('My RSS Feed')).toBeVisible();
  await expect(extras.getByText('Subscribe to my releases via Email')).toBeVisible();
  await expect(extras.getByText('Press Play for my OST')).toBeVisible();
  await expect(extras.getByText('Today’s Most Popular Repacks')).toBeVisible();
  await expect(extras.locator('.fwe-directory-tile')).toHaveCount(10);
  await expect(extras.locator('input[type="email"]')).toBeVisible();
  // 月度归档仍只存在于 Browse 面板中
  await expect(extras.locator('#archives-2')).toHaveCount(0);
});

test('捐赠 / RSS / 订阅 / OST 降为一条页脚带，窄屏按 4→2→1 列退化且不错版', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-fwe-mode', 'enhanced');

  const strip = page.locator('.fwe-extras-block--strip');
  await expect(strip).toHaveCount(1);
  await expect(strip.locator('.fwe-extras-strip__cell')).toHaveCount(4);

  // OST 格不再立两根视频柱：默认是海报瓦片，点击才加载
  await expect(page.locator('.fwe-ost-tile')).toHaveCount(2);
  await expect(page.locator('.fwe-ost-pending')).toHaveCount(2);
  await expect(page.locator('.fwe-ost-tile').first().locator('img')).toHaveAttribute(
    'src',
    /i\.ytimg\.com\/vi\/[\w-]+\/hqdefault\.jpg/,
  );

  const extrasHeight = await page
    .locator('.fwe-site-extras')
    .evaluate((node) => node.getBoundingClientRect().height);
  expect(extrasHeight).toBeLessThan(640);

  /*
   * 「降权」必须在真实浏览器里被看见：卡片框、投影、圆角和面板填充全部去掉，
   * 只剩头顶一根细线。这里量的不是某个令牌值，而是这一条是否真的不再是卡片。
   */
  const desktop = await strip.evaluate((node) => {
    const style = getComputedStyle(node);
    const cell = node.querySelector('.fwe-extras-strip__cell');
    const title = node.querySelector('.fwe-extras-block__title');
    const spanOf = (selector: string): string => {
      const target = document.querySelector(selector);
      return target ? getComputedStyle(target).gridColumn : '';
    };
    return {
      columns: style.gridTemplateColumns.split(' ').length,
      borderTopWidth: Number.parseFloat(style.borderTopWidth),
      boxShadow: style.boxShadow,
      background: style.backgroundColor,
      cellWeight: cell ? Number.parseFloat(getComputedStyle(cell).fontSize) : 0,
      titleTransform: title ? getComputedStyle(title).textTransform : '',
      titleColor: title ? getComputedStyle(title).color : '',
      // 防伪警示和今日热门不受影响，仍是通栏
      noticeSpan: spanOf('.fwe-extras-notice'),
      wideSpan: spanOf('.fwe-extras-block--wide'),
    };
  });
  expect(desktop.columns).toBe(4);
  expect(desktop.borderTopWidth).toBeGreaterThan(0);
  expect(desktop.boxShadow).toBe('none');
  expect(desktop.background).toBe('rgba(0, 0, 0, 0)');
  expect(desktop.cellWeight).toBeLessThan(14);
  expect(desktop.titleTransform).toBe('uppercase');
  // muted 标签：与卡片标题的 --fwe-ink 明显不同
  expect(desktop.titleColor).toBe('rgb(105, 103, 109)');
  expect(desktop.noticeSpan).toBe('1 / -1');
  expect(desktop.wideSpan).toBe('1 / -1');

  // 订阅表单行内：input 与 button 同一行，且都真的可见可用
  const form = strip.locator('form');
  await expect(form).toBeVisible();
  const inline = await form.evaluate((node) => {
    const input = node.querySelector('input[type="email"]');
    const button = node.querySelector('button[type="submit"]');
    if (!input || !button) return null;
    const inputRect = input.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      display: getComputedStyle(node).display,
      sameRow: Math.abs(inputRect.top - buttonRect.top) < 2,
      inputWidth: inputRect.width,
      buttonWidth: buttonRect.width,
    };
  });
  expect(inline?.display).toBe('flex');
  expect(inline?.sameRow).toBe(true);
  expect(inline?.inputWidth ?? 0).toBeGreaterThan(40);
  expect(inline?.buttonWidth ?? 0).toBeGreaterThan(20);

  /*
   * 列数断点按「一格还够不够用」算过：一格要同时容纳 input（≥80px）和 nowrap
   * 的 Subscribe 按钮（≈89px），加 0.4rem 间距约 175px，再算上 1.75rem 列间距
   * 与页面两侧 clamp(2rem, 5vw, 5rem) 留白 → 四列从 ≈826px 起够用、两列从
   * ≈410px 起够用；实现取 54rem / 26rem 各留余量。断点是包含边界
   * （max-width 含等于），所以这里 straddle 864/863 与 416/415。
   */
  for (const [width, expected] of [
    [1440, 4],
    [1000, 4],
    [864, 2],
    [863, 2],
    [700, 2],
    [417, 2],
    [416, 1],
    [390, 1],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    const columns = await strip.evaluate(
      (node) => getComputedStyle(node).gridTemplateColumns.split(' ').length,
    );
    expect(columns, `${width}px 下 strip 列数`).toBe(expected);
    // 每一档都不许横向溢出
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${width}px 下横向溢出`).toBeLessThanOrEqual(1);
  }
});

test('加载下一页时先用骨架卡占位，落地后不留布局抖动', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  /*
   * 第 2 页由路由提供，延后响应好让加载中的 DOM 有被观测到的机会。
   *
   * 延迟必须明显大于测试自身的开销：sentinel 在第 1 屏内就已可见，请求在
   * goto 时就已经发出，而下面「等 2 张真实卡 → 滚动 sentinel」这两步在并行
   * 跑满、整机吃紧时轻易超过 600ms——窗口一关，骨架已经被真实卡替换，
   * toHaveCount(2) 只会拿到 0。2500ms 让窗口始终覆盖观测段。
   */
  await page.route('**/page/2/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html><body><div id="content" class="site-content">${page2Content}</div></body></html>`,
    });
  });

  await page.goto('./?page=paged');
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(2);

  const sentinel = page.locator('.fwe-infinite-sentinel');
  await sentinel.scrollIntoViewIfNeeded();

  // 骨架张数 = 当前列数（1440px → 2 列）
  const skeletonCards = page.locator('.fwe-skeleton-card');
  await expect(skeletonCards).toHaveCount(2);
  // 骨架本身就是进度指示，不再额外放转圈
  await expect(page.locator('.fwe-infinite-loader__spinner')).toHaveCount(0);
  // sentinel 里仍保留一行小字
  await expect(page.locator('.fwe-skeleton__label')).toBeVisible();

  /*
   * 两个高度必须在同一次 evaluate 里量。真实卡（第 1 页）和骨架在加载窗口内
   * 并存，但拆成两次 evaluate 时，第二次可能已经落在 600ms 的路由延迟之后、
   * 骨架已被替换——并行跑满时整机会因此 flake。一次 evaluate 保证量到的是同
   * 一刻的快照，同时也正面证明了「加载中真实卡仍在流里」。
   */
  const heights = await page.evaluate(() => {
    const real = document.querySelector('.fwe-stream > article.hentry');
    const skeleton = document.querySelector('.fwe-skeleton-card');
    return {
      real: real ? real.getBoundingClientRect().height : 0,
      skeleton: skeleton ? skeleton.getBoundingClientRect().height : 0,
    };
  });

  // 骨架必须预留与真实卡同量级的占用高度，否则内容落地时下方内容会跳
  expect(heights.skeleton).toBeGreaterThan(heights.real * 0.5);
  expect(heights.skeleton).toBeLessThan(heights.real * 2);

  // 内容落地后骨架消失，新卡入流
  await expect(page.locator('.fwe-skeleton')).toHaveCount(0);
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(4);
});

test('每加载一页就用 replaceState 同步 URL，且不往浏览器历史里塞条目', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  /*
   * M2 第一阶段只做 replaceState。这一条只能在真实浏览器里验：jsdom 的
   * history 是桩，unit 测试证明不了「地址栏真的变了」。
   *
   * 回放要延后：sentinel 在第 1 屏内就可见，请求在 goto 当时就发出，不延迟的话
   * 等下面断言「初始 2 张卡」时第 2 页早已落地，拿到的是 4 张。
   */
  await page.route('**/page/2/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html><body><div id="content" class="site-content">${page2Content}</div></body></html>`,
    });
  });

  await page.goto('./?page=paged');
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(2);

  const historyBefore = await page.evaluate(() => window.history.length);
  const sentinel = page.locator('.fwe-infinite-sentinel');
  await sentinel.scrollIntoViewIfNeeded();
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(4);

  /*
   * URL 由 WordPress 分页链接直接给出，形如 /page/2/，不用自己拼。注意这里
   * 断言的是「落在 /page/2/」而不是「带 ?page=paged」——后者只是 e2e fixture
   * 选择视图用的查询参数，真实站点上分页链接就是 /page/N/。
   */
  await expect.poll(() => new URL(page.url()).pathname).toBe('/page/2/');

  // replaceState 不增历史长度；pushState 会，用户按后退就会在我们的条目里打转
  const historyAfter = await page.evaluate(() => window.history.length);
  expect(historyAfter).toBe(historyBefore);

  // 分页导航跟着推进到第 3 页，说明 URL 与内容是同一个来源
  await expect(
    page.locator('#content .nav-links a.next, #content .paging-navigation a.next'),
  ).toHaveAttribute('href', '/page/3/');

  /*
   * 刷新后落在同一进度这件事由 unit 测试覆盖（`silently catches up to the
   * remembered page count after a reload`）：真实刷新要 fixture 服务器真的能
   * 服务 /page/2/，而 dev server 的根目录下没有 index.html 可回退，这里断言
   * 只会变成一个关于 vite SPA fallback 的测试，与 M2 无关。
   */
});

test('第 2 页 503 时哨兵给出 HTTP 文案与可点重试，点一下真的再抓一次', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  /*
   * M3 第二级（!response.ok）。这一条值得放在真实浏览器里：重试按钮的点击
   * 要重新走一遍 loadNextPage()，包括 loadingNextPage 闩锁的复位——unit 测试
   * 里的 fetch 是普通函数调用，证不了「点下去浏览器真的发出了第二个请求」。
   *
   * 第一次 503，之后放行。用计数器而不是 fulf 一次的 handler：重试可能不止
   * 发一次（IntersectionObserver 的 rootMargin 会在按钮附近反复触发）。
   */
  let attempts = 0;
  await page.route('**/page/2/**', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' });
      return;
    }
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html><body><div id="content" class="site-content">${page2Content}</div></body></html>`,
    });
  });

  await page.goto('./?page=paged');
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(2);

  const sentinel = page.locator('.fwe-infinite-sentinel');
  await sentinel.scrollIntoViewIfNeeded();

  /*
   * 失败文案必须带上状态码：用户截图报障时「HTTP 503」比「加载失败」有用得多。
   * 按钮文本就是文案本身——M3 把三档收敛成了「文案 + 有无按钮」的组合。
   */
  const retry = page.locator('.fwe-infinite-sentinel button.fwe-infinite-loader');
  await expect(retry).toBeVisible();
  await expect(retry).toHaveText(/HTTP 503/);
  // 失败时文章数不变，不许把 503 的半截响应渲染进去
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(2);

  // 一键重试：点下去之后第 2 页落地
  await retry.click();
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(4);
  await expect(page.locator('.fwe-infinite-sentinel button.fwe-infinite-loader')).toHaveCount(0);

  // 真的重发了请求，而不是拿缓存或本地状态糊过去
  expect(attempts).toBeGreaterThanOrEqual(2);
});

test('关掉自动加载后哨兵端出「加载更多」按钮，原分页导航同时可见可用', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  /*
   * M4：关掉自动加载不等于撤掉退路。哨兵以前被 display:none 掉，用户只剩翻原站
   * 分页这一条路；现在它端出一枚「加载更多」按钮，点的还是同一个 loadNextPage()。
   *
   * 这一条必须在真实浏览器里验：unit 测试点的是 `button.click()`，证不了按钮在
   * 真实布局里真的看得见、点得中，也证不了被 `fwe-source-hidden` 藏起来的原分页
   * 导航是否真的回到了画面上。
   */
  /*
   * 用请求计数器而不是「延迟 N 毫秒」来决定第 2 页何时落地。
   *
   * 曾经这里写的是固定延迟 1200ms，而那是个竞态：sentinel 在第 1 屏内就可见，
   * 请求在 goto 当时就发出，setup 若超过 1200ms（并行跑 4 个 worker、还有截图
   * 比对在抢 CPU），第 2 页就在断言「初始 2 张卡」之前自己落地了——测试时红时绿。
   *
   * 现在第一次请求（goto 期间观察器发的）直接回 503：它秒回、不插任何卡片，
   * 「此刻仍是 2 张卡」因此是确定的；同时哨兵上留下一条 HTTP 503 失败文案，
   * 正好把下面「关掉开关后陈旧文案必须被换掉」这条也一起验了。第二次请求
   * （点按钮发的）才服务第 2 页内容。
   */
  let attempts = 0;
  await page.route('**/page/2/**', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'text/plain',
        body: 'Service Unavailable',
      });
      return;
    }
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html><body><div id="content" class="site-content">${page2Content}</div></body></html>`,
    });
  });

  await page.goto('./?page=paged');
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(2);

  /*
   * 第一次请求已经失败过了：此刻哨兵上留着的是 M3 的失败文案与重试按钮，
   * 而卡片数没变——503 的半截响应不许被渲染进去。
   */
  await expect(page.locator('.fwe-infinite-sentinel button.fwe-infinite-loader')).toHaveText(
    /HTTP 503/,
  );
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(2);

  // 关掉「无限滚动」开关（控制菜单里第三枚 switch）
  await page.locator('.fwe-view-control__trigger').click();
  const infiniteSwitch = page.locator('.fwe-switch').nth(2);
  await infiniteSwitch.click();
  await expect(infiniteSwitch).toHaveAttribute('aria-checked', 'false');

  const sentinel = page.locator('#content > .fwe-infinite-sentinel');
  // 哨兵本身没被藏起来
  await expect(sentinel).toBeVisible();

  const loadMore = sentinel.locator('button.fwe-infinite-loader');
  await expect(loadMore).toBeVisible();
  /*
   * 关键：上一轮失败留下的「HTTP 503」必须被换成「加载更多」。按钮还是同一枚、
   * 还是同一个 loadNextPage()，但语义从「重试上次失败」变成了「再要一页」——
   * 留着旧状态码会让用户拿着过期的信息去报障。
   */
  await expect(loadMore).toHaveText(/加载更多|Load more/);
  await expect(loadMore).not.toHaveText(/HTTP 503/);

  /*
   * 原分页导航就是 research 要的那条 pagination 退路。这里断言的是「计算样式不
   * 是 display:none」而不只是 class 不在——`fwe-source-hidden` 是个 class，真正
   * 把它变成看不见的是那条 CSS 规则。
   */
  const nav = page.locator('#content > .navigation, #content > .paging-navigation');
  await expect(nav).toBeVisible();
  const navDisplay = await nav.evaluate((node) => getComputedStyle(node).display);
  expect(navDisplay).not.toBe('none');
  await expect(nav.locator('a.next')).toBeVisible();

  /*
   * 关着的时候不许自己去抓。除了卡片数不变，再钉一下请求数：从 goto 到现在只
   * 发过那一次（已经失败掉的），没有第二个请求悄悄溜出去。
   */
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(2);
  expect(attempts).toBe(1);

  // 点「加载更多」：第 2 页落地，按钮继续摆着（常驻退路）
  await loadMore.click();
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(4);
  await expect(sentinel.locator('button.fwe-infinite-loader')).toBeVisible();

  // 导航内容跟着推进到第 3 页，且仍可见可用
  await expect(nav.locator('a.next')).toHaveAttribute('href', '/page/3/');
  await expect(nav.locator('a.next')).toBeVisible();
});

test('哨兵是暴露给读屏软件的状态区，加载中各状态都有文字播报', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  /*
   * M5。这一条只能在真实浏览器里验：jsdom 里 `role` / `aria-live` 只是两个
   * 属性字符串，证不了它们真的被映射进了无障碍树。Playwright 的
   * `getByRole('status')` 走的是 ARIA 语义匹配，找不到就说明这个 live region
   * 对读屏软件并不存在——那 M5 就白做了。
   */
  await page.route('**/page/2/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html><body><div id="content" class="site-content">${page2Content}</div></body></html>`,
    });
  });

  await page.goto('./?page=paged');
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(2);

  const status = page.getByRole('status');
  await expect(status).toHaveCount(1);
  // `role="status"` 隐含 polite，两个都显式写上；这里连属性一起钉住
  await expect(status).toHaveAttribute('aria-live', 'polite');

  const sentinel = page.locator('.fwe-infinite-sentinel');
  await sentinel.scrollIntoViewIfNeeded();

  // 加载中：骨架自带一行小字，它就是播报文本
  await expect(status).toHaveText(/Loading more repacks/i);

  // 落地后播报「加载了第几页」——没有这段，内容悄悄变了，读屏用户只会以为卡住
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(4);
  await expect(status).toHaveText(/Loaded page 2/i);
});

test('390px 下覆盖主题 list-view 的 .entry-content 隐藏规则，卡片与 Upcoming 区块完整可见', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-fwe-mode', 'enhanced');

  // 复刻的主题规则必须在 390px 真实命中卡片内容容器，否则本测试将失去意义
  const control = await page.evaluate(() => {
    const entry = document.querySelector('.fwe-stream .fwe-game-card .entry-content');
    const style = document.getElementById('fwe-theme-list-view');
    const flatten = (list: CSSRuleList): CSSStyleRule[] =>
      [...list].flatMap((rule) => {
        // 新版 Chrome 的 CSSStyleRule 也带有空的 cssRules，必须先判 selectorText
        const selectorText = (rule as CSSStyleRule).selectorText;
        if (selectorText) return [rule as CSSStyleRule];
        const group = rule as CSSGroupingRule;
        return group.cssRules ? flatten(group.cssRules) : [];
      });
    const rules =
      style instanceof HTMLStyleElement && style.sheet ? flatten(style.sheet.cssRules) : [];
    const hiding = rules.some((styleRule) => {
      const firstSelector = styleRule.selectorText?.split(',')[0]?.trim();
      return Boolean(
        firstSelector &&
        firstSelector.includes('.type-post .entry-content') &&
        styleRule.style.display === 'none' &&
        entry?.matches(firstSelector),
      );
    });
    return {
      listView: document.body.classList.contains('list-view'),
      hiding,
      display: entry ? getComputedStyle(entry).display : null,
    };
  });
  expect(control.listView).toBe(true);
  expect(control.hiding).toBe(true);
  // 增强模式以自己的 !important 规则恢复显示，而不是被主题藏掉
  expect(control.display).not.toBe('none');

  // 卡片主体（封面/规格/截图/操作按钮）必须真实占位
  const layoutHeight = await page
    .locator('.fwe-stream .fwe-game-card .fwe-game-layout')
    .first()
    .evaluate((node) => node.getBoundingClientRect().height);
  expect(layoutHeight).toBeGreaterThan(50);
  await expect(page.locator('.fwe-stream .fwe-game-card .fwe-card-actions').first()).toBeVisible();
  await expect(page.locator('.fwe-stream .fwe-game-card .fwe-summary-panel').first()).toBeVisible();

  // Upcoming 区块不能塌成空白卡片：summary 行必须可见且带文字
  const upcoming = page.locator('.fwe-upcoming');
  await expect(upcoming).toBeVisible();
  const summary = upcoming.locator('.fwe-upcoming__summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Upcoming Repacks');
  const summaryHeight = await summary.evaluate((node) => node.getBoundingClientRect().height);
  expect(summaryHeight).toBeGreaterThan(20);
  await expect(upcoming.locator('.fwe-upcoming__details-link')).toBeVisible();
});

test('详情页保留上一篇/下一篇导航，且元信息胶囊随卡片保留', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?page=single');
  const nav = page.locator('#content > .post-navigation');
  await expect(nav).toBeVisible();
  await expect(nav.locator('a[rel="prev"]')).toBeVisible();
  await expect(nav.locator('a[rel="next"]')).toBeVisible();
  await expect(nav.locator('.meta-nav').first()).toHaveText('Previous Post');
  await expect(nav.locator('.meta-nav').last()).toHaveText('Next Post');

  const detail = page.locator('.fwe-detail');
  await expect(detail.locator('.fwe-article-meta .fwe-meta-chip')).toHaveCount(4);
  const titleWidth = await detail
    .locator('.entry-title')
    .evaluate((node) => node.getBoundingClientRect().width);
  expect(titleWidth).toBeGreaterThan(150);

  await page.locator('.fwe-view-control__trigger').click();
  const infiniteSwitch = page.locator('.fwe-switch').nth(2);
  await infiniteSwitch.click();
  await expect(infiniteSwitch).toHaveAttribute('aria-checked', 'false');
  await infiniteSwitch.click();
  await expect(infiniteSwitch).toHaveAttribute('aria-checked', 'true');
  await expect(nav).toBeVisible();
});

test('切换回原站模式后完整恢复侧栏、页脚与原始元信息', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await page.locator('.fwe-view-control__trigger').click();
  const toggle = page.getByRole('switch', { name: 'Toggle enhanced grid layout' });
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-fwe-mode', 'original');
  await expect(page.locator('.fwe-site-extras')).toHaveCount(0);
  await expect(page.locator('#secondary .site-description')).toBeVisible();
  await expect(page.locator('#primary-sidebar .widget-title').first()).toBeVisible();
  await expect(page.locator('#block-6 .widgettitle')).toBeVisible();
  await expect(page.locator('article.hentry .entry-meta .comments-link a').first()).toBeVisible();
});

test('暗色模式三段切换，整页令牌翻面且文字保持可读', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-fwe-theme', 'system');

  // 默认跟随系统：playwright 的 colorScheme 是 light，所以此刻是亮色令牌
  const lightCard = await page
    .locator('.fwe-stream .fwe-game-card')
    .first()
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(lightCard).toBe('rgb(255, 253, 249)');

  await page.locator('.fwe-view-control__trigger').click();
  const darkButton = page.locator('.fwe-segmented--theme .fwe-segmented__btn[data-theme="dark"]');
  await darkButton.click();

  await expect(page.locator('html')).toHaveAttribute('data-fwe-theme', 'dark');
  await expect(darkButton).toHaveAttribute('aria-pressed', 'true');

  // 整页翻面：卡片、正文文字与 UA 的 color-scheme 一起换
  const palette = await page.evaluate(() => {
    const card = document.querySelector('.fwe-stream .fwe-game-card');
    const root = getComputedStyle(document.documentElement);
    return {
      cardBackground: card ? getComputedStyle(card).backgroundColor : '',
      bodyColor: getComputedStyle(document.body).color,
      paper: root.getPropertyValue('--fwe-paper').trim(),
      colorScheme: root.colorScheme,
    };
  });
  expect(palette.cardBackground).toBe('rgb(30, 29, 35)');
  expect(palette.bodyColor).toBe('rgb(233, 229, 222)');
  expect(palette.paper).toBe('#131317');
  expect(palette.colorScheme).toBe('dark');

  // 主题自身写死的白底必须被中和掉，否则暗色下是一块白板
  const entryContentBackground = await page
    .locator('.fwe-stream .fwe-game-card .entry-content')
    .first()
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(entryContentBackground).toBe('rgba(0, 0, 0, 0)');

  // 偏好跨刷新保留
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-fwe-theme', 'dark');

  // 回到系统态：系统是亮色，令牌随之回到亮色
  await page.locator('.fwe-view-control__trigger').click();
  await page.locator('.fwe-segmented--theme .fwe-segmented__btn[data-theme="system"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-fwe-theme', 'system');
  const systemPaper = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--fwe-paper').trim(),
  );
  expect(systemPaper).toBe('#f5f3ef');
});

test('桌面和移动视觉快照', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await expect(page.locator('.fwe-rating-badge')).toHaveCount(2);
  await expect(page).toHaveScreenshot('listing-desktop.png', { fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  /*
   * 徽章是懒加载的：容器进入首屏 + 300px rootMargin 才去取分，所以这里的全局
   * 计数实际断言的是「这次布局能塞进多少个卡头」。T7 把列表媒体默认折起来后，
   * 第二张卡也进了触发窗口（卡头 848px < 844 + 300），旧的 toHaveCount(1) 就
   * 变成了对卡片高度的断言。只钉第一张卡（永远在首屏）确实拿到徽章；两张卡都
   * 会取分这件事由上面的桌面 toHaveCount(2) 覆盖。
   */
  await expect(page.locator('.fwe-game-card').first().locator('.fwe-rating-badge')).toHaveCount(1);
  await expect(page).toHaveScreenshot('listing-mobile.png', { fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./?page=single');
  await expect(page.locator('.fwe-detail .fwe-rating-badge')).toHaveCount(1);
  await expect(page).toHaveScreenshot('detail-desktop.png', { fullPage: true });
});

test('暗色桌面视觉快照', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    window.localStorage.setItem('fitgirl-web-enhanced:v1:theme', 'dark');
  });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-fwe-theme', 'dark');
  await expect(page.locator('.fwe-rating-badge')).toHaveCount(2);
  await expect(page).toHaveScreenshot('listing-dark-desktop.png', { fullPage: true });
  await page.goto('./?page=single');
  await expect(page.locator('.fwe-detail .fwe-rating-badge')).toHaveCount(1);
  await expect(page).toHaveScreenshot('detail-dark-desktop.png', { fullPage: true });
});

test('详情页评分只在头部徽章一个槽位，弹层可点开可 Esc 关', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./?page=single');
  await expect(page.locator('.fwe-detail .fwe-fact--rating')).toHaveCount(0);
  const badge = page.locator('.fwe-detail .fwe-rating-badge[aria-expanded]').first();
  await badge.click();
  const popover = page.locator('.fwe-rating-popover');
  await expect(popover).toBeVisible();
  await expect(popover.locator('.fwe-rating-popover__btn').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
});

test('翻页后调插件补齐新卡的评论计数', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  /*
   * 第 2 页由路由回放：vite fixture 服务器没有 /page/2/ 这个文件，
   * 不拦路由的话 fetch 只会拿到 404，插入数为 0，根本走不到补齐分支。
   *
   * 延迟是这条测试的骨架，不是润滑剂。paged 首屏只有两张卡，哨兵在
   * 1000px 高的视口里一开始就可见，IntersectionObserver 在 goto 时就已经
   * 触发过一次 loadNextPage()。不延迟的话第 2 页会在「清空 span」之前落地，
   * 那时四个 span 都带着服务端渲染的计数，refill 的 emptyCount 判到 0 直接
   * 早退——update() 一次都不会被调，断言永远停在 0。2500ms 让加载窗口稳定
   * 覆盖观测段（与上面骨架屏那条同一个量级，整机吃紧时也不会漏）。
   */
  await page.route('**/page/2/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html><body><div id="content" class="site-content">${page2Content}</div></body></html>`,
    });
  });

  /*
   * 在页面脚本执行之前就把插件桩挂到 window 上，保证 Tolstoy 插件对象在
   * refillThirdPartyCommentCounts() 运行时始终可达；catch 分支确保插件
   * 返回的 rejected promise 不会泄漏为 unhandled rejection。
   */
  await page.addInitScript(() => {
    const w = window as unknown as { __tcCalls?: number; tolstoycomments?: unknown };
    w.__tcCalls = 0;
    w.tolstoycomments = {
      comment: {
        update: async () => {
          w.__tcCalls = (w.__tcCalls ?? 0) + 1;
          document.querySelectorAll<HTMLElement>('.tolstoycomments-cc').forEach((span) => {
            span.innerHTML = '<i class="fa fa-comment"></i> 42 comments';
          });
        },
      },
    };
  });

  await page.goto('./?page=paged');

  // 首屏两张卡，第 2 页还在路由延迟里没回来
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(2);

  // 把服务端渲染的计数清空，模拟线上首屏之后的状态；此时第 2 页尚未落地，
  // 清空后的空 span 就是 refill 要补的那批。
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('.tolstoycomments-cc').forEach((span) => {
      span.textContent = '';
    });
  });

  // 哨兵本就在视口里，无需滚动；等第 2 页两张卡落地即可
  await expect(page.locator('.fwe-stream > article.hentry')).toHaveCount(4, { timeout: 20000 });

  // 第 2 页落地后：update() 正好被调一次，且所有计数都被填上
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __tcCalls?: number }).__tcCalls ?? 0))
    .toBe(1);
  const counts = await page
    .locator('.tolstoycomments-cc')
    .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()));
  expect(counts).toHaveLength(4);
  expect(counts.every((text) => text.includes('42 comments'))).toBe(true);
});

test('详情页 extras 排在评论区之前，原站模式完整恢复', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./?page=single');

  // 脚本在 document-idle 才插入 extras；顺序快照必须等它落地，否则读到的是
  // 插入前的 #content，断言会偶发扑空（实测出现过一次 extrasIndex === -1）。
  await expect(page.locator('.fwe-site-extras')).toHaveCount(1);
  const order = await page.evaluate(() => {
    const content = document.querySelector('#content');
    return [...(content?.children ?? [])].map((node) => node.className || node.tagName);
  });
  const extrasIndex = order.findIndex((name) => String(name).includes('fwe-site-extras'));
  const commentsIndex = order.findIndex(
    (name) =>
      String(name).includes('tolstoycomments-feed') || String(name).includes('data-source-theme'),
  );
  expect(extrasIndex).toBeGreaterThanOrEqual(0);
  expect(commentsIndex).toBeGreaterThan(extrasIndex);

  // 顺序对不代表看得见：`#content > :not(...)` 的白名单漏掉 extras 时，
  // 它会带着 display:none 正确排在评论区之前。可见性与真实高度必须一起断言。
  const extrasLocator = page.locator('.fwe-site-extras');
  await expect(extrasLocator).toBeVisible();
  expect(
    await extrasLocator.evaluate((node) => node.getBoundingClientRect().height),
  ).toBeGreaterThan(100);

  await page.locator('.fwe-view-control__trigger').click();
  await page.getByRole('switch', { name: 'Toggle enhanced grid layout' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-fwe-mode', 'original');
  await expect(page.locator('.fwe-site-extras')).toHaveCount(0);
});
