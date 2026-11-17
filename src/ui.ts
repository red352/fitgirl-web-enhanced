import { createIcon } from './icons';
import {
  detectPageKind,
  DomTransaction,
  extractFacts,
  formatRecentRelativeTime,
  normalizeText,
  parseArchiveGroups,
  parseArticle,
  parseArticleDate,
  parseNavigation,
  parsePopularItems,
  parseUpcomingItems,
} from './dom';
import { detectBrowserLanguage, getActiveLanguage, setActiveLanguage, t } from './i18n';
import {
  getFastStoredInfiniteScroll,
  getFastStoredLanguage,
  getFastStoredLayoutMode,
  getFastStoredMediaExpand,
  getFastStoredShowRatings,
  getFastStoredTheme,
  readStoredInfiniteScroll,
  readStoredLanguage,
  readStoredLayoutMode,
  readStoredMediaExpand,
  readStoredShowRatings,
  readStoredTheme,
  writeStoredInfiniteScroll,
  writeStoredLanguage,
  writeStoredLayoutMode,
  writeStoredMediaExpand,
  writeStoredShowRatings,
  writeStoredTheme,
} from './preferences';
import {
  cleanTitleBase,
  getGameRating,
  globalRatingCache,
  globalRatingQueue,
  translateScoreDesc,
} from './rating';
import type {
  ArchiveGroup,
  ArticleKind,
  GameRatingData,
  LayoutMode,
  LightboxMedia,
  NavigationItem,
  ParsedArticle,
  PopularItem,
  SupportedLanguage,
  ThemeMode,
} from './types';

const FACT_ICONS = {
  'Genres/Tags': 'tag',
  Company: 'building',
  Languages: 'language',
  'Original Size': 'drive',
  'Repack Size': 'download',
  Rating: 'star',
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

function transformDirectLinksSpoilers(container: HTMLElement, transaction: DomTransaction): void {
  const spoilers = container.querySelectorAll<HTMLElement>('.su-spoiler');
  spoilers.forEach((spoiler) => {
    const titleNode = spoiler.querySelector<HTMLElement>('.su-spoiler-title');
    const contentNode = spoiler.querySelector<HTMLElement>('.su-spoiler-content');
    if (!titleNode || !contentNode) return;

    const titleText =
      (titleNode.textContent ?? '').replace(/\s+/g, ' ').trim() || 'Click to show direct links';
    const details = element('details', 'fwe-direct-links-details');
    const summary = element('summary', 'fwe-direct-links-summary');
    summary.append(
      createIcon('chevron', 'fwe-direct-links-chevron'),
      element('span', '', titleText),
    );
    const body = element('div', 'fwe-direct-links-content');

    transaction.insert(details, spoiler.parentElement ?? container, spoiler);
    transaction.move(contentNode, body);
    details.append(summary, body);
    transaction.addClass(spoiler, 'fwe-source-hidden');
  });
}

export class GameDetailModal {
  private readonly dialog: HTMLDialogElement;
  private readonly titleLink: HTMLAnchorElement;
  private readonly titleText: HTMLSpanElement;
  private readonly tabsNav: HTMLElement;
  private readonly body: HTMLElement;
  private readonly tabButtons = new Map<
    'downloads' | 'features' | 'description',
    HTMLButtonElement
  >();
  private readonly tabPanes = new Map<'downloads' | 'features' | 'description', HTMLElement>();
  private currentPayload: HTMLElement | null = null;
  private currentPayloadParent: HTMLElement | null = null;
  private lastTrigger: HTMLElement | null = null;
  private isBackdropMouseDown = false;

  constructor() {
    this.dialog = element('dialog', 'fwe-game-dialog');
    this.dialog.setAttribute('aria-label', t('gameModalAria'));

    const panel = element('div', 'fwe-game-dialog__panel');
    const header = element('header', 'fwe-game-dialog__header');

    const titleRow = element('div', 'fwe-game-dialog__title-row');
    const heading = element('h2', 'fwe-game-dialog__title');
    this.titleLink = element('a');
    this.titleText = element('span');
    heading.append(this.titleLink, this.titleText);

    const closeBtn = element('button', 'fwe-icon-button fwe-game-dialog__close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', t('gameModalCloseAria'));
    closeBtn.append(createIcon('close'));
    closeBtn.addEventListener('click', () => this.close());
    titleRow.append(heading, closeBtn);

    this.tabsNav = element('nav', 'fwe-game-dialog__tabs');
    this.tabsNav.setAttribute('role', 'tablist');

    this.body = element('div', 'fwe-game-dialog__body');

    header.append(titleRow, this.tabsNav);
    panel.append(header, this.body);
    this.dialog.append(panel);

    // Robust backdrop click handler to prevent accidental dismissals
    this.dialog.addEventListener('mousedown', (e) => {
      this.isBackdropMouseDown = e.target === this.dialog;
    });
    this.dialog.addEventListener('click', (e) => {
      if (this.isBackdropMouseDown && e.target === this.dialog) {
        this.close();
      }
      this.isBackdropMouseDown = false;
    });

    this.dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    this.dialog.addEventListener('close', () => {
      this.handleClose();
    });

    document.body.append(this.dialog);
  }

  public open(params: {
    title: string;
    titleHref?: string;
    payloadContainer: HTMLElement;
    initialTab: 'downloads' | 'features' | 'description';
    trigger: HTMLElement;
  }): void {
    this.lastTrigger = params.trigger;

    if (params.titleHref) {
      this.titleLink.href = params.titleHref;
      this.titleLink.textContent = params.title;
      this.titleLink.style.display = '';
      this.titleText.textContent = '';
      this.titleText.style.display = 'none';
    } else {
      this.titleLink.style.display = 'none';
      this.titleText.textContent = params.title;
      this.titleText.style.display = '';
    }

    if (this.currentPayload && this.currentPayloadParent) {
      this.currentPayloadParent.append(this.currentPayload);
      this.currentPayload.style.setProperty('display', 'none', 'important');
    }

    this.currentPayload = params.payloadContainer;
    this.currentPayloadParent = params.payloadContainer.parentElement;
    this.body.innerHTML = '';
    this.tabsNav.innerHTML = '';
    this.tabButtons.clear();
    this.tabPanes.clear();

    this.currentPayload.style.setProperty('display', 'block', 'important');
    this.body.append(this.currentPayload);

    const panes = this.currentPayload.querySelectorAll<HTMLElement>('.fwe-game-dialog__pane');
    panes.forEach((pane) => {
      const kind = pane.dataset.pane as 'downloads' | 'features' | 'description' | undefined;
      if (!kind) return;
      this.tabPanes.set(kind, pane);

      const labelMap = {
        downloads: t('cardMirrors'),
        features: t('cardFeatures'),
        description: t('cardDescription'),
      };
      const iconMap = {
        downloads: 'download' as const,
        features: 'features' as const,
        description: 'description' as const,
      };

      const tabBtn = element('button', 'fwe-game-dialog__tab');
      tabBtn.type = 'button';
      tabBtn.setAttribute('role', 'tab');
      tabBtn.append(createIcon(iconMap[kind]), element('span', '', labelMap[kind]));
      tabBtn.addEventListener('click', () => this.setActiveTab(kind));
      this.tabsNav.append(tabBtn);
      this.tabButtons.set(kind, tabBtn);
    });

    const targetTab = this.tabPanes.has(params.initialTab)
      ? params.initialTab
      : this.tabPanes.keys().next().value;

    if (targetTab) {
      this.setActiveTab(targetTab);
    }

    if (!this.dialog.open) {
      this.dialog.showModal();
    }

    const activeTabBtn = targetTab ? this.tabButtons.get(targetTab) : null;
    activeTabBtn?.focus();
  }

  public setActiveTab(tab: 'downloads' | 'features' | 'description'): void {
    this.tabButtons.forEach((btn, kind) => {
      const active = kind === tab;
      btn.classList.toggle('fwe-game-dialog__tab--active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    this.tabPanes.forEach((pane, kind) => {
      const active = kind === tab;
      pane.classList.toggle('fwe-game-dialog__pane--active', active);
      pane.hidden = !active;
      pane.style.setProperty('display', active ? 'block' : 'none', 'important');
    });
    this.body.scrollTop = 0;
  }

  public close(): void {
    if (this.dialog.open) {
      this.dialog.close();
    }
  }

  private handleClose(): void {
    if (this.currentPayload && this.currentPayloadParent) {
      this.currentPayload.style.setProperty('display', 'none', 'important');
      this.currentPayloadParent.append(this.currentPayload);
      this.currentPayload = null;
      this.currentPayloadParent = null;
    }
    this.body.innerHTML = '';
    const trigger = this.lastTrigger;
    this.lastTrigger = null;
    if (trigger) {
      requestAnimationFrame(() => {
        trigger.focus();
      });
    }
  }

  public updateLanguage(): void {
    this.dialog.setAttribute('aria-label', t('gameModalAria'));
    const closeBtn = this.dialog.querySelector<HTMLButtonElement>('.fwe-game-dialog__close');
    if (closeBtn) closeBtn.setAttribute('aria-label', t('gameModalCloseAria'));
    this.tabButtons.forEach((btn, kind) => {
      const span = btn.querySelector('span');
      if (span) {
        if (kind === 'downloads') span.textContent = t('cardMirrors');
        else if (kind === 'features') span.textContent = t('cardFeatures');
        else if (kind === 'description') span.textContent = t('cardDescription');
      }
    });
  }

  public destroy(): void {
    this.close();
    this.dialog.remove();
  }
}

function createCardPayload(article: ParsedArticle, transaction: DomTransaction): HTMLElement {
  const payload = element('div', 'fwe-card-payload');
  payload.style.setProperty('display', 'none', 'important');
  payload.setAttribute('aria-hidden', 'true');

  const availableTabs: Array<{
    kind: 'downloads' | 'features' | 'description';
  }> = [];
  const downloads = article.sections.get('downloads');
  const features = article.sections.get('features');
  const description = article.sections.get('description');

  if (downloads) availableTabs.push({ kind: 'downloads' });
  if (features) availableTabs.push({ kind: 'features' });
  if (description) availableTabs.push({ kind: 'description' });

  availableTabs.forEach(({ kind }) => {
    const pane = element('section', `fwe-game-dialog__pane fwe-game-dialog__pane--${kind}`);
    pane.dataset.pane = kind;
    pane.setAttribute('role', 'tabpanel');
    pane.style.setProperty('display', 'none', 'important');
    pane.hidden = true;

    const section = article.sections.get(kind);
    if (section) {
      for (const node of section.nodes) {
        transaction.move(node, pane);
        if (kind === 'description') {
          const content = node.querySelector<HTMLElement>(':scope > .su-spoiler-content');
          if (content) {
            transaction.addClass(node, 'fwe-description-shell');
            transaction.move(content, pane);
          }
        }
      }
      if (kind === 'downloads') {
        transformDirectLinksSpoilers(pane, transaction);
      }
    }

    payload.append(pane);
  });

  return payload;
}

function createCardActions(
  article: ParsedArticle,
  payload: HTMLElement,
  gameModal?: GameDetailModal,
): HTMLElement {
  const actions = element('div', 'fwe-card-actions');

  const downloads = article.sections.get('downloads');
  const features = article.sections.get('features');
  const description = article.sections.get('description');

  const openTab = (tab: 'downloads' | 'features' | 'description', trigger: HTMLElement) => {
    gameModal?.open({
      title: article.title ?? 'Game Details',
      titleHref: article.titleLink?.href,
      payloadContainer: payload,
      initialTab: tab,
      trigger,
    });
  };

  if (downloads) {
    const btn = element('button', 'fwe-card-btn fwe-card-btn--primary');
    btn.type = 'button';
    btn.setAttribute('data-fwe-toggle', `${article.root.id}-mirrors`);
    btn.append(createIcon('download'), element('span', '', t('cardMirrors')));
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTab('downloads', btn);
    });
    actions.append(btn);
  }

  if (features) {
    const btn = element('button', 'fwe-card-btn fwe-card-btn--ghost');
    btn.type = 'button';
    btn.setAttribute('data-fwe-toggle', `${article.root.id}-features`);
    btn.append(createIcon('features'), element('span', '', t('cardFeatures')));
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTab('features', btn);
    });
    actions.append(btn);
  }

  if (description) {
    const btn = element('button', 'fwe-card-btn fwe-card-btn--ghost');
    btn.type = 'button';
    btn.setAttribute('data-fwe-toggle', `${article.root.id}-desc`);
    btn.append(createIcon('description'), element('span', '', t('cardDescription')));
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTab('description', btn);
    });
    actions.append(btn);
  }

  return actions;
}

function createDetailSections(article: ParsedArticle, transaction: DomTransaction): HTMLElement {
  const container = element('div', 'fwe-detail-sections');

  const available: Array<{
    kind: 'downloads' | 'features' | 'description';
    label: string;
    icon: 'download' | 'features' | 'description';
  }> = [
    { kind: 'downloads', label: t('cardMirrors'), icon: 'download' },
    { kind: 'features', label: t('cardFeatures'), icon: 'features' },
    { kind: 'description', label: t('cardDescription'), icon: 'description' },
  ];

  for (const { kind, label, icon } of available) {
    const section = article.sections.get(kind);
    if (!section) continue;

    const block = element('section', `fwe-detail-section fwe-detail-section--${kind}`);
    const blockHeader = element('div', 'fwe-detail-section__header');
    blockHeader.append(createIcon(icon), element('h3', 'fwe-detail-section__title', label));
    const blockContent = element('div', 'fwe-detail-section__content');

    for (const node of section.nodes) {
      transaction.move(node, blockContent);
      if (kind === 'description') {
        const content = node.querySelector<HTMLElement>(':scope > .su-spoiler-content');
        if (content) {
          transaction.addClass(node, 'fwe-description-shell');
          transaction.move(content, blockContent);
        }
      }
    }

    if (kind === 'downloads') {
      transformDirectLinksSpoilers(blockContent, transaction);
    }

    block.append(blockHeader, blockContent);
    container.append(block);
  }

  return container;
}

/**
 * Renders the game info rows as definition list items.
 *
 * `Original Size` and `Repack Size` are two halves of the same fact — how big the
 * install is versus how big the download is — so they share one row with an arrow
 * between them. Rendering them separately cost a line and made the reader compare
 * two numbers that are meant to be read as a pair. `ParsedArticle.facts` is left
 * untouched; the merge happens here, in the rendering layer.
 */
