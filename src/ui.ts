import { createIcon } from './icons';
import {
  detectPageKind,
  DomTransaction,
  extractFacts,
  formatRelativeTime,
  parseArchiveGroups,
  parseArticle,
  parseArticleDate,
  parseNavigation,
  parsePopularItems,
  parseUpcomingItems,
} from './dom';
import {
  detectBrowserLanguage,
  getActiveLanguage,
  setActiveLanguage,
  t,
} from './i18n';
import {
  getFastStoredInfiniteScroll,
  getFastStoredLanguage,
  getFastStoredLayoutMode,
  getFastStoredMediaExpand,
  getFastStoredShowRatings,
  readStoredInfiniteScroll,
  readStoredLanguage,
  readStoredLayoutMode,
  readStoredMediaExpand,
  readStoredShowRatings,
  writeStoredInfiniteScroll,
  writeStoredLanguage,
  writeStoredLayoutMode,
  writeStoredMediaExpand,
  writeStoredShowRatings,
} from './preferences';
import { cleanTitleBase, getGameRating, globalRatingQueue, translateScoreDesc } from './rating';
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
    const btn = element('button', 'fwe-card-btn');
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
    const btn = element('button', 'fwe-card-btn');
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
  private hideTimeout: number | null = null;
  public currentAnchor: HTMLElement | null = null;
  private onRefreshCallback: (() => void) | null = null;
  private currentData: GameRatingData | null = null;

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

    this.element.addEventListener('mouseenter', () => {
      if (this.hideTimeout !== null) {
        window.clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
    });

    this.element.addEventListener('mouseleave', () => {
      this.hide();
    });

    window.addEventListener('scroll', () => this.hide(0), { passive: true });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide(0);
    });
  }

  private triggerRefresh(): void {
    this.refreshBtn.disabled = true;
    this.unmatchedRetryBtn.disabled = true;
    this.refreshBtn
      .querySelector('.fwe-rating-popover__refresh-icon')
      ?.classList.add('fwe-spin');
    if (this.onRefreshCallback) {
      this.onRefreshCallback();
    }
    this.hide(0);
  }

  private positionAt(anchor: HTMLElement): void {
    this.element.style.removeProperty('display');
    this.element.setAttribute('aria-hidden', 'false');

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = this.element.getBoundingClientRect();

    let top = anchorRect.bottom + 8 + window.scrollY;
    let left = anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2 + window.scrollX;

    if (left + popoverRect.width > window.innerWidth + window.scrollX - 16) {
      left = window.innerWidth + window.scrollX - popoverRect.width - 16;
    }
    if (left < window.scrollX + 16) {
      left = window.scrollX + 16;
    }

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
    if (this.hideTimeout !== null) {
      window.clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
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
    if (this.hideTimeout !== null) {
      window.clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    this.currentAnchor = anchor;
    this.currentData = null;
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
    this.appIdBadge.textContent = t('ratingUnmatchedText');

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
    this.unmatchedTextEl.textContent = t('ratingUnmatchedDesc');
    this.unmatchedRetryBtn.textContent = t('queryAgain');
    if (this.currentData) {
      this.scoreDesc.textContent = translateScoreDesc(this.currentData.scoreDesc, getActiveLanguage());
      this.reviewsCount.textContent = t('reviewsSummary', {
        total: this.currentData.totalReviews.toLocaleString(),
        positive: this.currentData.totalPositive.toLocaleString(),
        negative: this.currentData.totalNegative.toLocaleString(),
      });
      this.steamLink.textContent = t('steamStore');
      this.steamDbLink.textContent = t('steamDb');
    } else {
      this.appIdBadge.textContent = t('ratingUnmatchedText');
      this.steamLink.textContent = t('steamSearch');
      this.steamDbLink.textContent = t('steamDbSearch');
    }
  }

  hide(delay = 180): void {
    if (this.hideTimeout !== null) {
      window.clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    if (delay === 0) {
      this.element.classList.remove('fwe-rating-popover--visible');
      this.element.style.setProperty('display', 'none');
      this.element.setAttribute('aria-hidden', 'true');
      this.currentAnchor = null;
      return;
    }
    this.hideTimeout = window.setTimeout(() => {
      this.element.classList.remove('fwe-rating-popover--visible');
      this.element.style.setProperty('display', 'none');
      this.element.setAttribute('aria-hidden', 'true');
      this.currentAnchor = null;
    }, delay);
  }

  destroy(): void {
    if (this.hideTimeout !== null) {
      window.clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
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

function renderUnmatchedBadge(
  container: HTMLElement,
  article: ParsedArticle,
  popover: RatingPopover,
  triggerRefresh: () => void,
): void {
  container.innerHTML = '';
  container.classList.remove('fwe-rating-container--empty');

  const badge = element('div', 'fwe-rating-badge fwe-rating-badge--unmatched');
  badge.setAttribute('role', 'button');
  badge.setAttribute('tabindex', '0');
  badge.setAttribute('aria-label', t('ratingUnmatchedAria', { title: article.title }));
  badge.title = t('ratingUnmatchedTitle');

  const pill = element('span', 'fwe-rating-pill fwe-rating-pill--unmatched');
  pill.append(createIcon('help', 'fwe-rating-icon fwe-rating-icon--unmatched'));
  pill.append(element('span', 'fwe-rating-unmatched-text', t('ratingUnmatchedText')));
  badge.append(pill);

  badge.addEventListener('mouseenter', () => {
    popover.showUnmatched(badge, article.title, triggerRefresh);
  });
  badge.addEventListener('mouseleave', () => {
    popover.hide();
  });
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    popover.showUnmatched(badge, article.title, triggerRefresh);
  });
  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      popover.showUnmatched(badge, article.title, triggerRefresh);
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

  if (typeof data.metascore === 'number') {
    const metaPill = element(
      'span',
      `fwe-rating-pill fwe-rating-pill--meta ${getMetaColorClass(data.metascore)}`,
    );
    metaPill.append(createIcon('metacritic', 'fwe-rating-icon-meta'));
    metaPill.append(element('span', 'fwe-rating-metascore', String(data.metascore)));
    badge.append(metaPill);
  }

  badge.addEventListener('mouseenter', () => {
    popover.show(badge, data, triggerRefresh);
  });
  badge.addEventListener('mouseleave', () => {
    popover.hide();
  });

  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    window.open(data.steamUrl, '_blank', 'noopener,noreferrer');
  });

  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      window.open(data.steamUrl, '_blank', 'noopener,noreferrer');
    }
  });

  container.append(badge);
}

