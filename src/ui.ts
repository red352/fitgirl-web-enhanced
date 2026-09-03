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
  getFastStoredInfiniteScroll,
  getFastStoredLayoutMode,
  getFastStoredMediaExpand,
  readStoredInfiniteScroll,
  readStoredLayoutMode,
  readStoredMediaExpand,
  writeStoredInfiniteScroll,
  writeStoredLayoutMode,
  writeStoredMediaExpand,
} from './preferences';
import type {
  ArchiveGroup,
  ArticleKind,
  LayoutMode,
  LightboxMedia,
  NavigationItem,
  ParsedArticle,
  PopularItem,
} from './types';

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
    this.dialog.setAttribute('aria-label', 'Game Details');

    const panel = element('div', 'fwe-game-dialog__panel');
    const header = element('header', 'fwe-game-dialog__header');

    const titleRow = element('div', 'fwe-game-dialog__title-row');
    const heading = element('h2', 'fwe-game-dialog__title');
    this.titleLink = element('a');
    this.titleText = element('span');
    heading.append(this.titleLink, this.titleText);

    const closeBtn = element('button', 'fwe-icon-button fwe-game-dialog__close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close dialog (Esc)');
    closeBtn.append(createIcon('close'));
    closeBtn.addEventListener('click', () => this.close());
    titleRow.append(heading, closeBtn);

    this.tabsNav = element('nav', 'fwe-game-dialog__tabs');
    this.tabsNav.setAttribute('role', 'tablist');

    this.body = element('div', 'fwe-game-dialog__body');

    header.append(titleRow, this.tabsNav);
    panel.append(header, this.body);
    this.dialog.append(panel);

    // 严谨的防误触遮罩点击关闭
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
        downloads: 'Download Mirrors',
        features: 'Repack Features',
        description: 'Game Description',
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
    btn.append(createIcon('download'), element('span', '', 'Download Mirrors'));
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTab('downloads', btn);
    });
    actions.append(btn);
  }

  if (features) {
    const btn = element('button', 'fwe-card-btn');
    btn.type = 'button';
    btn.append(createIcon('features'), element('span', '', 'Features'));
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTab('features', btn);
    });
    actions.append(btn);
  }

  if (description) {
    const btn = element('button', 'fwe-card-btn');
    btn.type = 'button';
    btn.append(createIcon('description'), element('span', '', 'Description'));
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
    { kind: 'downloads', label: 'Download Mirrors', icon: 'download' },
    { kind: 'features', label: 'Repack Features', icon: 'features' },
    { kind: 'description', label: 'Game Description', icon: 'description' },
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

  // 检查是否为带有动态图或直接指向图片/视频文件的 anchor
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(item.element.href)) {
    return { type: 'video', src: item.element.href };
  }

  const rawImgSrc =
    item.image?.currentSrc || item.image?.src || item.image?.getAttribute('src') || '';
  let src = rawImgSrc;
  let hdSrc: string | undefined;

  // 自动将 http 协议升级为 https，避免跨协议阻塞
  if (src.startsWith('http://')) {
    src = src.replace(/^http:\/\//i, 'https://');
  }

  if (src.includes('.240p.jpg')) {
    hdSrc = src.replace(/\.240p\.jpg$/, '');
  } else if (/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(item.element.href)) {
    let directHref = item.element.href;
    if (directHref.startsWith('http://'))
      directHref = directHref.replace(/^http:\/\//i, 'https://');
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
    this.dialog.setAttribute('aria-label', '截图与实机预览');

    const wrapper = element('div', 'fwe-lightbox');

    const header = element('header', 'fwe-lightbox__header');
    const metaGroup = element('div', 'fwe-lightbox__meta');
    this.counter = element('span', 'fwe-lightbox__counter', '1 / 1');
    this.hdBadge = element('span', 'fwe-lightbox__hd-badge', 'HD');
    metaGroup.append(this.counter, this.hdBadge);

    const toolbar = element('div', 'fwe-lightbox__toolbar');

    const zoomOutBtn = element('button', 'fwe-lightbox__btn');
    zoomOutBtn.type = 'button';
    zoomOutBtn.title = '缩小 (Ctrl -)';
    zoomOutBtn.setAttribute('aria-label', '缩小');
    zoomOutBtn.append(createIcon('zoomOut'));
    zoomOutBtn.addEventListener('click', () => this.applyZoom(this.scale * 0.8));

    this.zoomLevelText = element('button', 'fwe-lightbox__zoom-indicator', '100%');
    this.zoomLevelText.type = 'button';
    this.zoomLevelText.title = '重置缩放 (Ctrl 0)';
    this.zoomLevelText.setAttribute('aria-label', '重置缩放');
    this.zoomLevelText.addEventListener('click', () => this.resetZoom());

    const zoomInBtn = element('button', 'fwe-lightbox__btn');
    zoomInBtn.type = 'button';
    zoomInBtn.title = '放大 (Ctrl +)';
    zoomInBtn.setAttribute('aria-label', '放大');
    zoomInBtn.append(createIcon('zoomIn'));
    zoomInBtn.addEventListener('click', () => this.applyZoom(this.scale * 1.25));

    const resetBtn = element('button', 'fwe-lightbox__btn');
    resetBtn.type = 'button';
    resetBtn.title = '自适应重置';
    resetBtn.setAttribute('aria-label', '自适应重置');
    resetBtn.append(createIcon('zoomReset'));
    resetBtn.addEventListener('click', () => this.resetZoom());

    toolbar.append(zoomOutBtn, this.zoomLevelText, zoomInBtn, resetBtn);

    const actions = element('div', 'fwe-lightbox__actions');

    this.externalBtn = element('a', 'fwe-lightbox__btn');
    this.externalBtn.target = '_blank';
    this.externalBtn.rel = 'noopener noreferrer';
    this.externalBtn.title = '在新标签页打开原图网站';
    this.externalBtn.setAttribute('aria-label', '在新标签页打开原图网站');
    this.externalBtn.append(createIcon('external'));

    const closeBtn = element('button', 'fwe-lightbox__btn fwe-lightbox__btn--close');
    closeBtn.type = 'button';
    closeBtn.title = '关闭预览 (Esc)';
    closeBtn.setAttribute('aria-label', '关闭预览');
    closeBtn.append(createIcon('close'));
    closeBtn.addEventListener('click', () => this.close());

    actions.append(this.externalBtn, closeBtn);
    header.append(metaGroup, toolbar, actions);

    const body = element('div', 'fwe-lightbox__body');

    this.prevBtn = element('button', 'fwe-lightbox__nav fwe-lightbox__nav--prev');
    this.prevBtn.type = 'button';
    this.prevBtn.title = '上一张 (←)';
    this.prevBtn.setAttribute('aria-label', '上一张');
    this.prevBtn.append(createIcon('chevronLeft'));
    this.prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.prev();
    });

    this.nextBtn = element('button', 'fwe-lightbox__nav fwe-lightbox__nav--next');
    this.nextBtn.type = 'button';
    this.nextBtn.title = '下一张 (→)';
    this.nextBtn.setAttribute('aria-label', '下一张');
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

function addArticleMeta(article: ParsedArticle, transaction: DomTransaction): void {
  const header = article.header;
  if (!header || header.querySelector('.fwe-article-meta')) return;
  const timeNode = header.querySelector<HTMLTimeElement>('time');
  const originalDate = header.querySelector<HTMLElement>('.entry-date') || timeNode;
  if (!originalDate && !timeNode) return;

  const displayDateText = (timeNode?.textContent || originalDate?.textContent || '').trim();
  const meta = element('div', 'fwe-article-meta');
  meta.append(createIcon('calendar'), document.createTextNode(displayDateText));
  transaction.insert(meta, header);

  // 在标题行右侧注入相对发布时间徽章
  const title = header.querySelector<HTMLElement>('.entry-title');
  if (title && !header.querySelector('.fwe-time-ago')) {
    const parsedDate = parseArticleDate(originalDate, header);
    let timeText = displayDateText;
    if (parsedDate) {
      timeText = formatRelativeTime(parsedDate);
    }
    const rightBox = element('div', 'fwe-header-right');
    const timeBadge = element('span', 'fwe-time-ago', timeText);
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
  private infiniteScroll: boolean;
  private transaction: DomTransaction | null = null;
  private observer: MutationObserver | null = null;
  private videoObserver: IntersectionObserver | null = null;
  private infiniteObserver: IntersectionObserver | null = null;
  private processing = false;
  private loadingNextPage = false;
  private hasNextPage = true;
  private observerTimer: number | null = null;
  private readonly viewControl: HTMLDetailsElement;
  private readonly switchButton: HTMLButtonElement;
  private readonly mediaSwitchButton: HTMLButtonElement;
  private readonly infiniteSwitchButton: HTMLButtonElement;
  private readonly popularButton: HTMLButtonElement;
  private readonly browseButton: HTMLButtonElement;
  private readonly popularDialog: HTMLDialogElement;
  private readonly browseDialog: HTMLDialogElement;
  private readonly searchForm: HTMLFormElement;
  private readonly lightbox: ImageLightbox;
  private readonly gameModal: GameDetailModal;
  private readonly hasPopularItems: boolean;
  private lastDialogTrigger: HTMLElement | null = null;
  private activeColCount = 2;
  private resizeListenerAttached = false;

  constructor() {
    this.mode = getFastStoredLayoutMode();
    this.mediaExpanded = getFastStoredMediaExpand();
    this.infiniteScroll = getFastStoredInfiniteScroll();
    this.lightbox = new ImageLightbox();
    this.gameModal = new GameDetailModal();

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

    const infiniteRow = element('div', 'fwe-view-control__row');
    infiniteRow.append(element('span', 'fwe-view-control__label', 'Infinite Scroll'));
    this.infiniteSwitchButton = element('button', 'fwe-switch');
    this.infiniteSwitchButton.type = 'button';
    this.infiniteSwitchButton.setAttribute('role', 'switch');
    this.infiniteSwitchButton.setAttribute('aria-label', '切换瀑布流无限滚动加载');
    this.infiniteSwitchButton.append(element('span', 'fwe-switch__thumb'));
    infiniteRow.append(this.infiniteSwitchButton);

    panel.append(layoutRow, mediaRow, infiniteRow);
    this.viewControl.append(viewSummary, panel);
    this.mountControls();
    this.applyMode(this.mode);
    this.applyMediaExpand(this.mediaExpanded);
    this.applyInfiniteScroll(this.infiniteScroll);

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
    const [mode, mediaExpanded, infiniteScroll] = await Promise.all([
      readStoredLayoutMode(),
      readStoredMediaExpand(),
      readStoredInfiniteScroll(),
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

    // 暂停 Observer 避免自身 DOM 重组触发无限循环
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

    // 始终依据最初发现的序号固定排序，无论之后卡片被移动到哪一列，顺序始终严格恒定
    cardsToLayout.sort((a, b) => {
      const seqA = Number(a.getAttribute('data-fwe-seq')) || 0;
      const seqB = Number(b.getAttribute('data-fwe-seq')) || 0;
      return seqA - seqB;
    });

    if (!isSingle && content) {
      // 隐藏 content 下所有非文章非导航的游离杂项，彻底解决排版空白抢占
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

      // 确保 Upcoming Repacks 位于内容区最顶部（或紧随 page-header 之后）
      if (upcomingArticle) {
        const expectedAnchor = pageHeader ? pageHeader.nextSibling : content.firstChild;
        if (
          upcomingArticle.parentElement !== content ||
          upcomingArticle.previousElementSibling !== pageHeader
        ) {
          this.transaction.move(upcomingArticle, content, expectedAnchor);
        }
      }

      // 获取或创建流式网格容器
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

      // 方案 A：严谨行对齐网格（Strict Row-Aligned Grid）
      // 卡片直接作为 .fwe-stream 的直接子网格项（Grid Item），按发布时间自左向右、逐行排开！
      // 彻底废除多立柱隔离导致的垂直时间线割裂与高差颠倒问题。
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
          // 仅当卡片在 stream 内部的位置与期望排序不一致时才做精准重排
          stream.insertBefore(card, stream.children[index] ?? null);
        }
      });

      // 确保无限滚动哨兵与分页导航位于瀑布流之后
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

      // 根据当前首选项决定是否激活无限滚动
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

      // 强效防御：仅当确有未就绪的新 article 节点被插入时才响应
      // 彻底屏蔽 Dark Reader 注入的 style 标签、内联样式修改或微小 DOM 扰动
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

    // 寻找原生分页中的“下一页”链接
    const nextLink = document.querySelector<HTMLAnchorElement>(
      '#content .nav-links a.next, #content .paging-navigation a.next, #content .pagination a.next',
    );
    if (!nextLink?.href) {
      this.hasNextPage = false;
      const sentinel = document.querySelector<HTMLElement>('#content > .fwe-infinite-sentinel');
      if (sentinel) {
        sentinel.innerHTML = '';
        sentinel.append(element('div', 'fwe-infinite-end', 'All repacks loaded'));
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
        document.createTextNode('Loading more repacks...'),
      );
      sentinel.append(loader);
    }

    try {
      const response = await fetch(nextLink.href, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      // 提取新文档中的所有文章卡片
      const newArticles = [
        ...doc.querySelectorAll<HTMLElement>('#content article.hentry, article.hentry'),
      ];

      // 过滤掉已经在当前页面中渲染过的 ID
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
          // 排除 upcoming / digest / special 目录页
          if (
            !art.matches(
              '.fwe-upcoming, .category-upcoming, .fwe-directory-popular, .fwe-directory-az, .fwe-directory-updates',
            )
          ) {
            frag.append(art);
          }
        }
        // 追加到 content 中（此时 sentinel 前面）
        if (sentinel) {
          content.insertBefore(frag, sentinel);
        } else {
          content.append(frag);
        }
      }

      // 更新分页导航链接为下一页的导航
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
        const retryBtn = element('button', 'fwe-infinite-loader', 'Retry loading more');
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