function createFacts(article: ParsedArticle): HTMLElement {
  const list = element('dl', 'fwe-facts');
  const facts = extractFacts(article.infoBlock);
  const originalIndex = facts.findIndex((fact) => fact.label === 'Original Size');
  const repackIndex = facts.findIndex((fact) => fact.label === 'Repack Size');

  facts.forEach((fact, index) => {
    if (index === repackIndex && originalIndex >= 0) return;

    const item = element('div', 'fwe-fact');
    const term = element('dt', 'fwe-fact__label');
    const isMergedSize = index === originalIndex && repackIndex >= 0;
    if (isMergedSize) {
      term.append(
        createIcon(FACT_ICONS[fact.label]),
        document.createTextNode(t('factSizeMergedLabel')),
      );
    } else {
      term.append(createIcon(FACT_ICONS[fact.label]), document.createTextNode(fact.label));
    }

    const description = element('dd', 'fwe-fact__value');
    if (fact.links.length > 0) {
      fact.links.forEach((link, linkIndex) => {
        if (linkIndex > 0) description.append(document.createTextNode(', '));
        const anchor = element('a');
        anchor.href = link.href;
        anchor.textContent = link.text;
        description.append(anchor);
      });
    } else if (isMergedSize) {
      const repack = facts[repackIndex];
      description.textContent = t('factSizeMerged', {
        original: fact.value,
        repack: repack?.value ?? '',
      });
    } else {
      description.textContent = fact.value;
    }

    item.append(term, description);
    list.append(item);
  });

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
  panel.setAttribute('aria-label', t('gameInfoAria'));
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

function resolveMediaSource(item: {
  element: HTMLAnchorElement;
  image: HTMLImageElement | null;
  video: HTMLVideoElement | null;
}): { type: 'image' | 'video'; src: string; hdSrc?: string } {
  if (item.video) {
    const sourceEl = item.video.querySelector<HTMLSourceElement>('source');
    const sourceSrc = sourceEl?.src || sourceEl?.getAttribute('src') || '';
    const videoSrc =
      item.video.src || item.video.currentSrc || item.video.getAttribute('src') || '';
    const anchorHref = /\.(mp4|webm|ogg|gif)(\?.*)?$/i.test(item.element.href)
      ? item.element.href
      : '';
    const finalVideoSrc = sourceSrc || videoSrc || anchorHref;
    if (finalVideoSrc) {
      return { type: 'video', src: finalVideoSrc };
    }
  }

  // Check if anchor directly points to video or animated image
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(item.element.href)) {
    return { type: 'video', src: item.element.href };
  }

  const rawImgSrc =
    item.image?.currentSrc || item.image?.src || item.image?.getAttribute('src') || '';
  let src = rawImgSrc;
  let hdSrc: string | undefined;

  // Automatically upgrade http to https (excluding loopback) to prevent mixed content blocking
  if (
    src.startsWith('http://') &&
    !src.startsWith('http://localhost') &&
    !src.startsWith('http://127.0.0.1')
  ) {
    src = src.replace(/^http:\/\//i, 'https://');
  }

  if (src.includes('.240p.jpg')) {
    hdSrc = src.replace(/\.240p\.jpg$/, '');
  } else if (/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(item.element.href)) {
    let directHref = item.element.href;
    if (
      directHref.startsWith('http://') &&
      !directHref.startsWith('http://localhost') &&
      !directHref.startsWith('http://127.0.0.1')
    ) {
      directHref = directHref.replace(/^http:\/\//i, 'https://');
    }
    if (directHref !== src) {
      hdSrc = directHref;
    }
  }

  return { type: 'image', src, hdSrc };
}

export class ImageLightbox {
  private readonly dialog: HTMLDialogElement;
  private readonly counter: HTMLElement;
  private readonly hdBadge: HTMLElement;
  private readonly zoomLevelText: HTMLButtonElement;
  private readonly image: HTMLImageElement;
  private readonly video: HTMLVideoElement;
  private readonly spinner: HTMLElement;
  private readonly prevBtn: HTMLButtonElement;
  private readonly nextBtn: HTMLButtonElement;
  private readonly zoomOutBtn: HTMLButtonElement;
  private readonly zoomInBtn: HTMLButtonElement;
  private readonly resetBtn: HTMLButtonElement;
  private readonly closeBtn: HTMLButtonElement;
  private readonly externalBtn: HTMLAnchorElement;
  private readonly stage: HTMLElement;
  private items: LightboxMedia[] = [];
  private currentIndex = 0;
  private triggerElement: HTMLElement | null = null;
  private preloadedHd = new Set<string>();
  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private isDragging = false;
  private startX = 0;
  private startY = 0;

  constructor() {
    this.dialog = element('dialog', 'fwe-lightbox-dialog');
    this.dialog.setAttribute('aria-label', t('lightboxAria'));

    const wrapper = element('div', 'fwe-lightbox');

    const header = element('header', 'fwe-lightbox__header');
    const metaGroup = element('div', 'fwe-lightbox__meta');
    this.counter = element('span', 'fwe-lightbox__counter', '1 / 1');
    this.hdBadge = element('span', 'fwe-lightbox__hd-badge', 'HD');
    metaGroup.append(this.counter, this.hdBadge);

    const toolbar = element('div', 'fwe-lightbox__toolbar');

    this.zoomOutBtn = element('button', 'fwe-lightbox__btn');
    this.zoomOutBtn.type = 'button';
    this.zoomOutBtn.title = t('zoomOutTitle');
    this.zoomOutBtn.setAttribute('aria-label', t('zoomOutAria'));
    this.zoomOutBtn.append(createIcon('zoomOut'));
    this.zoomOutBtn.addEventListener('click', () => this.applyZoom(this.scale * 0.8));

    this.zoomLevelText = element('button', 'fwe-lightbox__zoom-indicator', '100%');
    this.zoomLevelText.type = 'button';
    this.zoomLevelText.title = t('zoomResetTitle');
    this.zoomLevelText.setAttribute('aria-label', t('zoomResetAria'));
    this.zoomLevelText.addEventListener('click', () => this.resetZoom());

    this.zoomInBtn = element('button', 'fwe-lightbox__btn');
    this.zoomInBtn.type = 'button';
    this.zoomInBtn.title = t('zoomInTitle');
    this.zoomInBtn.setAttribute('aria-label', t('zoomInAria'));
    this.zoomInBtn.append(createIcon('zoomIn'));
    this.zoomInBtn.addEventListener('click', () => this.applyZoom(this.scale * 1.25));

    this.resetBtn = element('button', 'fwe-lightbox__btn');
    this.resetBtn.type = 'button';
    this.resetBtn.title = t('fitScreenTitle');
    this.resetBtn.setAttribute('aria-label', t('fitScreenAria'));
    this.resetBtn.append(createIcon('zoomReset'));
    this.resetBtn.addEventListener('click', () => this.resetZoom());

    toolbar.append(this.zoomOutBtn, this.zoomLevelText, this.zoomInBtn, this.resetBtn);

    const actions = element('div', 'fwe-lightbox__actions');

    this.externalBtn = element('a', 'fwe-lightbox__btn');
    this.externalBtn.target = '_blank';
    this.externalBtn.rel = 'noopener noreferrer';
    this.externalBtn.title = t('openExternalTitle');
    this.externalBtn.setAttribute('aria-label', t('openExternalAria'));
    this.externalBtn.append(createIcon('external'));

    this.closeBtn = element('button', 'fwe-lightbox__btn fwe-lightbox__btn--close');
    this.closeBtn.type = 'button';
    this.closeBtn.title = t('closeLightboxTitle');
    this.closeBtn.setAttribute('aria-label', t('closeLightboxAria'));
    this.closeBtn.append(createIcon('close'));
    this.closeBtn.addEventListener('click', () => this.close());

    actions.append(this.externalBtn, this.closeBtn);
    header.append(metaGroup, toolbar, actions);

    const body = element('div', 'fwe-lightbox__body');

    this.prevBtn = element('button', 'fwe-lightbox__nav fwe-lightbox__nav--prev');
    this.prevBtn.type = 'button';
    this.prevBtn.title = t('prevMediaTitle');
    this.prevBtn.setAttribute('aria-label', t('prevMediaAria'));
    this.prevBtn.append(createIcon('chevronLeft'));
    this.prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.prev();
    });

    this.nextBtn = element('button', 'fwe-lightbox__nav fwe-lightbox__nav--next');
    this.nextBtn.type = 'button';
    this.nextBtn.title = t('nextMediaTitle');
    this.nextBtn.setAttribute('aria-label', t('nextMediaAria'));
    this.nextBtn.append(createIcon('chevronRight'));
    this.nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.next();
    });

    this.stage = element('div', 'fwe-lightbox__stage');
    this.spinner = element('div', 'fwe-lightbox__spinner');
    this.image = element('img', 'fwe-lightbox__image');
    this.video = element('video', 'fwe-lightbox__video');
    this.video.controls = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.loop = true;

    this.stage.append(this.spinner, this.image, this.video);
    body.append(this.prevBtn, this.stage, this.nextBtn);

    wrapper.append(header, body);
    this.dialog.append(wrapper);

    this.bindZoomAndDrag(this.stage);

    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) {
        this.close();
      }
    });

    this.dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.prev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.next();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      } else if (event.key === '+' || event.key === '=' || (event.ctrlKey && event.key === '=')) {
        event.preventDefault();
        this.applyZoom(this.scale * 1.25);
      } else if (event.key === '-' || (event.ctrlKey && event.key === '-')) {
        event.preventDefault();
        this.applyZoom(this.scale * 0.8);
      } else if (event.key === '0' || (event.ctrlKey && event.key === '0')) {
        event.preventDefault();
        this.resetZoom();
      }
    });

    document.body.append(this.dialog);
  }

  private bindZoomAndDrag(stage: HTMLElement): void {
    stage.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.16 : 0.86;
        const rect = stage.getBoundingClientRect();
        const focalX = event.clientX - (rect.left + rect.width / 2);
        const focalY = event.clientY - (rect.top + rect.height / 2);
        this.applyZoom(this.scale * factor, focalX, focalY);
      },
      { passive: false },
    );

    stage.addEventListener('dblclick', (event) => {
      event.preventDefault();
      if (this.scale > 1.05) {
        this.resetZoom();
      } else {
        const rect = stage.getBoundingClientRect();
        const focalX = event.clientX - (rect.left + rect.width / 2);
        const focalY = event.clientY - (rect.top + rect.height / 2);
        this.applyZoom(2.2, focalX, focalY);
      }
    });

    stage.addEventListener('pointerdown', (event: PointerEvent) => {
      if (event.button !== 0 || this.scale <= 1) return;
      this.isDragging = true;
      this.startX = event.clientX - this.translateX;
      this.startY = event.clientY - this.translateY;
      stage.classList.add('is-dragging');
      stage.setPointerCapture(event.pointerId);
    });

    stage.addEventListener('pointermove', (event: PointerEvent) => {
      if (!this.isDragging) return;
      this.translateX = event.clientX - this.startX;
      this.translateY = event.clientY - this.startY;
      this.updateTransform();
    });

    const endDrag = (event: PointerEvent) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      stage.classList.remove('is-dragging');
      try {
        stage.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    };

    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
  }

  private applyZoom(newScale: number, focalX = 0, focalY = 0): void {
    const prevScale = this.scale;
    const clamped = Math.max(0.6, Math.min(newScale, 5.0));
    this.scale = clamped;

    if (this.scale <= 1) {
      this.translateX = 0;
      this.translateY = 0;
    } else if (prevScale !== this.scale && focalX !== 0 && focalY !== 0) {
      const ratio = this.scale / prevScale;
      this.translateX = focalX - (focalX - this.translateX) * ratio;
      this.translateY = focalY - (focalY - this.translateY) * ratio;
    }

    this.zoomLevelText.textContent = `${Math.round(this.scale * 100)}%`;
    this.updateTransform();
  }

  private resetZoom(): void {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.zoomLevelText.textContent = '100%';
    this.updateTransform();
  }

  private updateTransform(): void {
    const target = this.items[this.currentIndex]?.type === 'video' ? this.video : this.image;
    target.style.transform = `translate3d(${this.translateX}px, ${this.translateY}px, 0) scale(${this.scale})`;
    target.style.cursor = this.scale > 1 ? (this.isDragging ? 'grabbing' : 'grab') : 'default';
  }

  public open(items: LightboxMedia[], initialIndex: number, triggerElement?: HTMLElement): void {
    if (items.length === 0) return;
    this.items = items;
    this.currentIndex = Math.max(0, Math.min(initialIndex, items.length - 1));
    this.triggerElement = triggerElement ?? null;
    this.resetZoom();

    this.render();

    if (!this.dialog.open) {
      if (typeof this.dialog.showModal === 'function') {
        this.dialog.showModal();
      } else {
        this.dialog.setAttribute('open', '');
      }
    }
  }

  public close(): void {
    if (this.dialog.open || this.dialog.hasAttribute('open')) {
      this.video.pause();
      this.video.src = '';
      this.resetZoom();
      if (typeof this.dialog.close === 'function') {
        this.dialog.close();
      } else {
        this.dialog.removeAttribute('open');
      }
      if (this.triggerElement) {
        this.triggerElement.focus();
      }
    }
  }

  public next(): void {
    if (this.items.length <= 1) return;
    this.resetZoom();
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.render();
  }

  public prev(): void {
    if (this.items.length <= 1) return;
    this.resetZoom();
    this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.render();
  }

  private updateHdBadge(state: 'loading' | 'ready' | 'video' | 'none'): void {
    this.hdBadge.className = 'fwe-lightbox__hd-badge';
    if (state === 'none') {
      this.hdBadge.style.display = 'none';
      return;
    }
    this.hdBadge.style.display = 'inline-flex';
    if (state === 'video') {
      this.hdBadge.classList.add('fwe-lightbox__hd-badge--video');
      this.hdBadge.textContent = 'VIDEO';
    } else if (state === 'loading') {
      this.hdBadge.classList.add('fwe-lightbox__hd-badge--loading');
      this.hdBadge.textContent = 'HD...';
    } else if (state === 'ready') {
      this.hdBadge.classList.add('fwe-lightbox__hd-badge--ready');
      this.hdBadge.textContent = 'HD';
    }
  }

  private render(): void {
    const current = this.items[this.currentIndex];
    if (!current) return;

    this.counter.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
    this.prevBtn.style.display = this.items.length > 1 ? 'inline-flex' : 'none';
    this.nextBtn.style.display = this.items.length > 1 ? 'inline-flex' : 'none';

    if (current.externalUrl) {
      this.externalBtn.href = current.externalUrl;
      this.externalBtn.style.display = 'inline-flex';
    } else {
      this.externalBtn.style.display = 'none';
    }

    if (current.type === 'video') {
      this.image.style.display = 'none';
      this.spinner.style.display = 'none';
      this.video.style.display = 'block';
      this.updateHdBadge('video');
      if (this.video.src !== current.src) {
        this.video.src = current.src;
        this.video.load();
      }
      void this.video.play().catch(() => undefined);
    } else {
      this.video.pause();
      this.video.style.display = 'none';
      this.image.style.display = 'block';
      this.spinner.style.display = 'none';
      this.image.alt = current.alt;

      const hd = current.hdSrc;
      if (hd && this.preloadedHd.has(hd)) {
        this.image.src = hd;
        this.updateHdBadge('ready');
      } else if (hd) {
        this.image.src = current.src;
        this.updateHdBadge('loading');
        const hdImage = new Image();
        hdImage.src = hd;
        hdImage.onload = () => {
          this.preloadedHd.add(hd);
          if (this.items[this.currentIndex] === current && this.dialog.open) {
            this.image.src = hd;
            this.updateHdBadge('ready');
          }
        };
        hdImage.onerror = () => {
          if (this.items[this.currentIndex] === current && this.dialog.open) {
            this.updateHdBadge('none');
          }
        };
      } else {
        this.image.src = current.src;
        this.updateHdBadge('ready');
      }
      this.image.style.opacity = '1';
    }
  }

  public updateLanguage(): void {
    this.dialog.setAttribute('aria-label', t('lightboxAria'));
    this.zoomOutBtn.title = t('zoomOutTitle');
    this.zoomOutBtn.setAttribute('aria-label', t('zoomOutAria'));
    this.zoomLevelText.title = t('zoomResetTitle');
    this.zoomLevelText.setAttribute('aria-label', t('zoomResetAria'));
    this.zoomInBtn.title = t('zoomInTitle');
    this.zoomInBtn.setAttribute('aria-label', t('zoomInAria'));
    this.resetBtn.title = t('fitScreenTitle');
    this.resetBtn.setAttribute('aria-label', t('fitScreenAria'));
    this.externalBtn.title = t('openExternalTitle');
    this.externalBtn.setAttribute('aria-label', t('openExternalAria'));
    this.closeBtn.title = t('closeLightboxTitle');
    this.closeBtn.setAttribute('aria-label', t('closeLightboxAria'));
    this.prevBtn.title = t('prevMediaTitle');
    this.prevBtn.setAttribute('aria-label', t('prevMediaAria'));
    this.nextBtn.title = t('nextMediaTitle');
    this.nextBtn.setAttribute('aria-label', t('nextMediaAria'));
  }

  public bindTrigger(anchor: HTMLAnchorElement, items: LightboxMedia[], index: number): void {
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(items, index, anchor);
    });
  }
}

function prepareMedia(
  article: ParsedArticle,
  transaction: DomTransaction,
  mediaExpanded: boolean = true,
  lightbox?: ImageLightbox,
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
  const lightboxMedia: LightboxMedia[] = ordered.map((item) => {
    const resolved = resolveMediaSource(item);
    return {
      type: resolved.type,
      src: resolved.src,
      hdSrc: resolved.hdSrc,
      externalUrl: item.element.href || undefined,
      alt: item.image?.alt || article.title || 'Screenshot preview',
    };
  });

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
    if (lightbox) {
      lightbox.bindTrigger(item.element, lightboxMedia, index);
    }
  });
  return media;
}