function updateDetailFactsWithRating(
  article: ParsedArticle,
  data: GameRatingData,
  triggerRefresh?: () => void,
): void {
  const factsList = article.root.querySelector<HTMLElement>('.fwe-facts');
  if (!factsList) return;

  let item = factsList.querySelector<HTMLElement>('.fwe-fact--rating');
  if (!item) {
    item = element('div', 'fwe-fact fwe-fact--rating');
    factsList.append(item);
  }
  item.innerHTML = '';

  const term = element('dt', 'fwe-fact__label');
  term.append(createIcon('star'), document.createTextNode('Rating'));
  const description = element('dd', 'fwe-fact__value');

  const localizedDesc = translateScoreDesc(data.scoreDesc, getActiveLanguage());
  const reviewCountText = t('reviewCount', { total: data.totalReviews.toLocaleString() });
  const steamLink = element(
    'a',
    'fwe-fact-link',
    `Steam: ${data.positivePercent}% (${localizedDesc} · ${reviewCountText})`,
  );
  steamLink.href = data.steamUrl;
  steamLink.target = '_blank';
  steamLink.rel = 'noopener noreferrer';
  description.append(steamLink);

  if (typeof data.metascore === 'number') {
    description.append(document.createTextNode(' · '));
    const metaLink = element('a', 'fwe-fact-link', `Metacritic: ${data.metascore}/100`);
    metaLink.href = data.metacriticUrl || data.steamUrl;
    metaLink.target = '_blank';
    metaLink.rel = 'noopener noreferrer';
    description.append(metaLink);
  }

  if (triggerRefresh) {
    const refreshBtn = element('button', 'fwe-fact-refresh-btn');
    refreshBtn.type = 'button';
    refreshBtn.title = t('ratingRefreshTitle');
    refreshBtn.setAttribute('aria-label', t('ratingRefreshAria'));
    refreshBtn.append(createIcon('refresh', 'fwe-fact-refresh-icon'));
    refreshBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const icon = refreshBtn.querySelector('.fwe-fact-refresh-icon');
      icon?.classList.add('fwe-spin');
      refreshBtn.disabled = true;
      triggerRefresh();
    });
    description.append(document.createTextNode(' '), refreshBtn);
  }

  item.append(term, description);
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
    const data = await globalRatingQueue.add(() =>
      getGameRating(article.title, article.root, forceRefresh),
    );

    if (!data) {
      renderUnmatchedBadge(container, article, popover, triggerRefresh);
      return;
    }

    renderSuccessBadge(container, data, popover, triggerRefresh);

    if (article.pageKind === 'single') {
      updateDetailFactsWithRating(article, data, triggerRefresh);
    }
  } catch {
    renderUnmatchedBadge(container, article, popover, triggerRefresh);
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
    ratingObserver.observe(container);
  } else {
    void loadRatingForBadge(container, article, popover);
  }

  return container;
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

  const displayDateText = (timeNode?.textContent || originalDate?.textContent || '').trim();
  const meta = element('div', 'fwe-article-meta');
  meta.append(createIcon('calendar'), document.createTextNode(displayDateText));
  transaction.insert(meta, header);

  // Inject rating badge and relative time badge to the right of header
  const title = header.querySelector<HTMLElement>('.entry-title');
  if (title && !header.querySelector('.fwe-header-right')) {
    const parsedDate = parseArticleDate(originalDate, header);
    let timeText = displayDateText;
    if (parsedDate) {
      timeText = formatRelativeTime(parsedDate, new Date(), getActiveLanguage());
    }
    const rightBox = element('div', 'fwe-header-right');

    if (popover && article.kind === 'game') {
      const ratingContainer = createRatingBadge(article, popover, ratingObserver ?? null);
      rightBox.append(ratingContainer);
    }

    if (article.hasPinkPawAward) {
      const pawBadge = element('span', 'fwe-paw-badge', t('pinkPawBadge'));
      pawBadge.title = 'FitGirl Personal Pink Paw Award';
      rightBox.append(pawBadge);
    }

    const timeBadge = element('span', 'fwe-time-ago', timeText);
    if (parsedDate) {
      timeBadge.dataset.dateIso = parsedDate.toISOString();
    }
    rightBox.append(timeBadge);
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
  } else if (
    /all my repacks.*a.?z/i.test(article.title) ||
    /pink paw award/i.test(article.title) ||
    Boolean(article.entry?.querySelector('.lcp_catlist'))
  ) {
    transaction.addClass(article.root, 'fwe-directory-az');
  } else if (title === 'updates list') {
    transaction.addClass(article.root, 'fwe-directory-updates');
    transformLegacySpoilers(article, transaction);
  }
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
  private transaction: DomTransaction | null = null;
  private observer: MutationObserver | null = null;
  private videoObserver: IntersectionObserver | null = null;
  private infiniteObserver: IntersectionObserver | null = null;
  private ratingObserver: IntersectionObserver | null = null;
  private processing = false;
  private loadingNextPage = false;
  private hasNextPage = true;
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
  private readonly languageLabel: HTMLElement;
  private readonly enButton: HTMLButtonElement;
  private readonly zhButton: HTMLButtonElement;
  private readonly popularButton: HTMLButtonElement;
  private readonly popularButtonText: Text;
  private readonly browseButton: HTMLButtonElement;
  private readonly browseButtonSpan: HTMLElement;
  private readonly popularDialog: HTMLDialogElement;
  private readonly browseDialog: HTMLDialogElement;
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

  constructor() {
    this.mode = getFastStoredLayoutMode();
    this.mediaExpanded = getFastStoredMediaExpand();
    this.infiniteScroll = getFastStoredInfiniteScroll();
    this.showRatings = getFastStoredShowRatings();
    this.language = getFastStoredLanguage() ?? detectBrowserLanguage();
    setActiveLanguage(this.language);
    document.documentElement.dataset.fweLang = this.language;

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
    this.mediaLabel = element('span', 'fwe-view-control__label', t('expandScreenshots', this.language));
    mediaRow.append(this.mediaLabel);
    this.mediaSwitchButton = element('button', 'fwe-switch');
    this.mediaSwitchButton.type = 'button';
    this.mediaSwitchButton.setAttribute('role', 'switch');
    this.mediaSwitchButton.setAttribute('aria-label', t('expandScreenshotsAria', this.language));
    this.mediaSwitchButton.append(element('span', 'fwe-switch__thumb'));
    mediaRow.append(this.mediaSwitchButton);

    const infiniteRow = element('div', 'fwe-view-control__row');
    this.infiniteLabel = element('span', 'fwe-view-control__label', t('infiniteScroll', this.language));
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

    const langRow = element('div', 'fwe-view-control__row');
    this.languageLabel = element('span', 'fwe-view-control__label', t('language', this.language));
    langRow.append(this.languageLabel);

    const segmented = element('div', 'fwe-segmented');
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

    panel.append(layoutRow, mediaRow, infiniteRow, ratingRow, langRow);
    this.viewControl.append(viewSummary, panel);
    this.mountControls();
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
    this.enButton.addEventListener('click', () => void this.setLanguage('en'));
    this.zhButton.addEventListener('click', () => void this.setLanguage('zh-CN'));
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
    const [mode, mediaExpanded, infiniteScroll, showRatings, language] = await Promise.all([
      readStoredLayoutMode(),
      readStoredMediaExpand(),
      readStoredInfiniteScroll(),
      readStoredShowRatings(),
      readStoredLanguage(),
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

  private async setLanguage(lang: SupportedLanguage): Promise<void> {
    if (this.language === lang) return;
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
    this.languageLabel.textContent = t('language', lang);

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

    // Update relative time badges
    document.querySelectorAll<HTMLElement>('.fwe-time-ago').forEach((el) => {
      const iso = el.dataset.dateIso;
      if (iso) {
        const date = new Date(iso);
        if (!isNaN(date.getTime())) {
          el.textContent = formatRelativeTime(date, new Date(), lang);
        }
      }
    });

    // Update Pink Paw badge text if present
    document.querySelectorAll<HTMLElement>('.fwe-paw-badge').forEach((el) => {
      el.textContent = t('pinkPawBadge', lang);
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

  private async setInfiniteScroll(enabled: boolean): Promise<void> {
    this.infiniteSwitchButton.disabled = true;
    await writeStoredInfiniteScroll(enabled);
    this.infiniteScroll = enabled;
    this.applyInfiniteScroll(enabled);
    this.infiniteSwitchButton.disabled = false;
  }

  private applyInfiniteScroll(enabled: boolean): void {
    this.infiniteSwitchButton.setAttribute('aria-checked', String(enabled));
    const nav = document.querySelector<HTMLElement>(
      '#content > .navigation, #content > .paging-navigation',
    );
    const sentinel = document.querySelector<HTMLElement>('#content > .fwe-infinite-sentinel');
    if (enabled && this.mode === 'enhanced') {
      if (nav) nav.style.display = 'none';
      if (sentinel) sentinel.style.display = '';
      this.setupInfiniteScroll();
    } else {
      if (nav) nav.style.display = '';
      if (sentinel) sentinel.style.display = 'none';
      this.infiniteObserver?.disconnect();
      this.infiniteObserver = null;
    }
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
    this.transaction = new DomTransaction();
    document.querySelectorAll<HTMLElement>('.widget_archive').forEach((widget) => {
      this.transaction?.addClass(widget, 'fwe-source-hidden');
    });
    this.initRatingObserver();
    this.prepareNavigation();
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
    this.ratingPopover.hide(0);
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
        this.transaction.insert(stream, content, streamAnchor);
      } else if (stream.previousElementSibling !== (upcomingArticle ?? pageHeader)) {
        content.insertBefore(stream, streamAnchor);
      }

      stream.setAttribute('data-cols', String(targetColCount));
      stream.style.setProperty('--fwe-cols', String(targetColCount));

      // Strict Row-Aligned Grid:
      // Cards are direct children of .fwe-stream and ordered left-to-right, row-by-row
      cardsToLayout.forEach((card, index) => {
        const header = card.querySelector<HTMLElement>('.entry-header');
        if (header) {
          const badge = header.querySelector<HTMLElement>('.fwe-order-badge');
          const expectedBadgeText = `#${index + 1}`;
          const expectedRank = String(index + 1);
          if (badge) {
            if (badge.textContent !== expectedBadgeText) {
              badge.textContent = expectedBadgeText;
            }
            if (badge.getAttribute('data-rank') !== expectedRank) {
              badge.setAttribute('data-rank', expectedRank);
            }
          } else {
            const newBadge = element('span', 'fwe-order-badge', expectedBadgeText);
            newBadge.setAttribute('data-rank', expectedRank);
            this.transaction?.insert(newBadge, header, header.firstChild);
          }
        }
        const expectedRank = index < 3 ? String(index + 1) : null;
        if (card.getAttribute('data-fwe-rank') !== expectedRank) {
          this.transaction?.setAttribute(card, 'data-fwe-rank', expectedRank);
        }

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

  private async loadNextPage(): Promise<void> {
    if (this.loadingNextPage || !this.hasNextPage || !this.infiniteScroll) return;

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
      const loader = element('div', 'fwe-infinite-loader');
      loader.append(
        element('span', 'fwe-infinite-loader__spinner'),
        document.createTextNode(t('infiniteLoading')),
      );
      sentinel.append(loader);
    }

    try {
      const response = await fetch(nextLink.href, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      // Extract new article elements
      const newArticles = [
        ...doc.querySelectorAll<HTMLElement>('#content article.hentry, article.hentry'),
      ];

      // Filter out existing cards
      const existingIds = new Set(
        [...document.querySelectorAll<HTMLElement>('article.hentry')]
          .map((a) => a.id)
          .filter(Boolean),
      );
      const incomingArticles = newArticles.filter((a) => !a.id || !existingIds.has(a.id));

      const content = document.querySelector<HTMLElement>('#content');
      if (content && incomingArticles.length > 0) {
        const frag = document.createDocumentFragment();
        for (const art of incomingArticles) {
          if (
            !art.matches(
              '.fwe-upcoming, .category-upcoming, .fwe-directory-popular, .fwe-directory-az, .fwe-directory-updates',
            )
          ) {
            frag.append(art);
          }
        }
        if (sentinel) {
          content.insertBefore(frag, sentinel);
        } else {
          content.append(frag);
        }
      }

      // Update pagination navigation with next page links
      const newNav = doc.querySelector<HTMLElement>(
        '#content > .navigation, #content > .paging-navigation',
      );
      const currentNav = document.querySelector<HTMLElement>(
        '#content > .navigation, #content > .paging-navigation',
      );
      if (newNav && currentNav) {
        currentNav.innerHTML = newNav.innerHTML;
      } else if (!doc.querySelector('#content .nav-links a.next')) {
        this.hasNextPage = false;
      }

      if (sentinel) {
        sentinel.innerHTML = '';
      }
    } catch {
      if (sentinel) {
        sentinel.innerHTML = '';
        const retryBtn = element('button', 'fwe-infinite-loader', t('infiniteRetry'));
        retryBtn.style.cursor = 'pointer';
        retryBtn.addEventListener('click', () => void this.loadNextPage());
        sentinel.append(retryBtn);
      }
    } finally {
      this.loadingNextPage = false;
      if (this.observerTimer !== null) {
        window.clearTimeout(this.observerTimer);
        this.observerTimer = null;
      }
      this.processArticles();
    }
  }
}
