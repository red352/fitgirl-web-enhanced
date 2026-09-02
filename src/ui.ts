import { createIcon } from './icons';
import {
  detectPageKind,
  DomTransaction,
  extractFacts,
  parseArchiveGroups,
  parseArticle,
  parseNavigation,
  parsePopularItems,
  parseUpcomingItems,
} from './dom';
import {
  getFastStoredLayoutMode,
  getFastStoredMediaExpand,
  readStoredLayoutMode,
  readStoredMediaExpand,
  writeStoredLayoutMode,
  writeStoredMediaExpand,
} from './preferences';
import type {
  ArchiveGroup,
  ArticleSection,
  LayoutMode,
  NavigationItem,
  ParsedArticle,
  PopularItem,
  SectionKind,
} from './types';

const DISCLOSURE_LABELS: Record<Exclude<SectionKind, 'screenshots'>, string> = {
  downloads: 'Download Mirrors',
  features: 'Repack Features',
  description: 'Game Description',
};

const FACT_ICONS = {
  'Genres/Tags': 'tag',
  Company: 'building',
  Languages: 'language',
  'Original Size': 'drive',
  'Repack Size': 'download',
} as const;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function copyLinkAttributes(source: HTMLAnchorElement, target: HTMLAnchorElement): void {
  target.href = source.href;
  for (const name of ['target', 'rel', 'title']) {
    const value = source.getAttribute(name);
    if (value !== null) target.setAttribute(name, value);
  }
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function createDisclosure(
  kind: Exclude<SectionKind, 'screenshots'>,
  sections: ArticleSection[],
  transaction: DomTransaction,
): HTMLDetailsElement {
  const details = element('details', `fwe-disclosure fwe-disclosure--${kind}`);
  const summary = element('summary', 'fwe-disclosure__summary');
  summary.append(
    createIcon(kind === 'downloads' ? 'download' : kind),
    element('span', 'fwe-disclosure__label', DISCLOSURE_LABELS[kind]),
    createIcon('chevron', 'fwe-disclosure__chevron'),
  );
  const body = element('div', 'fwe-disclosure__content');
  details.append(summary, body);

  for (const section of sections) {
    for (const node of section.nodes) {
      transaction.move(node, body);
      if (kind === 'description') {
        const content = node.querySelector<HTMLElement>(':scope > .su-spoiler-content');
        if (content) {
          transaction.addClass(node, 'fwe-description-shell');
          transaction.move(content, body);
        }
      }
    }
  }
  return details;
}

function createFacts(article: ParsedArticle): HTMLElement {
  const list = element('dl', 'fwe-facts');
  for (const fact of extractFacts(article.infoBlock)) {
    const item = element('div', 'fwe-fact');
    const term = element('dt', 'fwe-fact__label');
    term.append(createIcon(FACT_ICONS[fact.label]), document.createTextNode(fact.label));
    const description = element('dd', 'fwe-fact__value');
    if (fact.links.length > 0) {
      fact.links.forEach((link, index) => {
        if (index > 0) description.append(document.createTextNode(', '));
        const anchor = element('a');
        anchor.href = link.href;
        anchor.textContent = link.text;
        description.append(anchor);
      });
    } else description.textContent = fact.value;
    item.append(term, description);
    list.append(item);
  }
  return list;
}

function createSearchMeta(article: ParsedArticle): HTMLElement | null {
  const text = `${article.repackHeading?.textContent ?? ''} ${article.infoBlock?.textContent ?? ''}`;
  const labels = [text.match(/#\d+/)?.[0], /\bupdated\b/i.test(text) ? 'Updated' : null].filter(
    (item): item is string => Boolean(item),
  );
  if (labels.length === 0) return null;
  const meta = element('div', 'fwe-search-meta');
  labels.forEach((label) => meta.append(element('span', 'fwe-search-meta__item', label)));
  return meta;
}

function createSummaryPanel(article: ParsedArticle): HTMLElement {
  const panel = element('section', 'fwe-summary-panel');
  panel.setAttribute('aria-label', '游戏基本信息');
  const isSearchResult = document.body.classList.contains('search-results');
  if (article.cover) {
    const cover = article.cover.cloneNode(true) as HTMLImageElement;
    cover.className = 'fwe-cover';
    cover.loading = article.pageKind === 'single' ? 'eager' : 'lazy';
    cover.decoding = 'async';
    panel.append(cover);
  } else if (!isSearchResult) {
    const placeholder = element('div', 'fwe-cover fwe-cover--placeholder', 'No cover');
    placeholder.setAttribute('aria-hidden', 'true');
    panel.append(placeholder);
  }
  const meta = isSearchResult ? createSearchMeta(article) : null;
  if (meta) panel.append(meta);
  const facts = createFacts(article);
  if (facts.childElementCount > 0) panel.append(facts);
  else if (isSearchResult) {
    const sourceText = (article.entry?.textContent ?? '').replace(/\s+/g, ' ').trim();
    panel.append(element('p', 'fwe-search-excerpt', sourceText.slice(0, 520)));
  }
  return panel;
}

function prepareMedia(
  article: ParsedArticle,
  transaction: DomTransaction,
  mediaExpanded: boolean = true,
): HTMLDetailsElement | null {
  const screenshots = article.sections.get('screenshots');
  if (!screenshots || article.media.length === 0) return null;
  const media = element('details', 'fwe-media');
  media.open = mediaExpanded;
  media.setAttribute('aria-label', 'Screenshots and gameplay preview');
  const summary = element('summary', 'fwe-media__summary');
  summary.append(
    createIcon('description'),
    element('span', 'fwe-media__label', 'Screenshots & Gameplay'),
    element('span', 'fwe-media__count', String(article.media.length)),
    createIcon('chevron', 'fwe-media__chevron'),
  );
  const gallery = element('div', 'fwe-media__gallery');
  const source = element('div', 'fwe-media__source');
  media.append(summary, gallery, source);

  screenshots.nodes.forEach((node) => transaction.move(node, source));
  const ordered = [
    ...article.media.filter((item) => item.image),
    ...article.media.filter((item) => item.video),
  ];
  ordered.forEach((item, index) => {
    transaction.move(item.element, gallery);
    transaction.addClass(item.element, 'fwe-media__item');
    transaction.setAttribute(item.element, 'data-fwe-media-index', String(index + 1));
    if (item.image) {
      transaction.setAttribute(
        item.image,
        'loading',
        article.pageKind === 'single' && index < 2 ? 'eager' : 'lazy',
      );
      transaction.setAttribute(item.image, 'decoding', 'async');
    }
    if (item.video) {
      transaction.setAttribute(item.video, 'autoplay', null);
      transaction.setAttribute(item.video, 'preload', 'metadata');
      transaction.setAttribute(item.video, 'playsinline', '');
      transaction.addClass(item.video, 'fwe-observed-video');
    }
  });
  return media;
}

function addArticleMeta(article: ParsedArticle, transaction: DomTransaction): void {
  const header = article.header;
  if (!header || header.querySelector('.fwe-article-meta')) return;
  const originalDate = header.querySelector<HTMLElement>('.entry-date, time');
  if (!originalDate) return;
  const meta = element('div', 'fwe-article-meta');
  meta.append(createIcon('calendar'), document.createTextNode(originalDate.textContent ?? ''));
  transaction.insert(meta, header);
}

function hideSearchSource(article: ParsedArticle, transaction: DomTransaction): void {
  const entry = article.entry;
  if (!entry) return;
  const source = element('div', 'fwe-search-source fwe-source-hidden');
  transaction.insert(source, entry, entry.firstChild);
  [...entry.childNodes]
    .filter((node) => node !== source)
    .forEach((node) => transaction.move(node, source));
}

function transformGame(
  article: ParsedArticle,
  transaction: DomTransaction,
  mediaExpanded: boolean = true,
): void {
  if (!article.entry || article.root.hasAttribute('data-fwe-ready')) return;
  transaction.setAttribute(article.root, 'data-fwe-ready', 'true');
  transaction.addClass(
    article.root,
    article.pageKind === 'single' ? 'fwe-detail' : 'fwe-game-card',
  );
  const isSearch = document.body.classList.contains('search-results');
  if (isSearch) transaction.addClass(article.root, 'fwe-search-card');
  addArticleMeta(article, transaction);
  if (isSearch) hideSearchSource(article, transaction);
  else {
    if (article.infoBlock) transaction.addClass(article.infoBlock, 'fwe-source-hidden');
    if (article.repackHeading) transaction.addClass(article.repackHeading, 'fwe-source-hidden');
  }

  const layout = element('div', 'fwe-game-layout');
  layout.append(createSummaryPanel(article));
  const media = prepareMedia(article, transaction, mediaExpanded);
  if (media) layout.append(media);
  transaction.insert(layout, article.entry, article.entry.firstChild);

  const disclosures = element('div', 'fwe-disclosures');
  const downloads = article.sections.get('downloads');
  const features = article.sections.get('features');
  const description = article.sections.get('description');
  if (downloads) disclosures.append(createDisclosure('downloads', [downloads], transaction));
  if (features) disclosures.append(createDisclosure('features', [features], transaction));
  if (description) disclosures.append(createDisclosure('description', [description], transaction));
  if (disclosures.childElementCount > 0) transaction.insert(disclosures, article.entry);
}

function transformUpcoming(article: ParsedArticle, transaction: DomTransaction): void {
  if (!article.entry || article.root.hasAttribute('data-fwe-ready')) return;
  transaction.setAttribute(article.root, 'data-fwe-ready', 'true');
  transaction.addClass(article.root, 'fwe-upcoming');
  const items = parseUpcomingItems(article.entry);
  const details = element('details', 'fwe-upcoming__details');
  const summary = element('summary', 'fwe-upcoming__summary');
  summary.append(
    element('span', 'fwe-upcoming__eyebrow', 'Upcoming Repacks'),
    createIcon('chevron'),
  );
  const body = element('div', 'fwe-upcoming__body');
  items.forEach((item, index) => {
    if (index > 0) body.append(element('span', 'fwe-upcoming__separator', '→'));
    const link = element('a');
    link.textContent = item.text;
    if (item.href) {
      link.href = item.href;
    } else {
      link.href = `/?s=${encodeURIComponent(item.text)}`;
    }
    body.append(link);
  });
  const source = element('div', 'fwe-upcoming__source');
  details.append(summary, body, source);
  transaction.insert(details, article.entry, article.entry.firstChild);
  [...article.entry.childNodes]
    .filter((child) => child !== details)
    .forEach((child) => transaction.move(child, source));
  const media = window.matchMedia('(min-width: 48rem)');
  const sync = (): void => {
    details.open = media.matches;
  };
  sync();
  media.addEventListener('change', sync);
  transaction.onRestore(() => media.removeEventListener('change', sync));
}

function transformLegacySpoilers(article: ParsedArticle, transaction: DomTransaction): void {
  article.entry?.querySelectorAll<HTMLElement>('.su-spoiler').forEach((spoiler) => {
    const title = (spoiler.querySelector('.su-spoiler-title')?.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    const content = spoiler.querySelector<HTMLElement>('.su-spoiler-content');
    const parent = spoiler.parentNode;
    if (!title || !content || !parent) return;
    const details = element('details', 'fwe-inline-disclosure');
    const summary = element('summary', 'fwe-inline-disclosure__summary');
    summary.append(element('span', '', title), createIcon('chevron'));
    const body = element('div', 'fwe-inline-disclosure__content');
    details.append(summary, body);
    transaction.insert(details, parent, spoiler);
    transaction.move(content, body);
    transaction.addClass(spoiler, 'fwe-source-hidden');
  });
}

function createSearchFallback(article: ParsedArticle, transaction: DomTransaction): void {
  if (!article.entry) return;
  const text = (article.entry.textContent ?? '').replace(/\s+/g, ' ').trim();
  const panel = element('div', 'fwe-search-fallback');
  panel.append(element('p', '', text.slice(0, 620)));
  if (article.titleLink) {
    const link = element('a', 'fwe-search-fallback__link', 'View details');
    copyLinkAttributes(article.titleLink, link);
    panel.append(link);
  }
  transaction.addClass(article.entry, 'fwe-source-hidden');
  transaction.insert(panel, article.root, article.entry);
}

function preparePopularDirectory(article: ParsedArticle, transaction: DomTransaction): void {
  if (!article.entry) return;
  article.entry
    .querySelectorAll('style')
    .forEach((style) => transaction.setAttribute(style, 'media', 'not all'));
  const widget = article.entry.querySelector<HTMLElement>('.jetpack_top_posts_widget');
  if (!widget) return;
  const links = [...widget.querySelectorAll<HTMLAnchorElement>('a[href]')].filter((link) =>
    Boolean(link.querySelector('img')),
  );
  if (links.length === 0) return;
  const heading = element('h2', 'fwe-directory-heading', 'Most Popular Repacks of the Month');
  const grid = element('div', 'fwe-directory-grid');
  transaction.insert(heading, article.entry, widget);
  transaction.insert(grid, article.entry, widget);
  links.forEach((link) => {
    const image = link.querySelector<HTMLImageElement>('img');
    const title = link.getAttribute('title')?.trim() || image?.alt.trim() || 'Popular repack';
    transaction.move(link, grid);
    transaction.addClass(link, 'fwe-directory-tile');
    if (image) {
      transaction.setAttribute(image, 'loading', 'lazy');
      transaction.setAttribute(image, 'decoding', 'async');
    }
    transaction.insert(element('span', 'fwe-directory-tile__title', title), link);
  });
  transaction.addClass(widget, 'fwe-source-hidden');
}

function transformSpecial(article: ParsedArticle, transaction: DomTransaction): void {
  transaction.setAttribute(article.root, 'data-fwe-ready', 'true');
  const title = article.title.toLowerCase();
  if (document.body.classList.contains('search-results')) {
    transaction.addClass(article.root, 'fwe-result-card');
    createSearchFallback(article, transaction);
    return;
  }
  transaction.addClass(article.root, 'fwe-special');
  if (
    article.root.classList.contains('category-updates-digest') ||
    title.startsWith('updates digest')
  ) {
    transaction.addClass(article.root, 'fwe-digest');
    transformLegacySpoilers(article, transaction);
  } else if (title === 'popular repacks') {
    transaction.addClass(article.root, 'fwe-directory-popular');
    preparePopularDirectory(article, transaction);
  } else if (/all my repacks.*a.?z/i.test(article.title))
    transaction.addClass(article.root, 'fwe-directory-az');
  else if (title === 'updates list') {
    transaction.addClass(article.root, 'fwe-directory-updates');
    transformLegacySpoilers(article, transaction);
  }
}

function createSearchForm(): HTMLFormElement {
  const form = element('form', 'fwe-search');
  form.method = 'get';
  form.action = `${window.location.origin}/`;
  form.setAttribute('role', 'search');
  const input = element('input', 'fwe-search__input');
  input.type = 'search';
  input.name = 's';
  input.placeholder = 'Search repacks…';
  input.setAttribute('aria-label', '搜索游戏与文章');
  input.value = new URLSearchParams(window.location.search).get('s') ?? '';
  const submit = element('button', 'fwe-search__submit');
  submit.type = 'submit';
  submit.setAttribute('aria-label', '提交搜索');
  submit.append(createIcon('search'));
  form.append(input, submit);
  return form;
}

function createPopularDialog(items: PopularItem[]): HTMLDialogElement {
  const dialog = element('dialog', 'fwe-popular-dialog');
  dialog.setAttribute('aria-labelledby', 'fwe-popular-title');
  const header = element('header', 'fwe-dialog__header');
  const heading = element('h2', '', 'Most Popular Repacks');
  heading.id = 'fwe-popular-title';
  const close = element('button', 'fwe-icon-button');
  close.type = 'button';
  close.setAttribute('aria-label', '关闭热门榜单');
  close.append(createIcon('close'));
  header.append(heading, close);
  const list = element('ol', 'fwe-popular-list');
  items.forEach((item) => {
    const row = element('li', 'fwe-popular-item');
    const anchor = element('a', 'fwe-popular-item__link');
    anchor.href = item.href;
    anchor.append(element('span', 'fwe-popular-item__rank', String(item.rank).padStart(2, '0')));
    if (item.imageUrl) {
      const image = element('img', 'fwe-popular-item__image');
      image.src = item.imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      anchor.append(image);
    }
    anchor.append(element('span', 'fwe-popular-item__title', item.title));
    row.append(anchor);
    list.append(row);
  });
  dialog.append(header, list);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  return dialog;
}

function appendNavigation(parent: HTMLElement, items: NavigationItem[]): void {
  const list = element('ul', 'fwe-browse-nav');
  items.forEach((item) => {
    const row = element('li');
    const link = element('a');
    link.href = item.href;
    link.textContent = item.title;
    if (item.target) link.target = item.target;
    if (item.rel) link.rel = item.rel;
    row.append(link);
    if (item.children.length > 0) appendNavigation(row, item.children);
    list.append(row);
  });
  parent.append(list);
}

function appendArchives(parent: HTMLElement, groups: ArchiveGroup[]): void {
  const section = element('section', 'fwe-archives');
  section.append(element('h2', '', 'Monthly Archives'));
  groups.forEach((group, index) => {
    const details = element('details', 'fwe-archive-year');
    details.open = index === 0;
    const summary = element('summary', '', group.year);
    const list = element('ul');
    group.items.forEach((item) => {
      const row = element('li');
      const link = element('a', '', item.label);
      link.href = item.href;
      row.append(link);
      if (item.count) row.append(element('span', 'fwe-archive-count', item.count));
      list.append(row);
    });
    details.append(summary, list);
    section.append(details);
  });
  parent.append(section);
}

function createBrowseDialog(items: NavigationItem[], groups: ArchiveGroup[]): HTMLDialogElement {
  const dialog = element('dialog', 'fwe-browse-dialog');
  dialog.setAttribute('aria-labelledby', 'fwe-browse-title');
  const header = element('header', 'fwe-dialog__header');
  const title = element('h2', '', 'Browse FitGirl');
  title.id = 'fwe-browse-title';
  const close = element('button', 'fwe-icon-button');
  close.type = 'button';
  close.setAttribute('aria-label', '关闭浏览菜单');
  close.append(createIcon('close'));
  header.append(title, close);
  const content = element('div', 'fwe-browse-dialog__content');
  appendNavigation(content, items);
  appendArchives(content, groups);
  dialog.append(header, content);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  return dialog;
}

export class FitGirlEnhancedApp {
  private mode: LayoutMode;
  private mediaExpanded: boolean;
  private transaction: DomTransaction | null = null;
  private observer: MutationObserver | null = null;
  private videoObserver: IntersectionObserver | null = null;
  private processing = false;
  private readonly viewControl: HTMLDetailsElement;
  private readonly switchButton: HTMLButtonElement;
  private readonly mediaSwitchButton: HTMLButtonElement;
  private readonly popularButton: HTMLButtonElement;
  private readonly browseButton: HTMLButtonElement;
  private readonly popularDialog: HTMLDialogElement;
  private readonly browseDialog: HTMLDialogElement;
  private readonly searchForm: HTMLFormElement;
  private readonly hasPopularItems: boolean;
  private lastDialogTrigger: HTMLElement | null = null;

  constructor() {
    this.mode = getFastStoredLayoutMode();
    this.mediaExpanded = getFastStoredMediaExpand();

    const popularItems = parsePopularItems(document.querySelector('#block-2'));
    this.hasPopularItems = popularItems.length > 0;
    this.popularDialog = createPopularDialog(popularItems);
    this.browseDialog = createBrowseDialog(
      parseNavigation(document.querySelector('#site-header-menu, #primary-navigation')),
      parseArchiveGroups(document.querySelector('.widget_archive')),
    );
    document.body.append(this.popularDialog, this.browseDialog);

    this.searchForm = createSearchForm();
    this.popularButton = element('button', 'fwe-popular-button');
    this.popularButton.type = 'button';
    this.popularButton.setAttribute('aria-label', '打开热门榜单');
    this.popularButton.append(createIcon('popular'), document.createTextNode('Popular'));
    this.browseButton = element('button', 'fwe-browse-button');
    this.browseButton.type = 'button';
    this.browseButton.setAttribute('aria-label', '浏览站点路由和月度归档');
    this.browseButton.append(createIcon('menu'), element('span', '', 'Browse'));

    this.viewControl = element('details', 'fwe-view-control');
    const viewSummary = element('summary', 'fwe-view-control__trigger');
    viewSummary.append(createIcon('eye'), element('span', '', 'View'));
    const panel = element('div', 'fwe-view-control__panel');

    const layoutRow = element('div', 'fwe-view-control__row');
    layoutRow.append(element('span', 'fwe-view-control__label', 'Enhanced View'));
    this.switchButton = element('button', 'fwe-switch');
    this.switchButton.type = 'button';
    this.switchButton.setAttribute('role', 'switch');
    this.switchButton.setAttribute('aria-label', '切换增强布局与原站布局');
    this.switchButton.append(element('span', 'fwe-switch__thumb'));
    layoutRow.append(this.switchButton);

    const mediaRow = element('div', 'fwe-view-control__row');
    mediaRow.append(element('span', 'fwe-view-control__label', 'Expand Screenshots'));
    this.mediaSwitchButton = element('button', 'fwe-switch');
    this.mediaSwitchButton.type = 'button';
    this.mediaSwitchButton.setAttribute('role', 'switch');
    this.mediaSwitchButton.setAttribute('aria-label', '切换截图与实机预览默认展开状态');
    this.mediaSwitchButton.append(element('span', 'fwe-switch__thumb'));
    mediaRow.append(this.mediaSwitchButton);

    panel.append(
      layoutRow,
      mediaRow,
      element(
        'p',
        'fwe-view-control__help',
        '增强布局会重排信息并隐藏常驻侧栏；同时可切换截图与实机预览的默认展开状态。配置会自动保存在当前浏览器中。',
      ),
    );
    this.viewControl.append(viewSummary, panel);
    this.mountControls();
    this.applyMode(this.mode);
    this.applyMediaExpand(this.mediaExpanded);

    this.switchButton.addEventListener(
      'click',
      () => void this.setMode(this.mode === 'enhanced' ? 'original' : 'enhanced'),
    );
    this.mediaSwitchButton.addEventListener(
      'click',
      () => void this.setMediaExpand(!this.mediaExpanded),
    );
    this.popularButton.addEventListener('click', () =>
      this.openDialog(this.popularDialog, this.popularButton),
    );
    this.browseButton.addEventListener('click', () =>
      this.openDialog(this.browseDialog, this.browseButton),
    );
    [this.popularDialog, this.browseDialog].forEach((dialog) => {
      dialog.addEventListener('close', () => {
        this.lastDialogTrigger?.focus();
        this.lastDialogTrigger = null;
      });
      dialog.addEventListener('keydown', (event) => this.trapDialogFocus(dialog, event));
    });
  }

  async start(): Promise<void> {
    const [mode, mediaExpanded] = await Promise.all([
      readStoredLayoutMode(),
      readStoredMediaExpand(),
    ]);
    this.mode = mode;
    this.mediaExpanded = mediaExpanded;
    this.applyMode(this.mode);
    this.applyMediaExpand(this.mediaExpanded);
  }

  private mountControls(): void {
    const header =
      document.querySelector<HTMLElement>('#masthead .site-header-main') ??
      document.querySelector<HTMLElement>('#masthead .header-main') ??
      document.querySelector<HTMLElement>('#masthead');
    (header ?? document.body).append(
      this.searchForm,
      this.popularButton,
      this.browseButton,
      this.viewControl,
    );
  }

  private async setMode(mode: LayoutMode): Promise<void> {
    this.switchButton.disabled = true;
    await writeStoredLayoutMode(mode);
    this.applyMode(mode);
    this.switchButton.disabled = false;
  }

  private async setMediaExpand(expanded: boolean): Promise<void> {
    this.mediaSwitchButton.disabled = true;
    await writeStoredMediaExpand(expanded);
    this.mediaExpanded = expanded;
    this.applyMediaExpand(expanded);
    this.mediaSwitchButton.disabled = false;
  }

  private applyMediaExpand(expanded: boolean): void {
    this.mediaSwitchButton.setAttribute('aria-checked', String(expanded));
    document.querySelectorAll<HTMLDetailsElement>('.fwe-media').forEach((media) => {
      media.open = expanded;
    });
  }

  private applyMode(mode: LayoutMode): void {
    if (this.transaction) this.disableEnhanced();
    this.mode = mode;
    document.documentElement.dataset.fweMode = mode;
    this.switchButton.setAttribute('aria-checked', String(mode === 'enhanced'));
    this.searchForm.hidden = mode !== 'enhanced';
    this.popularButton.hidden = mode !== 'enhanced' || !this.hasPopularItems;
    this.browseButton.hidden = mode !== 'enhanced';
    this.viewControl.open = false;
    if (mode === 'enhanced') this.enableEnhanced();
  }

  private enableEnhanced(): void {
    this.transaction = new DomTransaction();
    document.querySelectorAll<HTMLElement>('.widget_archive').forEach((widget) => {
      this.transaction?.addClass(widget, 'fwe-source-hidden');
    });
    this.prepareNavigation();
    this.processArticles();
    this.observeChanges();
    this.observeVideos();
  }

  private disableEnhanced(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.videoObserver?.disconnect();
    this.videoObserver = null;
    document
      .querySelectorAll<HTMLVideoElement>('.fwe-observed-video')
      .forEach((video) => video.pause());
    if (this.popularDialog.open) this.popularDialog.close();
    if (this.browseDialog.open) this.browseDialog.close();
    this.transaction?.restore();
    this.transaction = null;
  }

  private prepareNavigation(): void {
    const list = document.querySelector<HTMLElement>(
      '#site-header-menu .nav-menu, #primary-navigation .nav-menu',
    );
    if (!list || !this.transaction) return;
    [...list.children].forEach((item, index) => {
      if (!(item instanceof HTMLElement)) return;
      this.transaction?.addClass(item, index < 4 ? 'fwe-nav-priority' : 'fwe-nav-overflow');
    });
  }

  private processArticles(): void {
    if (!this.transaction || this.processing) return;
    this.processing = true;
    const pageKind = detectPageKind();
    const articles = document.querySelectorAll<HTMLElement>(
      '#content article.hentry, article.hentry',
    );
    for (const root of articles) {
      if (root.hasAttribute('data-fwe-ready')) continue;
      const article = parseArticle(root, pageKind);
      if (article.kind === 'game') transformGame(article, this.transaction, this.mediaExpanded);
      else if (article.kind === 'upcoming') transformUpcoming(article, this.transaction);
      else transformSpecial(article, this.transaction);
    }
    this.processing = false;
  }

  private observeChanges(): void {
    const target = document.querySelector('#content') ?? document.body;
    this.observer = new MutationObserver(() => {
      if (this.processing || this.mode !== 'enhanced') return;
      queueMicrotask(() => {
        this.processArticles();
        this.observeVideos();
      });
    });
    this.observer.observe(target, { childList: true, subtree: true });
  }

  private observeVideos(): void {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    if (!this.videoObserver) {
      this.videoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const video = entry.target;
            if (!(video instanceof HTMLVideoElement)) return;
            const isVisible = video.closest('details')?.open ?? true;
            if (isVisible && entry.isIntersecting && entry.intersectionRatio >= 0.6)
              void video.play().catch(() => undefined);
            else video.pause();
          });
        },
        { threshold: [0, 0.6] },
      );
    }
    document
      .querySelectorAll<HTMLVideoElement>('.fwe-observed-video')
      .forEach((video) => this.videoObserver?.observe(video));
  }

  private openDialog(dialog: HTMLDialogElement, trigger: HTMLElement): void {
    if (this.mode !== 'enhanced' || dialog.open) return;
    this.lastDialogTrigger = trigger;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('button, a, summary')?.focus();
  }

  private trapDialogFocus(dialog: HTMLDialogElement, event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], summary'),
    ].filter((item) => !item.hidden);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