function getRatingColorClass(percent: number): string {
  if (percent >= 90) return 'fwe-rating--overwhelming';
  if (percent >= 70) return 'fwe-rating--positive';
  if (percent >= 40) return 'fwe-rating--mixed';
  return 'fwe-rating--negative';
}

function getMetaColorClass(score: number): string {
  if (score >= 75) return 'fwe-rating--meta-green';
  if (score >= 50) return 'fwe-rating--meta-yellow';
  return 'fwe-rating--meta-red';
}

export class RatingPopover {
  private readonly element: HTMLElement;
  private readonly title: HTMLElement;
  private readonly appIdBadge: HTMLElement;
  private readonly refreshBtn: HTMLButtonElement;
  private readonly steamSection: HTMLElement;
  private readonly scorePercent: HTMLElement;
  private readonly scoreDesc: HTMLElement;
  private readonly scoreBarFill: HTMLElement;
  private readonly reviewsCount: HTMLElement;
  private readonly metascoreRow: HTMLElement;
  private readonly metascoreValue: HTMLElement;
  private readonly unmatchedSection: HTMLElement;
  private readonly unmatchedTextEl: HTMLElement;
  private readonly actions: HTMLElement;
  private readonly steamLink: HTMLAnchorElement;
  private readonly steamDbLink: HTMLAnchorElement;
  private readonly metacriticLink: HTMLAnchorElement;
  private readonly unmatchedRetryBtn: HTMLButtonElement;
  public currentAnchor: HTMLElement | null = null;
  private onRefreshCallback: (() => void) | null = null;
  private currentData: GameRatingData | null = null;
  private unmatchedKind: 'unmatched' | 'unavailable' = 'unmatched';

  /** 点在弹层与当前锚点之外即关闭；触屏没有 hover，这是唯一的「失焦」信号。 */
  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (this.element.contains(target) || this.currentAnchor?.contains(target)) return;
    this.hide();
  };

  private readonly onEscapeKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.hide();
  };

  constructor() {
    this.element = element('div', 'fwe-rating-popover');
    this.element.setAttribute('role', 'tooltip');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.style.setProperty('display', 'none');

    const header = element('div', 'fwe-rating-popover__header');
    this.title = element('div', 'fwe-rating-popover__title');

    const headerRight = element('div', 'fwe-rating-popover__header-right');
    this.appIdBadge = element('span', 'fwe-rating-popover__appid');
    this.refreshBtn = element('button', 'fwe-rating-popover__refresh-btn');
    this.refreshBtn.type = 'button';
    this.refreshBtn.setAttribute('title', t('ratingRefreshTitle'));
    this.refreshBtn.setAttribute('aria-label', t('ratingRefreshAria'));
    this.refreshBtn.append(createIcon('refresh', 'fwe-rating-popover__refresh-icon'));
    this.refreshBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.triggerRefresh();
    });
    headerRight.append(this.appIdBadge, this.refreshBtn);
    header.append(this.title, headerRight);

    // Steam reviews section (matched)
    this.steamSection = element('div', 'fwe-rating-popover__section');
    const steamHeadline = element('div', 'fwe-rating-popover__headline');
    this.scorePercent = element('span', 'fwe-rating-popover__percent');
    this.scoreDesc = element('span', 'fwe-rating-popover__desc');
    steamHeadline.append(this.scorePercent, this.scoreDesc);

    const scoreBar = element('div', 'fwe-rating-popover__bar');
    this.scoreBarFill = element('div', 'fwe-rating-popover__bar-fill');
    scoreBar.append(this.scoreBarFill);

    this.reviewsCount = element('div', 'fwe-rating-popover__count');
    this.steamSection.append(steamHeadline, scoreBar, this.reviewsCount);

    // Metascore section
    this.metascoreRow = element('div', 'fwe-rating-popover__metascore-row');
    const metaLabel = element('span', 'fwe-rating-popover__meta-label', 'Metascore');
    this.metascoreValue = element('span', 'fwe-rating-popover__meta-val');
    this.metascoreRow.append(metaLabel, this.metascoreValue);

    // Unmatched notification section
    this.unmatchedSection = element('div', 'fwe-rating-popover__unmatched-section');
    this.unmatchedTextEl = element(
      'div',
      'fwe-rating-popover__unmatched-text',
      t('ratingUnmatchedDesc'),
    );
    this.unmatchedSection.append(this.unmatchedTextEl);

    // Action buttons list
    this.actions = element('div', 'fwe-rating-popover__actions');
    this.steamLink = element('a', 'fwe-rating-popover__btn', t('steamStore'));
    this.steamLink.target = '_blank';
    this.steamLink.rel = 'noopener noreferrer';

    this.steamDbLink = element('a', 'fwe-rating-popover__btn', t('steamDb'));
    this.steamDbLink.target = '_blank';
    this.steamDbLink.rel = 'noopener noreferrer';

    this.metacriticLink = element('a', 'fwe-rating-popover__btn', 'Metacritic');
    this.metacriticLink.target = '_blank';
    this.metacriticLink.rel = 'noopener noreferrer';

    this.unmatchedRetryBtn = element(
      'button',
      'fwe-rating-popover__btn fwe-rating-popover__btn--primary',
      t('queryAgain'),
    );
    this.unmatchedRetryBtn.type = 'button';
    this.unmatchedRetryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.triggerRefresh();
    });

    this.actions.append(
      this.steamLink,
      this.steamDbLink,
      this.metacriticLink,
      this.unmatchedRetryBtn,
    );

    this.element.append(
      header,
      this.steamSection,
      this.metascoreRow,
      this.unmatchedSection,
      this.actions,
    );
    document.body.append(this.element);

    document.addEventListener('pointerdown', this.onDocumentPointerDown);
    document.addEventListener('keydown', this.onEscapeKey);
  }

  private triggerRefresh(): void {
    this.refreshBtn.disabled = true;
    this.unmatchedRetryBtn.disabled = true;
    this.refreshBtn.querySelector('.fwe-rating-popover__refresh-icon')?.classList.add('fwe-spin');
    if (this.onRefreshCallback) {
      this.onRefreshCallback();
    }
    this.hide();
  }

  private positionAt(anchor: HTMLElement): void {
    this.element.style.removeProperty('display');
    this.element.setAttribute('aria-hidden', 'false');

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = this.element.getBoundingClientRect();

    let top = anchorRect.bottom + 8 + window.scrollY;
    // 右对齐锚点的右边：徽章在视口右侧时，弹层右边贴徽章右边而不是被钳到视口边缘。
    let left = anchorRect.right - popoverRect.width + window.scrollX;

    const maxLeft = window.innerWidth + window.scrollX - popoverRect.width - 16;
    left = Math.min(Math.max(left, window.scrollX + 16), maxLeft);

    if (
      anchorRect.bottom + popoverRect.height + 16 > window.innerHeight &&
      anchorRect.top - popoverRect.height - 8 > 0
    ) {
      top = anchorRect.top - popoverRect.height - 8 + window.scrollY;
    }

    this.element.style.top = `${Math.round(top)}px`;
    this.element.style.left = `${Math.round(left)}px`;
    this.element.classList.add('fwe-rating-popover--visible');
  }

  show(anchor: HTMLElement, data: GameRatingData, onRefresh?: () => void): void {
    // 切换锚点时先复位旧徽章：键盘 Tab + Enter（无 pointerdown）不会走 hide()。
    if (this.currentAnchor !== anchor) {
      this.currentAnchor?.setAttribute('aria-expanded', 'false');
    }
    this.currentAnchor = anchor;
    this.currentData = data;
    this.onRefreshCallback = onRefresh ?? null;
    this.refreshBtn.disabled = false;
    this.refreshBtn
      .querySelector('.fwe-rating-popover__refresh-icon')
      ?.classList.remove('fwe-spin');

    // Show matched rating view
    this.steamSection.style.removeProperty('display');
    this.unmatchedSection.style.setProperty('display', 'none');
    this.unmatchedRetryBtn.style.setProperty('display', 'none');

    this.title.textContent = data.name;
    this.appIdBadge.textContent = `AppID: ${data.appId}`;
    this.scorePercent.textContent = `${data.positivePercent}%`;
    this.scorePercent.className = `fwe-rating-popover__percent ${getRatingColorClass(data.positivePercent)}`;
    this.scoreDesc.textContent = translateScoreDesc(data.scoreDesc, getActiveLanguage());

    this.scoreBarFill.style.width = `${Math.max(5, Math.min(100, data.positivePercent))}%`;
    this.scoreBarFill.className = `fwe-rating-popover__bar-fill ${getRatingColorClass(data.positivePercent)}`;

    this.reviewsCount.textContent = t('reviewsSummary', {
      total: data.totalReviews.toLocaleString(),
      positive: data.totalPositive.toLocaleString(),
      negative: data.totalNegative.toLocaleString(),
    });

    if (typeof data.metascore === 'number') {
      this.metascoreRow.style.removeProperty('display');
      this.metascoreValue.textContent = `${data.metascore}/100`;
      this.metascoreValue.className = `fwe-rating-popover__meta-val ${getMetaColorClass(data.metascore)}`;
      this.metacriticLink.style.removeProperty('display');
      this.metacriticLink.href =
        data.metacriticUrl || `https://www.metacritic.com/search/${encodeURIComponent(data.name)}/`;
    } else {
      this.metascoreRow.style.setProperty('display', 'none');
      this.metacriticLink.style.setProperty('display', 'none');
    }

    this.steamLink.textContent = t('steamStore');
    this.steamLink.href = data.steamUrl;
    this.steamLink.style.removeProperty('display');

    this.steamDbLink.textContent = t('steamDb');
    this.steamDbLink.href = data.steamDbUrl;
    this.steamDbLink.style.removeProperty('display');

    this.positionAt(anchor);
  }

  showUnmatched(anchor: HTMLElement, title: string, onRefresh?: () => void): void {
    this.showFallback(anchor, title, 'unmatched', onRefresh);
  }

  showUnavailable(anchor: HTMLElement, title: string, onRefresh?: () => void): void {
    this.showFallback(anchor, title, 'unavailable', onRefresh);
  }

  private showFallback(
    anchor: HTMLElement,
    title: string,
    kind: 'unmatched' | 'unavailable',
    onRefresh?: () => void,
  ): void {
    // 切换锚点时先复位旧徽章：键盘 Tab + Enter（无 pointerdown）不会走 hide()。
    if (this.currentAnchor !== anchor) {
      this.currentAnchor?.setAttribute('aria-expanded', 'false');
    }
    this.currentAnchor = anchor;
    this.currentData = null;
    this.unmatchedKind = kind;
    this.onRefreshCallback = onRefresh ?? null;
    this.refreshBtn.disabled = false;
    this.unmatchedRetryBtn.disabled = false;
    this.refreshBtn
      .querySelector('.fwe-rating-popover__refresh-icon')
      ?.classList.remove('fwe-spin');

    // Hide matched view, show unmatched view
    this.steamSection.style.setProperty('display', 'none');
    this.metascoreRow.style.setProperty('display', 'none');
    this.metacriticLink.style.setProperty('display', 'none');
    this.unmatchedSection.style.removeProperty('display');
    this.unmatchedRetryBtn.style.removeProperty('display');

    const cleanTitle = cleanTitleBase(title);
    this.title.textContent = cleanTitle || title;
    this.appIdBadge.textContent = this.getFallbackBadgeText();
    this.unmatchedTextEl.textContent =
      kind === 'unavailable' ? t('ratingUnavailableDesc') : t('ratingUnmatchedDesc');

    this.steamLink.textContent = t('steamSearch');
    this.steamLink.href = `https://store.steampowered.com/search/?term=${encodeURIComponent(cleanTitle || title)}`;
    this.steamLink.style.removeProperty('display');

    this.steamDbLink.textContent = t('steamDbSearch');
    this.steamDbLink.href = `https://steamdb.info/search/?a=app&q=${encodeURIComponent(cleanTitle || title)}`;
    this.steamDbLink.style.removeProperty('display');

    this.positionAt(anchor);
  }

  updateLanguage(): void {
    this.refreshBtn.setAttribute('title', t('ratingRefreshTitle'));
    this.refreshBtn.setAttribute('aria-label', t('ratingRefreshAria'));
    this.unmatchedTextEl.textContent =
      this.unmatchedKind === 'unavailable' ? t('ratingUnavailableDesc') : t('ratingUnmatchedDesc');
    this.unmatchedRetryBtn.textContent = t('queryAgain');
    if (this.currentData) {
      this.scoreDesc.textContent = translateScoreDesc(
        this.currentData.scoreDesc,
        getActiveLanguage(),
      );
      this.reviewsCount.textContent = t('reviewsSummary', {
        total: this.currentData.totalReviews.toLocaleString(),
        positive: this.currentData.totalPositive.toLocaleString(),
        negative: this.currentData.totalNegative.toLocaleString(),
      });
      this.steamLink.textContent = t('steamStore');
      this.steamDbLink.textContent = t('steamDb');
    } else {
      this.appIdBadge.textContent = this.getFallbackBadgeText();
      this.steamLink.textContent = t('steamSearch');
      this.steamDbLink.textContent = t('steamDbSearch');
    }
  }

  private getFallbackBadgeText(): string {
    return this.unmatchedKind === 'unavailable'
      ? t('ratingUnavailableText')
      : t('ratingUnmatchedText');
  }

  hide(): void {
    this.element.classList.remove('fwe-rating-popover--visible');
    this.element.style.setProperty('display', 'none');
    this.element.setAttribute('aria-hidden', 'true');
    this.currentAnchor?.setAttribute('aria-expanded', 'false');
    this.currentAnchor = null;
  }

  destroy(): void {
    document.removeEventListener('pointerdown', this.onDocumentPointerDown);
    document.removeEventListener('keydown', this.onEscapeKey);
    this.hide();
    this.element.remove();
  }
}

function renderLoadingBadge(container: HTMLElement): void {
  container.innerHTML = '';
  container.classList.remove('fwe-rating-container--empty');

  const badge = element('div', 'fwe-rating-badge fwe-rating-badge--loading');
  badge.setAttribute('aria-label', t('ratingLoadingAria'));
  badge.title = t('ratingLoadingTitle');

  const pill = element('span', 'fwe-rating-pill fwe-rating-pill--loading');
  pill.append(createIcon('spinner', 'fwe-rating-icon fwe-spin'));
  pill.append(element('span', 'fwe-rating-loading-text', t('ratingLoadingText')));
  badge.append(pill);
  container.append(badge);
}

function renderEmptyBadge(container: HTMLElement): void {
  container.innerHTML = '';
  container.classList.add('fwe-rating-container--empty');
  container.style.removeProperty('display');
}

function renderUnmatchedBadge(
  container: HTMLElement,
  article: ParsedArticle,
  popover: RatingPopover,
  triggerRefresh: () => void,
  kind: 'unmatched' | 'unavailable' = 'unmatched',
): void {
  container.innerHTML = '';
  container.classList.remove('fwe-rating-container--empty');

  const badge = element('div', 'fwe-rating-badge fwe-rating-badge--unmatched');
  badge.setAttribute('role', 'button');
  badge.setAttribute('tabindex', '0');
  badge.setAttribute(
    'aria-label',
    t(kind === 'unavailable' ? 'ratingUnavailableAria' : 'ratingUnmatchedAria', {
      title: article.title,
    }),
  );
  badge.title = t(kind === 'unavailable' ? 'ratingUnavailableTitle' : 'ratingUnmatchedTitle');

  const pill = element('span', 'fwe-rating-pill fwe-rating-pill--unmatched');
  pill.append(createIcon('help', 'fwe-rating-icon fwe-rating-icon--unmatched'));
  pill.append(
    element(
      'span',
      'fwe-rating-unmatched-text',
      t(kind === 'unavailable' ? 'ratingUnavailableText' : 'ratingUnmatchedText'),
    ),
  );
  badge.append(pill);

  const toggle = (): void => {
    if (popover.currentAnchor === badge) {
      popover.hide();
      badge.setAttribute('aria-expanded', 'false');
      return;
    }
    badge.setAttribute('aria-expanded', 'true');
    if (kind === 'unavailable') {
      popover.showUnavailable(badge, article.title, triggerRefresh);
    } else {
      popover.showUnmatched(badge, article.title, triggerRefresh);
    }
  };

  badge.setAttribute('aria-expanded', 'false');
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });
  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    }
  });

  container.append(badge);
}

function renderSuccessBadge(
  container: HTMLElement,
  data: GameRatingData,
  popover: RatingPopover,
  triggerRefresh: () => void,
): void {
  container.innerHTML = '';
  container.classList.remove('fwe-rating-container--empty');

  const localizedDesc = translateScoreDesc(data.scoreDesc, getActiveLanguage());
  const badge = element('div', 'fwe-rating-badge');
  badge.setAttribute('role', 'button');
  badge.setAttribute('tabindex', '0');
  badge.setAttribute(
    'aria-label',
    t('cardRatingAria', {
      name: data.name,
      percent: data.positivePercent,
      scoreDesc: localizedDesc,
    }),
  );

  const steamPill = element(
    'span',
    `fwe-rating-pill fwe-rating-pill--steam ${getRatingColorClass(data.positivePercent)}`,
  );
  steamPill.append(createIcon('steam', 'fwe-rating-icon'));
  steamPill.append(element('span', 'fwe-rating-percent', `${data.positivePercent}%`));
  badge.append(steamPill);

  // The Metacritic score deliberately stays out of the card corner: a second
  // number there made "what is this game rated" ambiguous. It is still reachable
  // from the RatingPopover, which is the single rating slot on every page.

  const toggle = (): void => {
    if (popover.currentAnchor === badge) {
      popover.hide();
      badge.setAttribute('aria-expanded', 'false');
      return;
    }
    badge.setAttribute('aria-expanded', 'true');
    popover.show(badge, data, triggerRefresh);
  };

  badge.setAttribute('aria-expanded', 'false');
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    }
  });

  container.append(badge);
}

export async function loadRatingForBadge(
  container: HTMLElement,
  article: ParsedArticle,
  popover: RatingPopover,
  forceRefresh = false,
): Promise<void> {
  renderLoadingBadge(container);

  const triggerRefresh = () => {
    void loadRatingForBadge(container, article, popover, true);
  };

  try {
    const result = await globalRatingQueue.add(
      () => getGameRating(article.title, article.root, forceRefresh),
      forceRefresh ? undefined : article.title.trim().toLowerCase(),
    );

    if (result.status !== 'ready' || !result.data) {
      renderUnmatchedBadge(
        container,
        article,
        popover,
        triggerRefresh,
        result.status === 'unavailable' ? 'unavailable' : 'unmatched',
      );
      return;
    }

    const data = result.data;

    renderSuccessBadge(container, data, popover, triggerRefresh);
  } catch {
    renderUnmatchedBadge(container, article, popover, triggerRefresh, 'unavailable');
  }
}

/**
 * The Tolstoy comments plugin fills `.tolstoycomments-cc` spans once at init
 * via `getElementsByClassName`, so cards inserted by infinite scroll never get
 * their count. This function asks the plugin's live `comment.update()` to
 * rescan the document and refill only the spans that are still empty — avoiding
 * a no-op request when every span already has text, or when the plugin never
 * loaded.
 */
export function refillThirdPartyCommentCounts(): void {
  const spans = document.querySelectorAll<HTMLElement>('.tolstoycomments-cc');
  if (spans.length === 0) {
    return;
  }

  const emptyCount = [...spans].filter((span) => span.textContent?.trim() === '').length;
  if (emptyCount === 0) {
    return;
  }

  const maybePlugin = window as unknown as {
    tolstoycomments?: { comment?: { update?: () => Promise<unknown> } };
  };
  const maybeUpdate = maybePlugin.tolstoycomments?.comment?.update;
  if (typeof maybeUpdate !== 'function') {
    return;
  }

  try {
    const result = maybeUpdate.call(maybePlugin.tolstoycomments?.comment);
    /*
     * The plugin returns a promise in some environments. Attach a no-op catch
     * so a rejection does not leak as an unhandled rejection — this function
     * is fire-and-forget from `loadNextPage()` and never awaits.
     */
    if (result && typeof result.catch === 'function') {
      result.catch(() => {
        /* silence: a single failed refill is not worth bubbling up */
      });
    }
  } catch {
    /* silence: a synchronous throw from the plugin should not break infinite scroll */
  }
}

function createRatingBadge(
  article: ParsedArticle,
  popover: RatingPopover,
  ratingObserver: IntersectionObserver | null,
): HTMLElement {
  const container = element('div', 'fwe-rating-container');
  renderLoadingBadge(container);

  container.dataset.title = article.title;

  if (ratingObserver) {
    renderEmptyBadge(container);
    ratingObserver.observe(container);
  } else {
    void loadRatingForBadge(container, article, popover);
  }

  return container;
}

function createMetaChip(icon: Parameters<typeof createIcon>[0], ...content: Node[]): HTMLElement {
  const chip = element('span', 'fwe-meta-chip');
  chip.append(createIcon(icon, 'fwe-meta-chip__icon'), ...content);
  return chip;
}

/**
 * Moves the meaningful children of an original `.entry-meta` span (categories,
 * byline, comments link) into an enhanced meta chip. Whitespace-only text nodes
 * stay behind so the transaction can restore the original markup byte for byte.
 * Anchors keep their `href`, and nodes such as `.tolstoycomments-cc` keep their
 * identity so third-party scripts can still inject into them.
 */
function relocateMetaContent(
  source: HTMLElement,
  chip: HTMLElement,
  transaction: DomTransaction,
): boolean {
  let moved = false;
  [...source.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && !normalizeText(node.textContent)) return;
    transaction.move(node, chip);
    moved = true;
  });
  return moved;
}

/**
 * Re-renders a date chip's label.
 *
 * The chip always carries the absolute date; posts inside the recent window get
 * the relative wording prefixed so a stream reader can see freshness at a
 * glance. Older posts show the date alone — `formatRelativeTime` would keep
 * inventing "3mo ago" style wording, which is noise next to a full date.
 */
function refreshDateChip(chip: HTMLElement, lang: SupportedLanguage): void {
  const label = chip.querySelector<HTMLElement>('.fwe-meta-chip__date');
  if (!label) return;

  const absolute = chip.dataset.fweDateAbsolute ?? '';
  const iso = chip.dataset.dateIso;
  const relative = iso ? formatRecentRelativeTime(new Date(iso), new Date(), lang) : '';
  label.textContent = relative ? t('dateChipRecent', { relative, absolute }, lang) : absolute;
}

function addArticleMeta(
  article: ParsedArticle,
  transaction: DomTransaction,
  popover?: RatingPopover,
  ratingObserver?: IntersectionObserver | null,
): void {
  const header = article.header;
  if (!header || header.querySelector('.fwe-article-meta')) return;
  const timeNode = header.querySelector<HTMLTimeElement>('time');
  const originalDate = header.querySelector<HTMLElement>('.entry-date') || timeNode;
  if (!originalDate && !timeNode) return;

  const displayDateText = normalizeText(timeNode?.textContent || originalDate?.textContent);
  const parsedDate = parseArticleDate(originalDate, header);

  // The date chip keeps its own label node so a language switch can re-render the
  // wording without rebuilding the chip (and losing the calendar icon).
  const dateLabel = element('span', 'fwe-meta-chip__date', displayDateText);
  const dateChip = createMetaChip('calendar', dateLabel);
  dateChip.dataset.fweDateAbsolute = displayDateText;
  if (parsedDate) dateChip.dataset.dateIso = parsedDate.toISOString();

  const meta = element('div', 'fwe-article-meta');
  meta.append(dateChip);
  transaction.insert(meta, header);
  refreshDateChip(dateChip, getActiveLanguage());

  const metaSources: Array<[string, Parameters<typeof createIcon>[0]]> = [
    ['.cat-links', 'tag'],
    ['.byline', 'user'],
    ['.comments-link', 'comment'],
  ];
  for (const [selector, icon] of metaSources) {
    const source = header.querySelector<HTMLElement>(selector);
    if (!source) continue;
    const chip = createMetaChip(icon);
    if (relocateMetaContent(source, chip, transaction)) meta.append(chip);
  }

  const title = header.querySelector<HTMLElement>('.entry-title');

  // The pink paw award belongs beside the title it was awarded to. It used to sit
  // in the score corner, where it competed with the rating for the one slot a
  // reader scans first.
  if (title && article.hasPinkPawAward && !title.querySelector('.fwe-paw-badge')) {
    const pawBadge = element('span', 'fwe-paw-badge', t('pinkPawBadge'));
    pawBadge.title = 'FitGirl Personal Pink Paw Award';
    title.append(pawBadge);
  }

  // The score corner now holds the rating alone; the relative time moved into the
  // date chip, where it sits with the rest of the post's metadata.
  if (title && popover && article.kind === 'game' && !header.querySelector('.fwe-header-right')) {
    const rightBox = element('div', 'fwe-header-right');
    rightBox.append(createRatingBadge(article, popover, ratingObserver ?? null));
    transaction.insert(rightBox, header);
  }
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
  lightbox?: ImageLightbox,
  gameModal?: GameDetailModal,
  ratingPopover?: RatingPopover,
  ratingObserver?: IntersectionObserver | null,
): void {
  if (!article.entry || article.root.hasAttribute('data-fwe-ready')) return;
  transaction.setAttribute(article.root, 'data-fwe-ready', 'true');
  transaction.addClass(
    article.root,
    article.pageKind === 'single' ? 'fwe-detail' : 'fwe-game-card',
  );
  const isSearch = document.body.classList.contains('search-results');
  if (isSearch) transaction.addClass(article.root, 'fwe-search-card');
  addArticleMeta(article, transaction, ratingPopover, ratingObserver);
  if (isSearch) hideSearchSource(article, transaction);
  else {
    if (article.infoBlock) transaction.addClass(article.infoBlock, 'fwe-source-hidden');
    if (article.repackHeading) transaction.addClass(article.repackHeading, 'fwe-source-hidden');
    article.wrapperContainers?.forEach((wrapper) => {
      transaction.addClass(wrapper, 'fwe-source-hidden');
    });
  }

  const isDetail = article.pageKind === 'single';
  const layout = element('div', 'fwe-game-layout');
  layout.append(createSummaryPanel(article));
  const media = prepareMedia(article, transaction, isDetail ? true : mediaExpanded, lightbox);
  if (media) layout.append(media);
  transaction.insert(layout, article.entry, article.entry.firstChild);

  if (isDetail) {
    const detailSections = createDetailSections(article, transaction);
    if (detailSections.childElementCount > 0) transaction.insert(detailSections, article.entry);
  } else {
    const payload = createCardPayload(article, transaction);
    const actions = createCardActions(article, payload, gameModal);
    if (actions.childElementCount > 0) {
      transaction.insert(actions, article.entry);
      transaction.insert(payload, article.root);
    }
  }
}

function transformUpcoming(article: ParsedArticle, transaction: DomTransaction): void {
  if (!article.entry || article.root.hasAttribute('data-fwe-ready')) return;
  transaction.setAttribute(article.root, 'data-fwe-ready', 'true');
  transaction.addClass(article.root, 'fwe-upcoming');
  const items = parseUpcomingItems(article.entry);
  const details = element('details', 'fwe-upcoming__details');
  const summary = element('summary', 'fwe-upcoming__summary');
  const eyebrow = element('span', 'fwe-upcoming__eyebrow', 'Upcoming Repacks');
  summary.append(eyebrow, createIcon('chevron'));

  if (article.titleLink?.href) {
    const detailsLink = element('a', 'fwe-upcoming__details-link');
    detailsLink.href = article.titleLink.href;
    detailsLink.dataset.fweUpcomingTitle = article.title || 'Upcoming Repacks';
    detailsLink.textContent = t('upcomingDetails');
    detailsLink.setAttribute(
      'aria-label',
      t('upcomingDetailsAria', { title: article.title || 'Upcoming Repacks' }),
    );
    detailsLink.addEventListener('click', (event) => event.stopPropagation());
    summary.append(detailsLink);
  }
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
    addCardKindLabel(article, transaction, t('cardKindDigest'));
    transformLegacySpoilers(article, transaction);
  } else if (title === 'popular repacks') {
    transaction.addClass(article.root, 'fwe-directory-popular');
    preparePopularDirectory(article, transaction);
  } else if (
    /all my repacks.*a.?z/i.test(article.title) ||
    /pink paw award/i.test(article.title) ||
    Boolean(article.entry?.querySelector('.lcp_catlist'))
  ) {
    transaction.addClass(article.root, 'fwe-directory-az');
  } else if (title === 'updates list') {
    transaction.addClass(article.root, 'fwe-directory-updates');
    transformLegacySpoilers(article, transaction);
  } else {
    transaction.addClass(article.root, 'fwe-notice');
    // Anything left is a site notice rather than a game, and it used to look like
    // a game card until the reader opened it.
    addCardKindLabel(article, transaction, t('cardKindNotice'));
  }
}

/** 在 special 卡内容顶部放一枚种类标签，说明「这不是一款游戏」 */
function addCardKindLabel(
  article: ParsedArticle,
  transaction: DomTransaction,
  label: string,
): void {
  if (!article.entry || article.entry.querySelector('.fwe-card-kind')) return;
  const kind = element('span', 'fwe-card-kind', label);
  transaction.insert(kind, article.entry, article.entry.firstChild);
}

function createSearchForm(): {
  form: HTMLFormElement;
  input: HTMLInputElement;
  submit: HTMLButtonElement;
} {
  const form = element('form', 'fwe-search');
  form.method = 'get';
  form.action = `${window.location.origin}/`;
  form.setAttribute('role', 'search');
  const input = element('input', 'fwe-search__input');
  input.type = 'search';
  input.name = 's';
  input.placeholder = t('searchPlaceholder');
  input.setAttribute('aria-label', t('searchAria'));
  input.value = new URLSearchParams(window.location.search).get('s') ?? '';
  const submit = element('button', 'fwe-search__submit');
  submit.type = 'submit';
  submit.setAttribute('aria-label', t('searchSubmitAria'));
  submit.append(createIcon('search'));
  form.append(input, submit);
  return { form, input, submit };
}

function createPopularDialog(items: PopularItem[]): HTMLDialogElement {
  const dialog = element('dialog', 'fwe-popular-dialog');
  dialog.setAttribute('aria-labelledby', 'fwe-popular-title');
  const header = element('header', 'fwe-dialog__header');
  const heading = element('h2', '', t('popularHeading'));
  heading.id = 'fwe-popular-title';
  const close = element('button', 'fwe-icon-button');
  close.type = 'button';
  close.setAttribute('aria-label', t('popularCloseAria'));
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

/**
 * Loading placeholder for the next page of the stream.
 *
 * The spinner it replaces said "something is happening" without saying what, and
 * it collapsed the stream to a 4rem strip while the request was in flight — so
 * when the real cards landed, everything below jumped. Cards shaped like the
 * real ones answer both: the reader sees what is coming, and the row they
 * occupy is the row the content will fill.
 *
 * Restraint applies here too: the placeholder is drawn with `--fwe-line` alone,
 * because pink is reserved for the primary action.
 */
function createSkeletonCard(): HTMLElement {
  const card = element('article', 'fwe-skeleton-card');
  // Placeholders carry no information, so they stay out of the accessibility
  // tree instead of announcing a pile of empty boxes.
  card.setAttribute('aria-hidden', 'true');

  const header = element('div', 'fwe-skeleton-card__header');
  header.append(
    element('span', 'fwe-skeleton__block fwe-skeleton__title-line'),
    element('span', 'fwe-skeleton__block fwe-skeleton__title-line'),
  );

  const meta = element('div', 'fwe-skeleton-card__meta');
  meta.append(element('span', 'fwe-skeleton__block fwe-skeleton__meta-line'));

  const facts = element('div', 'fwe-skeleton-card__facts');
  for (let index = 0; index < 4; index += 1) {
    facts.append(element('div', 'fwe-skeleton__fact-row'));
  }

  const gallery = element('div', 'fwe-skeleton__block fwe-skeleton__gallery');

  const actions = element('div', 'fwe-skeleton__actions');
  actions.append(
    element('span', 'fwe-skeleton__block fwe-skeleton__action'),
    element('span', 'fwe-skeleton__block fwe-skeleton__action'),
  );

  card.append(header, meta, facts, gallery, actions);
  return card;
}

/**
 * Builds the whole loading state: one skeleton card per stream column, plus the
 * small line of text that says what is being waited for. The card count has to
 * match the column count, or the placeholder row will not line up with the row
 * the real cards land in.
 */
function createSkeletonGrid(columnCount: number): HTMLElement {
  const grid = element('div', 'fwe-skeleton');
  grid.style.setProperty('--fwe-skeleton-cols', String(columnCount));
  for (let index = 0; index < columnCount; index += 1) {
    grid.append(createSkeletonCard());
  }
  grid.append(element('p', 'fwe-skeleton__label', t('infiniteLoading')));
  return grid;
}

/*
 * M2 的页数记忆。基名与 `preferences.ts` 的既有偏好同一命名空间；sessionStorage
 * 不需要新的 @grant，且随标签页消亡，正好配「这次浏览滚到哪了」的语义。
 *
 * 后缀是列表根路径而不是当前 URL：`replaceState` 会把地址改写成 `/page/N/`，
 * 键若跟着跑，同一列表在 `/` 和 `/page/2/` 下就记成两本账，刷新后谁也补不上
 * 谁。查询串刻意不进键——它会被分页链接改写，而「键必须在 replaceState 之后
 * 依然稳定」是这条记忆唯一不能破的性质。
 */
const INFINITE_PAGES_KEY_PREFIX = 'fitgirl-web-enhanced:v1:infinite-pages:';

/** 列表根：剥掉路径末尾的 `/page/N/` 段 */
function listingRootPath(pathname: string): string {
  return pathname.replace(/\/page\/\d+\/?$/, '') || '/';
}

function rememberedPagesKey(): string {
  return `${INFINITE_PAGES_KEY_PREFIX}${listingRootPath(window.location.pathname)}`;
}

/**
 * 初始文档是第几页。
 *
 * 刷新可能直接落在 `/page/N/` 上——WordPress 会服务那一页的文章。此时已加载
 * 页数必须从 N 起算：若一律按 1 算，「补齐到记忆页数」会在用户已经看过的那一页
 * 后面再多抓一整页，刷新后的内容和刷新前完全对不上。
 */
function readInitialPageNumber(): number {
  const captured = /\/page\/(\d+)\/?$/.exec(window.location.pathname)?.[1];
  const page = captured === undefined ? 1 : Number.parseInt(captured, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/**
 * 记住的已加载页数。脏值（空串 / 非数字 / ≤0）一律回退成 1，即「不补齐」。
 */
function readRememberedPageCount(): number {
  try {
    const parsed = Number.parseInt(window.sessionStorage.getItem(rememberedPagesKey()) ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch {
    return 1;
  }
}

function writeRememberedPageCount(count: number): void {
  try {
    // 只往高处写：回落到第 1 页没有记忆价值，留着旧值反而会在下次刷新时误导
    if (count > 1) window.sessionStorage.setItem(rememberedPagesKey(), String(count));
  } catch {
    // sessionStorage 被禁用时静默跳过：URL 同步与加载本身都不依赖它
  }
}

function appendArchives(parent: HTMLElement, groups: ArchiveGroup[]): void {
  const section = element('section', 'fwe-archives');
  section.append(element('h2', '', t('archivesHeading')));
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
  const title = element('h2', '', t('browseHeading'));
  title.id = 'fwe-browse-title';
  const close = element('button', 'fwe-icon-button');
  close.type = 'button';
  close.setAttribute('aria-label', t('browseCloseAria'));
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
  private infiniteScroll: boolean;
  private showRatings: boolean;
  private language: SupportedLanguage;
  private theme: ThemeMode;
  private transaction: DomTransaction | null = null;
  private observer: MutationObserver | null = null;
  private videoObserver: IntersectionObserver | null = null;
  private infiniteObserver: IntersectionObserver | null = null;
  private ratingObserver: IntersectionObserver | null = null;
  private processing = false;
  private loadingNextPage = false;
  private hasNextPage = true;
  /**
   * M6：已加载文章的 id 增量集合。
   *
   * 替代原先每次 `loadNextPage()` 都 `document.querySelectorAll('article.hentry')`
   * 重建全量 Set——那个开销随页数线性增长。这里在 `processArticles()` 遍历时
   * 顺手累积，代价摊进本来就要走的那一遍。
   *
   * 关键：`.fwe-stream` 新建时必须重置。切回 original 会 `restore()` 掉整条流，
   * 再切回来时文章节点是全新的，旧 id 还留在集合里会把新文章判成重复而剔除掉。
   */
  private loadedArticleIds = new Set<string>();
  /** M2：已加载页数。初始文档算第 1 页，但刷新可能直接落在 `/page/N/` 上 */
  private loadedPageCount = readInitialPageNumber();
  /** M2：补齐只在每次文档加载时尝试一次，切模式不重复补 */
  private pagesRestoreStarted = false;
  private observerTimer: number | null = null;
  private readonly viewControl: HTMLDetailsElement;
  private readonly viewSummarySpan: HTMLElement;
  private readonly layoutLabel: HTMLElement;
  private readonly switchButton: HTMLButtonElement;
  private readonly mediaLabel: HTMLElement;
  private readonly mediaSwitchButton: HTMLButtonElement;
  private readonly infiniteLabel: HTMLElement;
  private readonly infiniteSwitchButton: HTMLButtonElement;
  private readonly ratingLabel: HTMLElement;
  private readonly ratingSwitchButton: HTMLButtonElement;
  private readonly clearRatingCacheButton: HTMLButtonElement;
  private readonly clearRatingCacheLabel: HTMLElement;
  private readonly clearRatingCacheStatus: HTMLElement;
  private readonly languageLabel: HTMLElement;
  private readonly enButton: HTMLButtonElement;
  private readonly zhButton: HTMLButtonElement;
  private readonly themeLabel: HTMLElement;
  private readonly lightThemeButton: HTMLButtonElement;
  private readonly darkThemeButton: HTMLButtonElement;
  private readonly systemThemeButton: HTMLButtonElement;
  private readonly popularButton: HTMLButtonElement;
  private readonly popularButtonText: Text;
  private readonly browseButton: HTMLButtonElement;
  private readonly browseButtonSpan: HTMLElement;
  private readonly popularDialog: HTMLDialogElement;
  private readonly browseDialog: HTMLDialogElement;
  private readonly backToTopButton: HTMLButtonElement;
  private readonly backToTopButtonSpan: HTMLElement;
  private readonly searchForm: HTMLFormElement;
  private readonly searchInput: HTMLInputElement;
  private readonly searchSubmit: HTMLButtonElement;
  private readonly lightbox: ImageLightbox;
  private readonly gameModal: GameDetailModal;
  private readonly ratingPopover: RatingPopover;
  private readonly hasPopularItems: boolean;
  private lastDialogTrigger: HTMLElement | null = null;
  private activeColCount = 2;
  private resizeListenerAttached = false;
  private backToTopVisibilityListenerAttached = false;
  private clearRatingCacheStatusTimer: number | null = null;
  /**
   * 上一篇/下一篇标签的文本节点。`applyLanguage()` 要重写这两枚文本，但
   * `localizePostNavigation()` 不能重跑一遍：它会二次插入箭头，并把已经本地化
   * 的文案当「原始内容」记进 DomTransaction，切回原站模式就还原成中文了。
   */
  private navPrevLabel: Text | null = null;
  private navNextLabel: Text | null = null;

  constructor() {
    this.mode = getFastStoredLayoutMode();
    this.mediaExpanded = getFastStoredMediaExpand();
    this.infiniteScroll = getFastStoredInfiniteScroll();
    this.showRatings = getFastStoredShowRatings();
    this.language = getFastStoredLanguage() ?? detectBrowserLanguage();
    setActiveLanguage(this.language);
    document.documentElement.dataset.fweLang = this.language;
    // The palette is resolved before any node is built so the very first paint
    // already carries it — same reason as `data-fwe-mode`.
    this.theme = getFastStoredTheme();
    document.documentElement.dataset.fweTheme = this.theme;

    this.lightbox = new ImageLightbox();
    this.gameModal = new GameDetailModal();
    this.ratingPopover = new RatingPopover();

    const popularItems = parsePopularItems(document.querySelector('#block-2'));
    this.hasPopularItems = popularItems.length > 0;
    this.popularDialog = createPopularDialog(popularItems);
    this.browseDialog = createBrowseDialog(
      parseNavigation(document.querySelector('#site-header-menu, #primary-navigation')),
      parseArchiveGroups(document.querySelector('.widget_archive')),
    );
    document.body.append(this.popularDialog, this.browseDialog);

    const search = createSearchForm();
    this.searchForm = search.form;
    this.searchInput = search.input;
    this.searchSubmit = search.submit;

    this.popularButton = element('button', 'fwe-popular-button');
    this.popularButton.type = 'button';
    this.popularButton.setAttribute('aria-label', t('popularAria', this.language));
    this.popularButtonText = document.createTextNode(t('popularBtn', this.language));
    this.popularButton.append(createIcon('popular'), this.popularButtonText);

    this.browseButton = element('button', 'fwe-browse-button');
    this.browseButton.type = 'button';
    this.browseButton.setAttribute('aria-label', t('browseAria', this.language));
    this.browseButtonSpan = element('span', '', t('browseBtn', this.language));
    this.browseButton.append(createIcon('menu'), this.browseButtonSpan);

    this.viewControl = element('details', 'fwe-view-control');
    const viewSummary = element('summary', 'fwe-view-control__trigger');
    this.viewSummarySpan = element('span', '', t('viewTrigger', this.language));
    viewSummary.append(createIcon('eye'), this.viewSummarySpan);
    const panel = element('div', 'fwe-view-control__panel');

    const layoutRow = element('div', 'fwe-view-control__row');
    this.layoutLabel = element('span', 'fwe-view-control__label', t('enhancedView', this.language));
    layoutRow.append(this.layoutLabel);
    this.switchButton = element('button', 'fwe-switch');
    this.switchButton.type = 'button';
    this.switchButton.setAttribute('role', 'switch');
    this.switchButton.setAttribute('aria-label', t('enhancedViewAria', this.language));
    this.switchButton.append(element('span', 'fwe-switch__thumb'));
    layoutRow.append(this.switchButton);

    const mediaRow = element('div', 'fwe-view-control__row');
    this.mediaLabel = element(
      'span',
      'fwe-view-control__label',
      t('expandScreenshots', this.language),
    );
    mediaRow.append(this.mediaLabel);
    this.mediaSwitchButton = element('button', 'fwe-switch');
    this.mediaSwitchButton.type = 'button';
    this.mediaSwitchButton.setAttribute('role', 'switch');
    this.mediaSwitchButton.setAttribute('aria-label', t('expandScreenshotsAria', this.language));
    this.mediaSwitchButton.append(element('span', 'fwe-switch__thumb'));
    mediaRow.append(this.mediaSwitchButton);

    const infiniteRow = element('div', 'fwe-view-control__row');
    this.infiniteLabel = element(
      'span',
      'fwe-view-control__label',
      t('infiniteScroll', this.language),
    );
    infiniteRow.append(this.infiniteLabel);
    this.infiniteSwitchButton = element('button', 'fwe-switch');
    this.infiniteSwitchButton.type = 'button';
    this.infiniteSwitchButton.setAttribute('role', 'switch');
    this.infiniteSwitchButton.setAttribute('aria-label', t('infiniteScrollAria', this.language));
    this.infiniteSwitchButton.append(element('span', 'fwe-switch__thumb'));
    infiniteRow.append(this.infiniteSwitchButton);

    const ratingRow = element('div', 'fwe-view-control__row');
    this.ratingLabel = element('span', 'fwe-view-control__label', t('showRatings', this.language));
    ratingRow.append(this.ratingLabel);
    this.ratingSwitchButton = element('button', 'fwe-switch');
    this.ratingSwitchButton.type = 'button';
    this.ratingSwitchButton.setAttribute('role', 'switch');
    this.ratingSwitchButton.setAttribute('aria-label', t('showRatingsAria', this.language));
    this.ratingSwitchButton.append(element('span', 'fwe-switch__thumb'));
    ratingRow.append(this.ratingSwitchButton);

    const clearRatingCacheRow = element(
      'div',
      'fwe-view-control__row fwe-view-control__row--action',
    );
    this.clearRatingCacheLabel = element(
      'span',
      'fwe-view-control__label',
      t('clearRatingCache', this.language),
    );
    this.clearRatingCacheButton = element('button', 'fwe-cache-clear-button');
    this.clearRatingCacheButton.type = 'button';
    this.clearRatingCacheButton.setAttribute(
      'aria-label',
      t('clearRatingCacheAria', this.language),
    );
    this.clearRatingCacheButton.append(
      createIcon('trash'),
      element('span', '', t('clearRatingCache', this.language)),
    );
    clearRatingCacheRow.append(this.clearRatingCacheLabel, this.clearRatingCacheButton);
    this.clearRatingCacheStatus = element('span', 'fwe-view-control__status');
    this.clearRatingCacheStatus.setAttribute('role', 'status');
    this.clearRatingCacheStatus.setAttribute('aria-live', 'polite');

    const langRow = element('div', 'fwe-view-control__row');
    this.languageLabel = element('span', 'fwe-view-control__label', t('language', this.language));
    langRow.append(this.languageLabel);

    const segmented = element('div', 'fwe-segmented fwe-segmented--lang');
    segmented.setAttribute('role', 'group');
    segmented.setAttribute('aria-label', t('languageAria', this.language));

    this.enButton = element(
      'button',
      `fwe-segmented__btn${this.language === 'en' ? ' fwe-segmented__btn--active' : ''}`,
      'EN',
    );
    this.enButton.type = 'button';
    this.enButton.setAttribute('aria-pressed', String(this.language === 'en'));

    this.zhButton = element(
      'button',
      `fwe-segmented__btn${this.language === 'zh-CN' ? ' fwe-segmented__btn--active' : ''}`,
      '中文',
    );
    this.zhButton.type = 'button';
    this.zhButton.setAttribute('aria-pressed', String(this.language === 'zh-CN'));

    segmented.append(this.enButton, this.zhButton);
    langRow.append(segmented);

    const themeRow = element('div', 'fwe-view-control__row');
    this.themeLabel = element('span', 'fwe-view-control__label', t('theme', this.language));
    themeRow.append(this.themeLabel);

    const themeSegmented = element('div', 'fwe-segmented fwe-segmented--theme');
    themeSegmented.setAttribute('role', 'group');
    themeSegmented.setAttribute('aria-label', t('themeAria', this.language));

    const themeOptions: Array<[ThemeMode, string]> = [
      ['light', t('themeLight', this.language)],
      ['dark', t('themeDark', this.language)],
      ['system', t('themeSystem', this.language)],
    ];
    for (const [value, label] of themeOptions) {
      const button = element(
        'button',
        `fwe-segmented__btn${this.theme === value ? ' fwe-segmented__btn--active' : ''}`,
        label,
      );
      button.type = 'button';
      button.dataset.theme = value;
      button.setAttribute('aria-pressed', String(this.theme === value));
      themeSegmented.append(button);
    }
    this.lightThemeButton = themeSegmented.children[0] as HTMLButtonElement;
    this.darkThemeButton = themeSegmented.children[1] as HTMLButtonElement;
    this.systemThemeButton = themeSegmented.children[2] as HTMLButtonElement;
    themeRow.append(themeSegmented);

    panel.append(
      layoutRow,
      mediaRow,
      infiniteRow,
      ratingRow,
      clearRatingCacheRow,
      this.clearRatingCacheStatus,
      langRow,
      themeRow,
    );
    this.viewControl.append(viewSummary, panel);
    this.mountControls();

    this.backToTopButton = element('button', 'fwe-back-to-top');
    this.backToTopButton.type = 'button';
    this.backToTopButton.setAttribute('aria-label', t('backToTopAria', this.language));
    this.backToTopButton.tabIndex = -1;
    this.backToTopButtonSpan = element('span', '', t('backToTop', this.language));
    this.backToTopButton.append(createIcon('arrowUp'), this.backToTopButtonSpan);
    document.body.append(this.backToTopButton);

    this.applyMode(this.mode);
    this.applyMediaExpand(this.mediaExpanded);
    this.applyInfiniteScroll(this.infiniteScroll);
    this.applyShowRatings(this.showRatings);

    this.switchButton.addEventListener(
      'click',
      () => void this.setMode(this.mode === 'enhanced' ? 'original' : 'enhanced'),
    );
    this.mediaSwitchButton.addEventListener(
      'click',
      () => void this.setMediaExpand(!this.mediaExpanded),
    );
    this.infiniteSwitchButton.addEventListener(
      'click',
      () => void this.setInfiniteScroll(!this.infiniteScroll),
    );
    this.ratingSwitchButton.addEventListener(
      'click',
      () => void this.setShowRatings(!this.showRatings),
    );
    this.clearRatingCacheButton.addEventListener('click', () => this.clearRatingCache());
    this.backToTopButton.addEventListener('click', () => this.scrollToTop());
    this.enButton.addEventListener('click', () => void this.setLanguage('en'));
    this.zhButton.addEventListener('click', () => void this.setLanguage('zh-CN'));
    this.lightThemeButton.addEventListener('click', () => void this.setTheme('light'));
    this.darkThemeButton.addEventListener('click', () => void this.setTheme('dark'));
    this.systemThemeButton.addEventListener('click', () => void this.setTheme('system'));
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
    const [mode, mediaExpanded, infiniteScroll, showRatings, language, theme] = await Promise.all([
      readStoredLayoutMode(),
      readStoredMediaExpand(),
      readStoredInfiniteScroll(),
      readStoredShowRatings(),
      readStoredLanguage(),
      readStoredTheme(),
    ]);
    if (this.mode !== mode) {
      this.mode = mode;
      this.applyMode(this.mode);
    }
    if (this.mediaExpanded !== mediaExpanded) {
      this.mediaExpanded = mediaExpanded;
      this.applyMediaExpand(this.mediaExpanded);
    }
    if (this.infiniteScroll !== infiniteScroll) {
      this.infiniteScroll = infiniteScroll;
      this.applyInfiniteScroll(this.infiniteScroll);
    }
    if (this.showRatings !== showRatings) {
      this.showRatings = showRatings;
      this.applyShowRatings(this.showRatings);
    }
    const resolvedLang = language ?? detectBrowserLanguage();
    if (this.language !== resolvedLang) {
      this.language = resolvedLang;
      this.applyLanguage(resolvedLang);
    }
    if (this.theme !== theme) {
      this.applyTheme(theme);
    }
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

  private clearRatingCache(): void {
    const removed = globalRatingCache.clear();
    this.clearRatingCacheStatus.textContent = '';
    if (this.clearRatingCacheStatusTimer !== null) {
      window.clearTimeout(this.clearRatingCacheStatusTimer);
    }
    this.clearRatingCacheStatus.textContent =
      removed > 0
        ? t('clearRatingCacheSuccess', this.language)
        : t('clearRatingCacheEmpty', this.language);
    this.clearRatingCacheStatusTimer = window.setTimeout(() => {
      this.clearRatingCacheStatus.textContent = '';
      this.clearRatingCacheStatusTimer = null;
    }, 2600);

    if (!this.showRatings) return;
    document.querySelectorAll<HTMLElement>('.fwe-rating-container').forEach((container) => {
      const articleRoot = container.closest('article.hentry');
      if (!(articleRoot instanceof HTMLElement)) return;
      const article = parseArticle(articleRoot, detectPageKind());
      if (article.kind !== 'game') return;
      void loadRatingForBadge(container, article, this.ratingPopover, true);
    });
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  private updateBackToTopVisibility(): void {
    const visible =
      this.mode === 'enhanced' &&
      this.infiniteScroll &&
      window.scrollY >= window.innerHeight * 0.65;
    this.backToTopButton.classList.toggle('fwe-back-to-top--visible', visible);
    this.backToTopButton.tabIndex = visible ? 0 : -1;
    this.backToTopButton.setAttribute('aria-hidden', String(!visible));
  }

  private initBackToTopListener(): void {
    if (this.backToTopVisibilityListenerAttached) return;
    this.backToTopVisibilityListenerAttached = true;
    window.addEventListener('scroll', () => this.updateBackToTopVisibility(), { passive: true });
    window.addEventListener('resize', () => this.updateBackToTopVisibility(), { passive: true });
  }

  /**
   * `system` is stored and applied verbatim: the stylesheet answers it with
   * `color-scheme: light dark` plus a `prefers-color-scheme` token block, so an
   * OS flip repaints without this method running again.
   */
  private async setTheme(theme: ThemeMode): Promise<void> {
    if (this.theme === theme) return;
    this.theme = theme;
    const buttons = [this.lightThemeButton, this.darkThemeButton, this.systemThemeButton];
    buttons.forEach((button) => {
      button.disabled = true;
    });
    await writeStoredTheme(theme);
    this.applyTheme(theme);
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }

  private applyTheme(theme: ThemeMode): void {
    this.theme = theme;
    document.documentElement.dataset.fweTheme = theme;

    for (const button of [this.lightThemeButton, this.darkThemeButton, this.systemThemeButton]) {
      const active = button.dataset.theme === theme;
      button.classList.toggle('fwe-segmented__btn--active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  private async setLanguage(lang: SupportedLanguage): Promise<void> {
    this.language = lang;
    this.enButton.disabled = true;
    this.zhButton.disabled = true;
    await writeStoredLanguage(lang);
    this.applyLanguage(lang);
    this.enButton.disabled = false;
    this.zhButton.disabled = false;
  }

  private applyLanguage(lang: SupportedLanguage): void {
    this.language = lang;
    setActiveLanguage(lang);
    document.documentElement.dataset.fweLang = lang;

    // Update View control texts
    this.viewSummarySpan.textContent = t('viewTrigger', lang);
    this.layoutLabel.textContent = t('enhancedView', lang);
    this.switchButton.setAttribute('aria-label', t('enhancedViewAria', lang));
    this.mediaLabel.textContent = t('expandScreenshots', lang);
    this.mediaSwitchButton.setAttribute('aria-label', t('expandScreenshotsAria', lang));
    this.infiniteLabel.textContent = t('infiniteScroll', lang);
    this.infiniteSwitchButton.setAttribute('aria-label', t('infiniteScrollAria', lang));
    this.ratingLabel.textContent = t('showRatings', lang);
    this.ratingSwitchButton.setAttribute('aria-label', t('showRatingsAria', lang));
    this.clearRatingCacheLabel.textContent = t('clearRatingCache', lang);
    this.clearRatingCacheButton.setAttribute('aria-label', t('clearRatingCacheAria', lang));
    const clearRatingCacheButtonSpan = this.clearRatingCacheButton.querySelector('span');
    if (clearRatingCacheButtonSpan)
      clearRatingCacheButtonSpan.textContent = t('clearRatingCache', lang);
    this.backToTopButton.setAttribute('aria-label', t('backToTopAria', lang));
    this.backToTopButtonSpan.textContent = t('backToTop', lang);
    this.languageLabel.textContent = t('language', lang);
    this.themeLabel.textContent = t('theme', lang);
    const themeGroup = this.lightThemeButton.parentElement;
    themeGroup?.setAttribute('aria-label', t('themeAria', lang));
    this.lightThemeButton.textContent = t('themeLight', lang);
    this.darkThemeButton.textContent = t('themeDark', lang);
    this.systemThemeButton.textContent = t('themeSystem', lang);

    // Update segmented buttons
    this.enButton.classList.toggle('fwe-segmented__btn--active', lang === 'en');
    this.enButton.setAttribute('aria-pressed', String(lang === 'en'));
    this.zhButton.classList.toggle('fwe-segmented__btn--active', lang === 'zh-CN');
    this.zhButton.setAttribute('aria-pressed', String(lang === 'zh-CN'));

    // Update Search bar
    this.searchInput.placeholder = t('searchPlaceholder', lang);
    this.searchInput.setAttribute('aria-label', t('searchAria', lang));
    this.searchSubmit.setAttribute('aria-label', t('searchSubmitAria', lang));

    // Update header buttons
    this.popularButton.setAttribute('aria-label', t('popularAria', lang));
    this.popularButtonText.textContent = t('popularBtn', lang);
    this.browseButton.setAttribute('aria-label', t('browseAria', lang));
    this.browseButtonSpan.textContent = t('browseBtn', lang);

    // Update Dialog titles & close buttons
    const popularTitle = this.popularDialog.querySelector<HTMLElement>('#fwe-popular-title');
    if (popularTitle) popularTitle.textContent = t('popularHeading', lang);
    const popularClose = this.popularDialog.querySelector<HTMLButtonElement>('.fwe-icon-button');
    if (popularClose) popularClose.setAttribute('aria-label', t('popularCloseAria', lang));

    const browseTitle = this.browseDialog.querySelector<HTMLElement>('#fwe-browse-title');
    if (browseTitle) browseTitle.textContent = t('browseHeading', lang);
    const browseClose = this.browseDialog.querySelector<HTMLButtonElement>('.fwe-icon-button');
    if (browseClose) browseClose.setAttribute('aria-label', t('browseCloseAria', lang));

    const archivesHeading = this.browseDialog.querySelector<HTMLElement>('.fwe-archives > h2');
    if (archivesHeading) archivesHeading.textContent = t('archivesHeading', lang);

    // Update Popover, Lightbox & Modal
    this.ratingPopover.updateLanguage();
    this.lightbox.updateLanguage();
    this.gameModal.updateLanguage();

    // Re-render date chips so the relative wording follows the active language
    document.querySelectorAll<HTMLElement>('.fwe-meta-chip[data-date-iso]').forEach((chip) => {
      refreshDateChip(chip, lang);
    });

    // Update Pink Paw badge text if present
    document.querySelectorAll<HTMLElement>('.fwe-paw-badge').forEach((el) => {
      el.textContent = t('pinkPawBadge', lang);
    });

    /*
     * 上一篇/下一篇的标签来自主题写死的英文，只能由 `localizePostNavigation()`
     * 换掉一次。之后切语言必须就地改那两枚文本节点：重跑整套本地化会再插一枚
     * 箭头，也会把已翻译的文案当成原始内容记进事务。
     */
    if (this.transaction) {
      if (this.navPrevLabel) this.navPrevLabel.textContent = t('prevPost', lang);
      if (this.navNextLabel) this.navNextLabel.textContent = t('nextPost', lang);
    }

    document.querySelectorAll<HTMLAnchorElement>('.fwe-upcoming__details-link').forEach((link) => {
      link.textContent = t('upcomingDetails', lang);
      link.setAttribute(
        'aria-label',
        t(
          'upcomingDetailsAria',
          { title: link.dataset.fweUpcomingTitle || 'Upcoming Repacks' },
          lang,
        ),
      );
    });

    // Update Card payload action buttons (Mirrors, Features, Description)
    document.querySelectorAll<HTMLElement>('.fwe-action-btn, .fwe-card-btn').forEach((btn) => {
      const targetId = btn.getAttribute('data-fwe-toggle');
      if (targetId?.endsWith('-mirrors')) {
        const span = btn.querySelector('span');
        if (span) span.textContent = t('cardMirrors', lang);
      } else if (targetId?.endsWith('-features')) {
        const span = btn.querySelector('span');
        if (span) span.textContent = t('cardFeatures', lang);
      } else if (targetId?.endsWith('-desc')) {
        const span = btn.querySelector('span');
        if (span) span.textContent = t('cardDescription', lang);
      }
    });

    // Update ratings badges (unmatched and loading badges text)
    document.querySelectorAll<HTMLElement>('.fwe-rating-loading-text').forEach((el) => {
      el.textContent = t('ratingLoadingText', lang);
    });
    document.querySelectorAll<HTMLElement>('.fwe-rating-unmatched-text').forEach((el) => {
      el.textContent = t('ratingUnmatchedText', lang);
    });
  }

  private async setMode(mode: LayoutMode): Promise<void> {
    this.switchButton.disabled = true;
    this.applyMode(mode);
    await writeStoredLayoutMode(mode);
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
      // 详情页图库恒展开，与 `prepareMedia` 的 `isDetail ? true : mediaExpanded` 一致：
      // 这条偏好描述的是列表卡片，不能顺手把详情页的截图区折起来。
      if (media.closest('.fwe-detail')) return;
      media.open = expanded;
    });
  }

  private async setInfiniteScroll(enabled: boolean): Promise<void> {
    this.infiniteSwitchButton.disabled = true;
    await writeStoredInfiniteScroll(enabled);
    this.infiniteScroll = enabled;
    this.applyInfiniteScroll(enabled);
    this.infiniteSwitchButton.disabled = false;
  }

  /**
   * M3/M4 共用：往哨兵里写一条文案，可选带一枚走 `loadNextPage()` 的按钮。
   *
   * 两处调用必须走同一个方法而不是各写一遍：M3 的失败态与 M4 的「加载更多」
   * 在视觉上是同一枚按钮，只是语义不同（重试 vs 手动加载）。分叉成两份实现
   * 的话，改样式只改到一边，另一个入口就会悄悄掉队。
   */
  private renderSentinelMessage(
    sentinel: HTMLElement | null,
    message: string,
    withButton: boolean,
  ): void {
    if (!sentinel) return;
    /*
     * M4：只跳过「内容完全没变」的情况。
     *
     * `processArticles()` 每次插入后都会经 `applyInfiniteScroll()` 走到这里，
     * 无条件重写会摧毁用户正要点的那个节点（连焦点一起）——所以内容一致时必须
     * 安静返回。
     *
     * 但反过来，只因为「已经有一枚按钮」就无条件返回是错的：那会让文案永远停在
     * 第一次渲染的那一版上。真实发生过的一条路径是「自动加载失败留下 HTTP 503 →
     * 用户关掉开关想手动点」：按钮还是同一枚、还是同一个 loadNextPage()，语义却
     * 从「重试上次失败」变成了「再要一页」，文案必须跟着换，否则用户会拿着一个
     * 已经过时的状态码去报障。状态码刷新（503 → 重试 → 500）同理。
     */
    const current = sentinel.firstElementChild;
    const currentIsButton = current instanceof HTMLButtonElement;
    const alreadyRendered =
      current !== null &&
      currentIsButton === withButton &&
      current.textContent === message &&
      (currentIsButton ? current.classList.contains('fwe-infinite-loader') : true);
    if (alreadyRendered) return;
    sentinel.innerHTML = '';
    if (!withButton) {
      sentinel.append(element('div', 'fwe-infinite-end', message));
      return;
    }
    const button = element('button', 'fwe-infinite-loader', message);
    button.type = 'button';
    button.style.cursor = 'pointer';
    button.addEventListener('click', () => void this.loadNextPage());
    sentinel.append(button);
  }

  private applyInfiniteScroll(enabled: boolean): void {
    this.infiniteSwitchButton.setAttribute('aria-checked', String(enabled));
    // `.post-navigation` also carries `.navigation`, but it links the previous/next
    // single post rather than paginating a list, so it must stay reachable.
    const nav = document.querySelector<HTMLElement>(
      '#content > .navigation:not(.post-navigation), #content > .paging-navigation',
    );
    const sentinel = document.querySelector<HTMLElement>('#content > .fwe-infinite-sentinel');
    if (enabled && this.mode === 'enhanced') {
      // Hiding the nav goes through the transaction as a class rather than a raw
      // inline `style.display`: the nav is a node `move()` relocated, and an
      // inline write would outlive `restore()` and leave pagination hidden after
      // returning to the original layout.
      if (nav) this.transaction?.addClass(nav, 'fwe-source-hidden');
      if (sentinel) sentinel.style.display = '';
      this.setupInfiniteScroll();
    } else {
      if (nav) nav.classList.remove('fwe-source-hidden');
      /*
       * M4：关掉自动加载不等于撤掉退路。哨兵以前被 `display:none` 掉，用户只剩
       * 翻原站分页这一条路——而 research 要的恰恰是「随时能再要一页」。现在它
       * 端出一枚「加载更多」按钮，点的还是同一个 `loadNextPage()`。
       *
       * 只在 enhanced 模式下摆这个按钮：original 模式下哨兵根本不存在（它本身
       * 就是交易节点），保持 `display:none` 让 `restore()` 之后不留残影。
       */
      if (sentinel && this.mode === 'enhanced') {
        sentinel.style.display = '';
        this.renderSentinelMessage(sentinel, t('infiniteLoadMore'), true);
      } else if (sentinel) {
        sentinel.style.display = 'none';
      }
      this.infiniteObserver?.disconnect();
      this.infiniteObserver = null;
    }
    this.updateBackToTopVisibility();
  }

  private async setShowRatings(enabled: boolean): Promise<void> {
    this.ratingSwitchButton.disabled = true;
    await writeStoredShowRatings(enabled);
    this.showRatings = enabled;
    this.applyShowRatings(enabled);
    this.ratingSwitchButton.disabled = false;
  }

  private applyShowRatings(enabled: boolean): void {
    this.ratingSwitchButton.setAttribute('aria-checked', String(enabled));
    document.documentElement.dataset.fweShowRatings = String(enabled);
  }

  private initRatingObserver(): void {
    if (typeof IntersectionObserver !== 'function') return;
    this.ratingObserver?.disconnect();
    this.ratingObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const container = entry.target as HTMLElement;
            this.ratingObserver?.unobserve(container);
            const articleRoot = container.closest('article.hentry') as HTMLElement | null;
            if (articleRoot) {
              const article = parseArticle(articleRoot, detectPageKind());
              void loadRatingForBadge(container, article, this.ratingPopover);
            }
          }
        }
      },
      { rootMargin: '300px 0px' },
    );
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
    this.updateBackToTopVisibility();
  }

  private computeColumnCount(): number {
    const width = window.innerWidth;
    if (width >= 2400) return 4;
    if (width >= 1700) return 3;
    if (width >= 1152) return 2;
    return 1;
  }

  private initResizeListener(): void {
    if (this.resizeListenerAttached) return;
    this.resizeListenerAttached = true;
    let timer: number | undefined;
    window.addEventListener('resize', () => {
      if (this.mode !== 'enhanced') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const nextCols = this.computeColumnCount();
        if (nextCols !== this.activeColCount) {
          this.activeColCount = nextCols;
          this.processArticles();
        }
      }, 150);
    });
  }

  private enableEnhanced(): void {
    this.initResizeListener();
    this.initBackToTopListener();
    this.transaction = new DomTransaction();
    document.querySelectorAll<HTMLElement>('.widget_archive').forEach((widget) => {
      this.transaction?.addClass(widget, 'fwe-source-hidden');
    });
    this.initRatingObserver();
    this.prepareNavigation();
    this.localizePostNavigation();
    this.prepareSiteExtras();
    this.processArticles();
    this.observeChanges();
    this.observeVideos();
  }

  private disableEnhanced(): void {
    if (this.observerTimer !== null) {
      window.clearTimeout(this.observerTimer);
      this.observerTimer = null;
    }
    this.lightbox.close();
    this.gameModal.close();
    this.ratingObserver?.disconnect();
    this.ratingObserver = null;
    this.ratingPopover.hide();
    this.observer?.disconnect();
    this.observer = null;
    this.videoObserver?.disconnect();
    this.videoObserver = null;
    document
      .querySelectorAll<HTMLVideoElement>('.fwe-observed-video')
      .forEach((video) => video.pause());
    if (this.popularDialog.open) this.popularDialog.close();
    if (this.browseDialog.open) this.browseDialog.close();
    this.infiniteObserver?.disconnect();
    this.infiniteObserver = null;
    const sentinel = document.querySelector<HTMLElement>('#content > .fwe-infinite-sentinel');
    if (sentinel) sentinel.remove();
    this.transaction?.restore();
    this.transaction = null;
    this.updateBackToTopVisibility();
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

  /**
   * 主题把上一篇/下一篇的标签写死成英文（Previous Post / Next Post），中文界面里
   * 会露出英文。这里按 rel 属性本地化两枚 `.meta-nav`，并各补一枚方向箭头图标；
   * 链接里的标题文本不归我们管，保持原样。标签文本与箭头都交由 DomTransaction
   * 记录，切回原站模式时会被一并还原。
   */
  private localizePostNavigation(): void {
    const transaction = this.transaction;
    if (!transaction) return;
    const links = document.querySelector<HTMLElement>('#content > .post-navigation .nav-links');
    if (!links) return;
    const entries = [
      { rel: 'prev', label: 'prevPost', icon: 'chevronLeft' },
      { rel: 'next', label: 'nextPost', icon: 'chevronRight' },
    ] as const;
    entries.forEach(({ rel, label: key, icon }) => {
      const link = links.querySelector<HTMLAnchorElement>(`a[rel="${rel}"]`);
      const metaNav = link?.querySelector<HTMLElement>('.meta-nav');
      if (!link || !metaNav) return;
      const label = document.createTextNode(t(key));
      transaction.setChildren(metaNav, [label]);
      if (rel === 'prev') this.navPrevLabel = label;
      else this.navNextLabel = label;
      const arrow = createIcon(icon, 'fwe-nav-arrow');

      /*
       * 把标题（<a> 里的裸文本节点）单独包进 .fwe-nav-title，让「标签/箭头」
       * 与「标题」分成两块：CSS 的 2 行 clamp 只能落在标题块上。原先 clamp 在
       * 整个 <a> 上，标签占掉第 1 行，标题只剩 1 行就被省略号截断（用户报的
       * 文字遮挡）。用 setChildren 一次性重建并记录原始 children，切回原站
       * 模式时 restore() 会把裸文本节点原样放回，不留 span 残渣。
       */
      const titleText = [...link.childNodes]
        .filter((node): node is Text => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join('')
        .trim();
      const title = element('span', 'fwe-nav-title', titleText);
      // next 的箭头在标签之后、标题之前；prev 的箭头紧跟标签。两者都是
      // metaNav → arrow → title，视觉上 prev 的箭头指向左、next 指向右。
      transaction.setChildren(link, [metaNav, arrow, title]);
    });
  }

  /**
   * The enhanced layout hides the theme sidebars and footer, which would also
   * hide content that has no enhanced replacement: the scam warning, the
   * support / RSS / newsletter widgets and the footer's "Today's Most Popular
   * Repacks" grid. Relocate that content into a section appended to `#main` so
   * nothing from the original page is lost, and so `DomTransaction` can put it
   * back when the user returns to the original layout.
   */
  private prepareSiteExtras(): void {
    const transaction = this.transaction;
    if (!transaction || document.querySelector('.fwe-site-extras')) return;
    const main = document.querySelector<HTMLElement>('#main');
    const sidebar = document.querySelector<HTMLElement>('#primary-sidebar');
    const footerWidget = document.querySelector<HTMLElement>('#block-6');
    if (!main || (!sidebar && !footerWidget)) return;

    const widgets = sidebar
      ? [...sidebar.children].filter(
          (child): child is HTMLElement =>
            child instanceof HTMLElement &&
            child.matches('aside.widget, .widget') &&
            // Monthly archives are already reachable through the Browse dialog
            !child.classList.contains('widget_archive'),
        )
      : [];
    const popularTiles = parsePopularItems(footerWidget);
    const notice = document.querySelector<HTMLElement>(
      '#secondary .site-description, .site-description',
    );
    if (widgets.length === 0 && popularTiles.length === 0 && !notice) return;

    const section = element('section', 'fwe-site-extras');
    /*
     * 详情页评论区（Tolstoy 插件 iframe）会从 ~200px 长到近 10000px。它每长
     * 一寸都把下方内容踹飞一次——实测 CLS 0.751。插到评论区前面可以消除抖动；
     * 列表页没有评论区锚点，走 else 分支保持原有行为（挂到 #main 末尾）。
     */
    const commentsAnchor = [
      document.querySelector<HTMLElement>('#content > div[data-source-theme="tolstoycomments"]'),
      document.querySelector<HTMLElement>('#content > .tolstoycomments-feed'),
      document.querySelector<HTMLElement>('#content > #comments'),
    ].find((node): node is HTMLElement => node !== null && node.parentElement !== null);
    const commentsParent = commentsAnchor?.parentElement ?? null;
    if (commentsAnchor instanceof HTMLElement && commentsParent) {
      transaction.insert(section, commentsParent, commentsAnchor);
    } else {
      transaction.insert(section, main);
    }

    if (notice) {
      const block = element('div', 'fwe-extras-block fwe-extras-notice');
      transaction.move(notice, block);
      transaction.addClass(notice, 'fwe-extras-notice__text');
      section.append(block);
    }

    /*
     * 捐赠 / RSS / 订阅 / OST 四个 widget 合并成一条页脚带。它们本来各自是一张
     * `.fwe-extras-block` 卡片，四张等权卡片等于宣布「这是四段内容」；而按设计
     * 只有防伪警示和今日热门值得那个重量。所以这里只建一个 block，每个 widget
     * 成为带内的一格——`relocateWidget()` 的移动逻辑完全不变，只是外层容器换了，
     * 还原时自然也跟着回到 `#primary-sidebar`。
     */
    const strip = element('div', 'fwe-extras-block fwe-extras-block--strip');
    for (const widget of widgets) {
      const cell = element('div', 'fwe-extras-strip__cell');
      this.relocateWidget(widget, cell);
      if (cell.childElementCount > 0) strip.append(cell);
    }

    if (popularTiles.length > 0 && footerWidget) {
      const block = element('div', 'fwe-extras-block fwe-extras-block--wide');
      const heading = footerWidget.querySelector<HTMLElement>('.widgettitle, .widget-title');
      if (heading) {
        transaction.move(heading, block);
        transaction.addClass(heading, 'fwe-extras-block__title');
      }
      // The widget ships theme rules (floats, fixed widths) that would break the grid
      footerWidget.querySelectorAll('style').forEach((style) => {
        transaction.setAttribute(style, 'media', 'not all');
      });
      const grid = element('div', 'fwe-directory-grid');
      popularTiles.forEach((item) => {
        const tile = element('a', 'fwe-directory-tile');
        tile.href = item.href;
        tile.title = item.title;
        const image = element('img');
        image.src = item.imageUrl ?? '';
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        tile.append(image, element('span', 'fwe-directory-tile__title', item.title));
        grid.append(tile);
      });
      block.append(grid);
      section.append(block);
    }

    // 带子本身横跨整个 extras 网格，而不是占一个 16rem 的自动填充轨道。
    // 它排在热门之后：热门的今日内容在前，捐赠/RSS/订阅/OST 是站点 chrome。
    if (strip.childElementCount > 0) {
      section.append(strip);
      this.prepareOstTiles(strip);
    }
  }

  /**
   * 把带子里的每个 YouTube embed 换成一张点击才加载的海报瓦片。
   *
   * iframe 留在原位，但它的 `src` 在 boot 时就被撤掉：脚本以 `document-start`
   * 注册、在 `DOMContentLoaded` 执行，此刻播放器文档与 JS 通常还在传输中，
   * 撤掉 `src` 能取消这段在途加载——`display: none` 做不到这一点，隐藏的
   * iframe 照样会连出去。点击瓦片时把原 `src` 直接写回（不走 transaction，
   * 否则会留下第二条属性记录、restore 时二次写同一个值）；`restore()` 则按
   * transaction 里记录的原值写回逐字相同的 `src`。
   *
   * 已知副作用：点击后播放器从零加载（约 1s）；点击播放后再切回原站模式，
   * restore 重写相同的 `src` 会被浏览器当成新导航，播放进度丢失。
   */
  private prepareOstTiles(strip: HTMLElement): void {
    const transaction = this.transaction;
    if (!transaction) return;
    strip.querySelectorAll('iframe').forEach((frame) => {
      const id = /youtube\.com\/embed\/([\w-]{11})/.exec(frame.getAttribute('src') ?? '')?.[1];
      if (!id) return;
      const host = frame.parentElement;
      if (!host) return;
      // 命中正则时必然有 src，但按 `string | null` 处理，避免写回一个空串。
      const originalSrc = frame.getAttribute('src');

      const tile = element('button', 'fwe-ost-tile');
      tile.type = 'button';
      tile.setAttribute('aria-label', t('ostPlayAria'));
      tile.title = t('ostPlayTitle');
      const poster = element('img', 'fwe-ost-tile__poster');
      poster.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      poster.loading = 'lazy';
      poster.decoding = 'async';
      poster.alt = '';
      const play = element('span', 'fwe-ost-tile__play');
      play.append(createIcon('play'));
      tile.append(poster, play);
      tile.addEventListener('click', () => {
        tile.remove();
        if (originalSrc !== null) frame.setAttribute('src', originalSrc);
        frame.classList.remove('fwe-ost-pending');
      });

      transaction.insert(tile, host, frame);
      transaction.addClass(frame, 'fwe-ost-pending');
      transaction.setAttribute(frame, 'src', null);
      const cell = frame.closest('.fwe-extras-strip__cell');
      if (cell) transaction.addClass(cell, 'fwe-extras-strip__cell--ost');
    });
  }

  /** Moves a widget's own heading and body into an extras block. */
  private relocateWidget(widget: HTMLElement, block: HTMLElement): void {
    const transaction = this.transaction;
    if (!transaction) return;
    const heading = widget.querySelector<HTMLElement>('.widgettitle, .widget-title');
    if (heading) {
      transaction.move(heading, block);
      transaction.addClass(heading, 'fwe-extras-block__title');
    }
    [...widget.children].forEach((child) => {
      // Theme stylesheets stay inside the (hidden) widget instead of following the content
      if (child === heading || !(child instanceof HTMLElement) || child.matches('style')) return;
      transaction.move(child, block);
    });
  }

  private processArticles(): void {
    if (!this.transaction || this.processing) return;
    this.processing = true;

    // Pause Observer to prevent mutations from triggering recursive loops
    const activeObserver = this.observer;
    if (activeObserver) {
      activeObserver.disconnect();
      this.observer = null;
    }

    const pageKind = detectPageKind();
    const isSingle =
      pageKind === 'single' ||
      document.body.matches('.single, .single-post, .page, .singular') ||
      Boolean(document.querySelector('.single-post, .singular'));

    const content = document.querySelector<HTMLElement>('#content');
    const articles = [
      ...document.querySelectorAll<HTMLElement>('#content article.hentry, article.hentry'),
    ];

    let upcomingArticle: HTMLElement | null = null;
    const cardsToLayout: HTMLElement[] = [];

    for (const root of articles) {
      /*
       * M6：顺手把遍历到的文章 id 收进增量集合。这一步本来就要遍历全部文章，
       * 所以增量维护的边际成本是零——省下的是 `loadNextPage()` 里每次重建
       * 全量 Set 的那次 `querySelectorAll`。
       *
       * 与旧实现的语义完全一致：旧代码取的是文档里全部 `article.hentry` 的 id，
       * 这里收的也是同一个 `articles` 数组（同一条选择器）。
       */
      if (root.id) this.loadedArticleIds.add(root.id);

      const isTransformed = root.hasAttribute('data-fwe-ready');
      let kind: ArticleKind = 'special';
      if (!isTransformed) {
        const article = parseArticle(root, pageKind);
        kind = article.kind;
        if (article.kind === 'game') {
          transformGame(
            article,
            this.transaction,
            this.mediaExpanded,
            this.lightbox,
            this.gameModal,
            this.ratingPopover,
            this.ratingObserver,
          );
        } else if (article.kind === 'upcoming') {
          transformUpcoming(article, this.transaction);
        } else {
          transformSpecial(article, this.transaction);
        }
      } else if (root.matches('.fwe-upcoming')) {
        kind = 'upcoming';
      } else if (root.matches('.fwe-game-card')) {
        kind = 'game';
      }

      if (kind === 'upcoming' || root.matches('.fwe-upcoming')) {
        upcomingArticle = root;
      } else if (
        !isSingle &&
        !root.matches('.fwe-directory-popular, .fwe-directory-az, .fwe-directory-updates')
      ) {
        if (!root.hasAttribute('data-fwe-seq')) {
          this.transaction.setAttribute(root, 'data-fwe-seq', String(cardsToLayout.length + 1));
        }
        cardsToLayout.push(root);
      }
    }

    // Always sort stably by the initial sequence number discovered
    cardsToLayout.sort((a, b) => {
      const seqA = Number(a.getAttribute('data-fwe-seq')) || 0;
      const seqB = Number(b.getAttribute('data-fwe-seq')) || 0;
      return seqA - seqB;
    });

    if (!isSingle && content) {
      // Hide loose non-article elements to eliminate layout gaps
      [...content.children].forEach((child) => {
        if (
          child instanceof HTMLElement &&
          !child.matches(
            'article, .fwe-stream, .fwe-infinite-sentinel, .page-header, .navigation, .paging-navigation, .post-navigation',
          )
        ) {
          this.transaction?.addClass(child, 'fwe-source-hidden');
        }
      });

      const pageHeader = content.querySelector<HTMLElement>(':scope > .page-header');

      // Ensure Upcoming Repacks sits at the top of content (or right after page-header)
      if (upcomingArticle) {
        const expectedAnchor = pageHeader ? pageHeader.nextSibling : content.firstChild;
        if (
          upcomingArticle.parentElement !== content ||
          upcomingArticle.previousElementSibling !== pageHeader
        ) {
          this.transaction.move(upcomingArticle, content, expectedAnchor);
        }
      }

      // Obtain or create streaming grid container
      const targetColCount = this.computeColumnCount();
      this.activeColCount = targetColCount;

      let stream = content.querySelector<HTMLElement>(':scope > .fwe-stream');
      const streamAnchor = upcomingArticle
        ? upcomingArticle.nextSibling
        : pageHeader
          ? pageHeader.nextSibling
          : content.firstChild;

      if (!stream) {
        stream = element('div', 'fwe-stream');
        /*
         * M6：新建流意味着这批文章节点是全新的（切模式回来时 `restore()` 已把
         * 旧的连 id 一起撤掉）。此刻必须用当前文章的 id 重新播种，否则增量集合
         * 里残留的旧 id 会让下一页被判成「全部重复」而一篇不插——内容凭空消失。
         */
        this.loadedArticleIds = new Set(
          articles.map((a) => a.id).filter((id): id is string => Boolean(id)),
        );
        this.transaction.insert(stream, content, streamAnchor);
      } else if (stream.previousElementSibling !== (upcomingArticle ?? pageHeader)) {
        content.insertBefore(stream, streamAnchor);
      }

      stream.setAttribute('data-cols', String(targetColCount));
      stream.style.setProperty('--fwe-cols', String(targetColCount));

      // Strict Row-Aligned Grid:
      // Cards are direct children of .fwe-stream and ordered left-to-right, row-by-row
      cardsToLayout.forEach((card, index) => {
        if (card.parentElement !== stream) {
          this.transaction?.move(card, stream);
        } else if (stream.children[index] !== card) {
          stream.insertBefore(card, stream.children[index] ?? null);
        }
      });

      // Ensure sentinel and pagination navigation sit after the stream
      let sentinel = content.querySelector<HTMLElement>(':scope > .fwe-infinite-sentinel');
      if (!sentinel) {
        sentinel = element('div', 'fwe-infinite-sentinel');
        /*
         * M5：整个信息流只有一个状态播报口，就是这里。`role="status"` 自带
         * `aria-live="polite"`，但两个都显式写上——读屏软件对隐式 live region
         * 的支持并不整齐。四种状态（加载中 / 已加载一页 / 失败 / 已全部加载）
         * 都往这个节点里写文字，所以换语言、换文案都不用动这行。
         */
        sentinel.setAttribute('role', 'status');
        sentinel.setAttribute('aria-live', 'polite');
        this.transaction.insert(sentinel, content, stream.nextSibling);
      } else if (stream && sentinel.previousElementSibling !== stream) {
        content.insertBefore(sentinel, stream.nextSibling);
      }

      const nav = content.querySelector<HTMLElement>(
        ':scope > .navigation, :scope > .paging-navigation, :scope > .post-navigation',
      );
      if (nav && sentinel && nav.previousElementSibling !== sentinel) {
        this.transaction.move(nav, content, sentinel.nextSibling);
      }

      // Apply infinite scroll state based on user preferences
      this.applyInfiniteScroll(this.infiniteScroll);

      /*
       * M2：刷新后静默补齐到记忆中的页数。放在这里是因为补齐要跟着分页导航的
       * next 链接一页页走，而导航就是上面几行刚排好的。
       *
       * 只在无限滚动开着时补：用户显式关掉自动加载，却在刷新后被静默抓一堆
       * 页面，违背的是他们自己的偏好。关着的时候位置仍然不丢——URL 已同步，
       * 打开开关后哨兵会继续往下加载。
       */
      if (this.infiniteScroll) void this.restoreRememberedPages();
    }

    this.processing = false;
    if (this.mode === 'enhanced') {
      this.observeChanges();
    }
  }

  private observeChanges(): void {
    if (this.observer) return;
    const target = document.querySelector('#content') ?? document.body;
    this.observer = new MutationObserver((mutations) => {
      if (this.processing || this.mode !== 'enhanced') return;

      // Defensive check: only trigger when new unready articles are appended
      const hasNewUnreadyArticle = mutations.some((mutation) =>
        [...mutation.addedNodes].some(
          (node) =>
            node instanceof HTMLElement &&
            (node.matches('article.hentry:not([data-fwe-ready])') ||
              Boolean(node.querySelector('article.hentry:not([data-fwe-ready])'))),
        ),
      );
      if (!hasNewUnreadyArticle) return;

      if (this.observerTimer !== null) {
        window.clearTimeout(this.observerTimer);
      }
      this.observerTimer = window.setTimeout(() => {
        this.observerTimer = null;
        if (this.processing || this.mode !== 'enhanced') return;
        this.processArticles();
        this.observeVideos();
      }, 100);
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

  private setupInfiniteScroll(): void {
    if (!this.infiniteScroll || !this.hasNextPage || this.mode !== 'enhanced') return;
    const sentinel = document.querySelector<HTMLElement>('#content > .fwe-infinite-sentinel');
    if (!sentinel) return;

    if (!this.infiniteObserver) {
      this.infiniteObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            void this.loadNextPage();
          }
        },
        { rootMargin: '600px 0px 600px 0px' },
      );
    }
    this.infiniteObserver.observe(sentinel);
  }

  /**
   * M2：刷新后静默补齐到 sessionStorage 记住的页数。
   *
   * 每次文档加载只尝试一次（`pagesRestoreStarted`），切模式不重复补——回到
   * original 会把加载过的页面连同增强一起撤掉，那时再补一次只会白白抓一遍。
   * 一轮没能推进就停：死循环比少一页更糟。
   */
  private async restoreRememberedPages(): Promise<void> {
    if (this.pagesRestoreStarted) return;
    this.pagesRestoreStarted = true;

    const target = readRememberedPageCount();
    while (
      this.loadedPageCount < target &&
      this.hasNextPage &&
      this.mode === 'enhanced' &&
      this.infiniteScroll
    ) {
      const before = this.loadedPageCount;
      await this.loadNextPage({ silent: true });
      if (this.loadedPageCount === before) break;
    }
  }

  /**
   * `silent` 只给刷新后的静默补齐用：不渲染骨架、不占 loadingNextPage 之外的
   * 任何用户可见状态。手动点击与哨兵自动触发都不传它。
   */
  private async loadNextPage(options: { silent?: boolean } = {}): Promise<void> {
    const { silent = false } = options;
    if (this.loadingNextPage || !this.hasNextPage) return;

    // Search for next page link in standard pagination
    const nextLink = document.querySelector<HTMLAnchorElement>(
      '#content .nav-links a.next, #content .paging-navigation a.next, #content .pagination a.next',
    );
    if (!nextLink?.href) {
      this.hasNextPage = false;
      const sentinel = document.querySelector<HTMLElement>('#content > .fwe-infinite-sentinel');
      if (sentinel) {
        sentinel.innerHTML = '';
        sentinel.append(element('div', 'fwe-infinite-end', t('infiniteEnd')));
      }
      return;
    }

    this.loadingNextPage = true;
    const sentinel = document.querySelector<HTMLElement>('#content > .fwe-infinite-sentinel');
    if (sentinel) {
      sentinel.innerHTML = '';
      /*
       * 静默补齐不渲染骨架：用户刷新是为了回到原来的位置，不是为了再看一次
       * 加载动画。骨架仍然是手动滚动与首次自动加载的进度指示。
       */
      if (!silent) {
        // The skeleton is a generated node like any other, so returning to the
        // original layout takes it with the rest of the enhancements.
        const skeleton = createSkeletonGrid(this.computeColumnCount());
        if (this.transaction) {
          this.transaction.insert(skeleton, sentinel);
        } else {
          sentinel.append(skeleton);
        }
      }
    }

    /*
     * M3：把哨兵上的失败 / 结束文案收敛到一处。三档共用同一套骨架，差别只在
     * 「有没有退路」——网络与 HTTP 失败留重试按钮，空结果不留：没有东西可重试，
     * 留一个按钮只会骗用户再发一次同样的请求。
     */
    const renderSentinelMessage = (message: string, withRetry: boolean): void => {
      this.renderSentinelMessage(sentinel, message, withRetry);
    };

    let insertedCount = 0;
    try {
      const response = await fetch(nextLink.href, { credentials: 'same-origin' });
      if (!response.ok) {
        /*
         * M3 第二级：响应回来了但状态码不对。文案带上状态码——用户截图报障时
         * 「HTTP 503」比「加载失败」有用得多。留重试：503 多半是站点临时抽风。
         *
         * warn 只发一条、只带 URL 与状态码，不带错误对象：429 回退链的教训是
         * warn 太吵，一个错误刷一屏等于没有日志。
         */
        console.warn(
          `[fitgirl-web-enhanced] infinite scroll: HTTP ${response.status} for ${nextLink.href}`,
        );
        renderSentinelMessage(t('infiniteErrorHttp', { status: response.status }), true);
        return;
      }
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      // Extract new article elements
      const newArticles = [
        ...doc.querySelectorAll<HTMLElement>('#content article.hentry, article.hentry'),
      ];

      /*
       * M6：去重改用增量集合，不再每次 `querySelectorAll('article.hentry')`
       * 重建全量 Set。集合由 `processArticles()` 在本来就要走的遍历里顺手累积，
       * 并在 `.fwe-stream` 新建时（切模式回来）重新播种——所以它始终等于「当前
       * 文档里全部文章的 id」，与旧实现语义一致，只是不再随页数线性重建。
       */
      const existingIds = this.loadedArticleIds;
      const incomingArticles = newArticles.filter((a) => !a.id || !existingIds.has(a.id));

      /*
       * M3 第三级：这一页没有新文章。这多半是列表真的到底了（WordPress 有时会把
       * 最后一页的内容重复服务一次），也可能是缓存页 / 置顶重复——一次响应区分
       * 不了两者，所以统一按「结束」处理：不再重试，也不再往下抓。
       *
       * 空结果不是错误：不写 warn，也不留重试按钮。
       */
      if (incomingArticles.length === 0) {
        this.hasNextPage = false;
        renderSentinelMessage(t('infiniteErrorEmpty'), false);
        return;
      }

      const content = document.querySelector<HTMLElement>('#content');
      const transaction = this.transaction;
      if (content && incomingArticles.length > 0) {
        for (const art of incomingArticles) {
          if (
            art.matches(
              '.fwe-upcoming, .category-upcoming, .fwe-directory-popular, .fwe-directory-az, .fwe-directory-updates',
            )
          ) {
            continue;
          }
          // Loaded pages are content we generated, so they go through the
          // transaction: `disableEnhanced()` must be able to remove them again
          // when the user returns to the original layout.
          if (transaction) {
            transaction.insert(art, content, sentinel);
          } else {
            content.insertBefore(art, sentinel);
          }
          insertedCount += 1;
        }
      }

      /*
       * M2：URL 同步 + 页数记忆，只在真的推进了内容时做。
       *
       * `replaceState` 而不是 `pushState`：后者会把每一页塞进浏览器历史，用户按
       * 后退只会在我们自己的条目里打转；而「可分享、刷新不丢位置」这两个核心
       * 价值 replaceState 已经给全了。URL 直接用 WordPress 分页链接给出的
       * `nextLink.href`，不用自己拼。页数写进 sessionStorage，刷新后按它静默
       * 补齐——一次都没推进（空结果 / 全是重复卡）就不动这两个状态。
       */
      if (insertedCount > 0) {
        this.loadedPageCount += 1;
        writeRememberedPageCount(this.loadedPageCount);
        window.history.replaceState(null, '', nextLink.href);
      }

      // Update pagination navigation with next page links
      const newNav = doc.querySelector<HTMLElement>(
        '#content > .navigation, #content > .paging-navigation',
      );
      const currentNav = document.querySelector<HTMLElement>(
        '#content > .navigation, #content > .paging-navigation',
      );
      if (newNav && currentNav) {
        // The live nav is a node the transaction moved, so swapping its
        // children has to go through `setChildren` — a bare `innerHTML`
        // assignment would survive `restore()` and strand the user on the
        // pagination markup of whatever page they happened to scroll to.
        this.transaction?.setChildren(currentNav, [...newNav.childNodes]);
      } else if (!doc.querySelector('#content .nav-links a.next')) {
        this.hasNextPage = false;
      }

      /*
       * M5：成功落地后播报「加载了第几页」。sentinel 是 `role="status"` 区域，
       * 这段文字就是读屏用户唯一能拿到的进度反馈——没有它，内容悄悄变了，
       * 他们只会以为页面卡住。
       *
       * 只在真的推进了内容时写：`insertedCount === 0` 的路径已经在上面按空结果
       * 处理掉了，走不到这里。
       */
      if (sentinel && insertedCount > 0) {
        sentinel.innerHTML = '';
        sentinel.append(
          element('div', 'fwe-infinite-end', t('infiniteLoaded', { page: this.loadedPageCount })),
        );
      }
    } catch {
      /*
       * M3 第一级：fetch 直接 reject（断网 / DNS / 跨域被拦）。这是唯一一种用户
       * 「自己能修」的失败，所以文案指向连接，并且留重试。
       *
       * warn 只发一条、只带 URL，不绑定错误对象：错误对象会带 stack，一个网络
       * 失败的 stack 对定位毫无帮助，只是噪音。
       */
      console.warn(
        `[fitgirl-web-enhanced] infinite scroll: network request failed for ${nextLink.href}`,
      );
      renderSentinelMessage(t('infiniteErrorNetwork'), true);
    } finally {
      this.loadingNextPage = false;
      if (this.observerTimer !== null) {
        window.clearTimeout(this.observerTimer);
        this.observerTimer = null;
      }
      /*
       * M6 验证结论：这一行**不是**冗余的，已实测删除后三处破裂——
       *   1. 新插入的文章不会被改造成卡片（只能等 MutationObserver 的 100ms
       *      防抖，那 100ms 里用户看到的是未经改造的原始文章）；
       *   2. `applyInfiniteScroll()` 不再重跑，M4 的「加载更多」按钮不回来；
       *   3. M5 的「Loaded page N」播报被按钮文案覆盖掉。
       * 另外它在这里还顺手取消掉了观察器的防抖计时器（上面几行），所以两边的
       * 触发不会重复跑一遍全量遍历。留着。
       */
      this.processArticles();
      /*
       * 问题 3：Tolstoy 插件只在 init 时用 getElementsByClassName 填充一次
       * `.tolstoycomments-cc`，无限滚动插入的新卡永远空着。插件把活的 Comment
       * 实例挂在队列对象上，update() 会重新扫描全文档并按 URL 去重——这里按
       * 本页真的插入了文章才补齐：空结果与失败路径不白跑一趟第三方请求。
       */
      if (insertedCount > 0) refillThirdPartyCommentCounts();
    }
  }
}
