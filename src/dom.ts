import type {
  ArticleKind,
  ArticleSection,
  AttributeRestoreRecord,
  DomRestoreRecord,
  GameFact,
  LayoutMode,
  MediaItem,
  NavigationItem,
  PageKind,
  ParsedArticle,
  PopularItem,
  UpcomingItem,
  ArchiveGroup,
  SectionKind,
} from './types';

export const STORAGE_KEY = 'fitgirl-web-enhanced:v1:layout-mode';

const SECTION_LABELS: Array<[SectionKind, RegExp]> = [
  ['downloads', /^download\s+mirrors?/i],
  ['screenshots', /^screenshots?/i],
  ['features', /^repack\s+features?/i],
];

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function readLayoutMode(storage: Storage = window.localStorage): LayoutMode {
  try {
    const value = storage.getItem(STORAGE_KEY);
    return value === 'original' || value === 'enhanced' ? value : 'enhanced';
  } catch {
    return 'enhanced';
  }
}

export function writeLayoutMode(mode: LayoutMode, storage: Storage = window.localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, mode);
  } catch {
    // 禁用本地存储时仍允许当前页面正常切换。
  }
}

export function detectPageKind(body: HTMLElement = document.body): PageKind {
  return body.classList.contains('single-post') ? 'single' : 'listing';
}

export function classifySectionHeading(element: Element): SectionKind | null {
  if (!/^H[2-4]$/.test(element.tagName)) return null;
  const text = normalizeText(element.textContent);
  return SECTION_LABELS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

function textWithBreaks(element: Element): string[] {
  const clone = element.cloneNode(true);
  if (!(clone instanceof Element)) return [];
  clone.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
  return (clone.textContent ?? '')
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean);
}

function findValue(lines: string[], labels: string[]): string {
  for (const line of lines) {
    for (const label of labels) {
      const match = line.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, 'i'));
      if (match?.[1]) return normalizeText(match[1]);
    }
  }
  return '';
}

function findInlineValue(text: string, labels: string[]): string {
  const labelPattern = labels.join('|');
  const boundary =
    '(?:Genres/Tags|Compan(?:y|ies)|Languages?|Original Size|Repack Size|Download Mirrors|Filehosters?|Continue reading)';
  const match = text.match(
    new RegExp(`(?:${labelPattern})\\s*:\\s*(.+?)(?=\\s+${boundary}\\s*:?|$)`, 'i'),
  );
  return normalizeText(match?.[1]);
}

export function extractFacts(infoBlock: Element | null): GameFact[] {
  if (!infoBlock) return [];
  const lines = textWithBreaks(infoBlock);
  const inlineText = normalizeText(infoBlock.textContent);
  const tagLinks = [...infoBlock.querySelectorAll<HTMLAnchorElement>('a[href*="/tag/"]')].map(
    (link) => ({ text: normalizeText(link.textContent), href: link.href }),
  );
  const tagText =
    findValue(lines, ['Genres/Tags']) ||
    findInlineValue(inlineText, ['Genres/Tags']) ||
    tagLinks.map((link) => link.text).join(', ');
  const candidates: GameFact[] = [
    { label: 'Genres/Tags', value: tagText, links: tagLinks },
    {
      label: 'Company',
      value:
        findValue(lines, ['Compan(?:y|ies)']) || findInlineValue(inlineText, ['Compan(?:y|ies)']),
      links: [],
    },
    {
      label: 'Languages',
      value: findValue(lines, ['Languages?']) || findInlineValue(inlineText, ['Languages?']),
      links: [],
    },
    {
      label: 'Original Size',
      value: findValue(lines, ['Original Size']) || findInlineValue(inlineText, ['Original Size']),
      links: [],
    },
    {
      label: 'Repack Size',
      value: findValue(lines, ['Repack Size']) || findInlineValue(inlineText, ['Repack Size']),
      links: [],
    },
  ];
  return candidates.filter((fact) => fact.value || fact.links.length > 0);
}

/**
 * 穿透检测内容包装层（如 FitGirl Pink Paw 装饰 div、自定义分节包装等），
 * 返回文章内容真实展平的块级子元素序列与包装容器引用。
 */
export function getEntryContentNodes(entry: HTMLElement): {
  nodes: HTMLElement[];
  wrappers: HTMLElement[];
} {
  const wrappers: HTMLElement[] = [];

  function flatten(elements: HTMLElement[]): HTMLElement[] {
    const result: HTMLElement[] = [];
    for (const el of elements) {
      if (
        el.tagName === 'DIV' &&
        !el.matches(
          '.su-spoiler, .fwe-game-layout, .fwe-detail-sections, .fwe-card-payload, .fwe-description-shell',
        ) &&
        (el.querySelector('h2, h3, h4') ||
          /(?:Genres\/Tags|Original Size|Repack Size)/i.test(el.textContent ?? ''))
      ) {
        const subElements = [...el.children].filter(
          (c): c is HTMLElement => c instanceof HTMLElement,
        );
        if (subElements.length > 0 && (el.querySelector('h2, h3, h4') || subElements.length > 1)) {
          wrappers.push(el);
          result.push(...flatten(subElements));
          continue;
        }
      }
      result.push(el);
    }
    return result;
  }

  const directChildren = [...entry.children].filter(
    (c): c is HTMLElement => c instanceof HTMLElement,
  );
  return { nodes: flatten(directChildren), wrappers };
}

function findInfoBlock(contentNodes: HTMLElement[]): HTMLElement | null {
  return (
    contentNodes.find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        /(?:Genres\/Tags|Original Size|Repack Size)/i.test(child.textContent ?? ''),
    ) ?? null
  );
}

function collectSections(
  contentNodes: HTMLElement[],
  entry: HTMLElement,
): Map<SectionKind, ArticleSection> {
  const sections = new Map<SectionKind, ArticleSection>();
  const children = contentNodes;

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!child) continue;
    const kind = classifySectionHeading(child);
    if (!kind) continue;

    let end = index + 1;
    while (end < children.length) {
      const candidate = children[end];
      if (!candidate || classifySectionHeading(candidate)) break;
      // 遇到独立的 Game Description 剧透块时才结束当前 section
      if (candidate.matches('.su-spoiler')) {
        const titleText = normalizeText(candidate.querySelector('.su-spoiler-title')?.textContent);
        if (/game\s+description/i.test(titleText)) {
          break;
        }
      }
      end += 1;
    }
    const range = children.slice(index, end);
    const existing = sections.get(kind);
    if (existing && kind === 'downloads') {
      existing.nodes.push(...range);
    } else {
      sections.set(kind, { kind, heading: child, nodes: range });
    }
    index = end - 1;
  }

  // 单独精准寻找 Game Description 剧透块
  for (const child of children) {
    if (child.matches('.su-spoiler')) {
      const titleText = normalizeText(child.querySelector('.su-spoiler-title')?.textContent);
      if (/game\s+description/i.test(titleText)) {
        sections.set('description', { kind: 'description', heading: null, nodes: [child] });
        break;
      }
    }
  }

  // 兜底：若未匹配到明确的 Game Description，选择未被 downloads 占用的最后一个 su-spoiler
  if (!sections.has('description')) {
    const downloadsNodes = sections.get('downloads')?.nodes ?? [];
    const allSpoilers = [...entry.querySelectorAll<HTMLElement>('.su-spoiler')];
    const candidate = allSpoilers.reverse().find((s) => !downloadsNodes.includes(s));
    if (candidate) {
      sections.set('description', { kind: 'description', heading: null, nodes: [candidate] });
    }
  }
  return sections;
}

function collectMedia(section: ArticleSection | undefined): MediaItem[] {
  if (!section) return [];
  const anchors = section.nodes.flatMap((node) => [
    ...(node.matches('a') ? [node as HTMLAnchorElement] : []),
    ...node.querySelectorAll<HTMLAnchorElement>('a'),
  ]);
  return anchors
    .filter((anchor, index, all) => all.indexOf(anchor) === index)
    .map((element) => ({
      element,
      image: element.querySelector('img'),
      video: element.querySelector('video'),
    }))
    .filter((item) => item.image || item.video);
}

function detectArticleKind(title: string, infoBlock: HTMLElement | null): ArticleKind {
  if (/^upcoming repacks$/i.test(title)) return 'upcoming';
  return infoBlock ? 'game' : 'special';
}

export function parseArticle(root: HTMLElement, pageKind: PageKind): ParsedArticle {
  const header = root.querySelector<HTMLElement>(':scope > .entry-header');
  const entry = root.querySelector<HTMLElement>(':scope > .entry-content, :scope > .entry-summary');
  const titleElement = header?.querySelector<HTMLElement>('.entry-title') ?? null;
  const titleLink = titleElement?.querySelector<HTMLAnchorElement>('a') ?? null;
  const title = normalizeText(titleElement?.textContent);

  if (!entry) {
    return {
      root,
      kind: 'special',
      pageKind,
      header,
      entry: null,
      title,
      titleLink,
      repackHeading: null,
      infoBlock: null,
      cover: null,
      sections: new Map(),
      media: [],
    };
  }

  const { nodes: contentNodes, wrappers } = getEntryContentNodes(entry);
  const infoBlock = findInfoBlock(contentNodes);
  const sections = collectSections(contentNodes, entry);
  const repackHeading =
    contentNodes.find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        /^H[2-4]$/.test(child.tagName) &&
        !classifySectionHeading(child),
    ) ?? null;
  const cover =
    infoBlock?.querySelector<HTMLImageElement>('img') ??
    contentNodes
      .find((el) => el.tagName === 'P' && el.querySelector('img'))
      ?.querySelector<HTMLImageElement>('img') ??
    null;

  const hasPinkPawAward =
    root.classList.contains('category-pink-paw-award') ||
    Boolean(entry.querySelector('div[style*="paw.png"]'));

  return {
    root,
    kind: detectArticleKind(title, infoBlock),
    pageKind,
    header,
    entry,
    title,
    titleLink,
    repackHeading,
    infoBlock,
    cover,
    sections,
    media: collectMedia(sections.get('screenshots')),
    wrapperContainers: wrappers,
    hasPinkPawAward,
  };
}

export function parsePopularItems(root: Element | null): PopularItem[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .filter((link) => Boolean(link.querySelector('img')))
    .map((link, index) => {
      const image = link.querySelector<HTMLImageElement>('img');
      return {
        rank: index + 1,
        title:
          normalizeText(link.getAttribute('title')) ||
          normalizeText(image?.getAttribute('alt')) ||
          `Popular repack ${index + 1}`,
        href: link.href,
        imageUrl: image?.currentSrc || image?.src || null,
      };
    });
}

function cloneNavigationLink(link: HTMLAnchorElement): Omit<NavigationItem, 'children'> {
  return {
    title: normalizeText(link.textContent),
    href: link.href,
    target: link.getAttribute('target'),
    rel: link.getAttribute('rel'),
  };
}

function parseNavigationList(list: Element): NavigationItem[] {
  return [...list.children]
    .filter((node): node is HTMLElement => node instanceof HTMLElement && node.matches('li'))
    .flatMap((item) => {
      const link = item.querySelector<HTMLAnchorElement>(':scope > a[href]');
      if (!link || !normalizeText(link.textContent)) return [];
      const childList = item.querySelector(':scope > ul');
      return [
        { ...cloneNavigationLink(link), children: childList ? parseNavigationList(childList) : [] },
      ];
    });
}

export function parseNavigation(root: Element | null): NavigationItem[] {
  const list = root?.querySelector(':scope .nav-menu, :scope > ul');
  return list ? parseNavigationList(list) : [];
}

export function parseArchiveGroups(root: Element | null): ArchiveGroup[] {
  const groups = new Map<string, ArchiveGroup>();
  root?.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    const label = normalizeText(link.textContent);
    const year = label.match(/\b(19|20)\d{2}\b/)?.[0] ?? link.href.match(/\/(19|20)\d{2}\//)?.[1];
    if (!label || !year) return;
    const parentText = normalizeText(link.parentElement?.textContent);
    const count = parentText.match(/\((\d+)\)\s*$/)?.[1] ?? '';
    const group = groups.get(year) ?? { year, items: [] };
    group.items.push({ label, href: link.href, count });
    groups.set(year, group);
  });
  return [...groups.values()].sort((left, right) => Number(right.year) - Number(left.year));
}

export function parseUpcomingItems(entry: HTMLElement | null): UpcomingItem[] {
  if (!entry) return [];

  const clone = entry.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.wplp_outside, style, script, noscript').forEach((el) => el.remove());

  const links = [...clone.querySelectorAll<HTMLAnchorElement>('a[href]')].filter((a) => {
    const text = a.textContent?.trim();
    const href = a.getAttribute('href') || '';
    return (
      Boolean(text) &&
      !href.includes('#respond') &&
      !href.includes('/category/') &&
      !href.includes('/author/')
    );
  });

  if (links.length > 0) {
    const items: UpcomingItem[] = [];
    for (const a of links) {
      const text = (a.textContent ?? '')
        .trim()
        .replace(/^[⇢→•\-*·\s]+/, '')
        .trim();
      const href = a.getAttribute('href');
      if (text && !items.some((item) => item.text === text)) {
        items.push({ text, href });
      }
    }
    if (items.length > 0) return items;
  }

  const textContent = clone.innerHTML
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n');

  const container = document.createElement('div');
  container.innerHTML = textContent;
  const lines = (container.textContent ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const items: UpcomingItem[] = [];
  for (const line of lines) {
    if (/DO NOT ASK FOR ANY PARTICULAR/i.test(line)) continue;
    if (/Latest Repacks/i.test(line)) continue;
    if (/^\.wplp/i.test(line)) continue;
    if (/^Upcoming Repacks$/i.test(line)) continue;
    if (/^-->$/i.test(line)) continue;
    if (/^Next:?$/i.test(line)) continue;

    const cleaned = line.replace(/^[⇢→•\-*·\s]+/, '').trim();
    if (cleaned.length > 1 && !items.some((item) => item.text === cleaned)) {
      items.push({ text: cleaned, href: null });
    }
  }

  return items;
}

export class DomTransaction {
  private readonly moved: DomRestoreRecord[] = [];
  private readonly attributes: AttributeRestoreRecord[] = [];
  private readonly generated: Node[] = [];
  private readonly classes: Array<{
    element: Element;
    className: string;
    existed: boolean;
    value: string | null;
  }> = [];
  private readonly cleanups: Array<() => void> = [];

  move(node: Node, parent: Node, before: Node | null = null): void {
    const originalParent = node.parentNode;
    if (!originalParent) return;
    this.moved.push({ node, parent: originalParent, nextSibling: node.nextSibling });
    parent.insertBefore(node, before);
  }

  insert(node: Node, parent: Node, before: Node | null = null): void {
    parent.insertBefore(node, before);
    this.generated.push(node);
  }

  setAttribute(element: Element, name: string, value: string | null): void {
    this.attributes.push({
      element,
      name,
      existed: element.hasAttribute(name),
      value: element.getAttribute(name),
    });
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }

  addClass(element: Element, className: string): void {
    if (element.classList.contains(className)) return;
    this.classes.push({
      element,
      className,
      existed: element.hasAttribute('class'),
      value: element.getAttribute('class'),
    });
    element.classList.add(className);
  }

  onRestore(cleanup: () => void): void {
    this.cleanups.push(cleanup);
  }

  restore(): void {
    for (const cleanup of [...this.cleanups].reverse()) cleanup();
    for (const record of [...this.moved].reverse()) {
      const before = record.nextSibling?.parentNode === record.parent ? record.nextSibling : null;
      record.parent.insertBefore(record.node, before);
    }
    for (const record of [...this.attributes].reverse()) {
      if (record.existed && record.value !== null)
        record.element.setAttribute(record.name, record.value);
      else record.element.removeAttribute(record.name);
    }
    for (const record of [...this.classes].reverse()) {
      if (record.existed && record.value !== null)
        record.element.setAttribute('class', record.value);
      else record.element.removeAttribute('class');
    }
    for (const node of [...this.generated].reverse()) node.parentNode?.removeChild(node);
    this.moved.length = 0;
    this.attributes.length = 0;
    this.classes.length = 0;
    this.generated.length = 0;
    this.cleanups.length = 0;
  }
}

export function parseDateString(str: string): Date | null {
  if (!str) return null;
  const trimmed = str.trim();

  // 1. ISO 8601 或带有时间戳的 YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // 2. 欧洲制 DD/MM/YYYY 或 DD.MM.YYYY 或 DD-MM-YYYY
  const dmyMatch = trimmed.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const day = Number.parseInt(dmyMatch[1], 10);
    const month = Number.parseInt(dmyMatch[2], 10) - 1;
    const year = Number.parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? Number.parseInt(dmyMatch[4], 10) : 0;
    const minute = dmyMatch[5] ? Number.parseInt(dmyMatch[5], 10) : 0;
    const second = dmyMatch[6] ? Number.parseInt(dmyMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, minute, second);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // 3. 英文月份（如 "September 2, 2026"、"02 Sep 2026"）
  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) return fallback;

  return null;
}

export function parseArticleDate(
  dateElement: HTMLElement | null,
  headerElement?: HTMLElement | null,
): Date | null {
  if (!dateElement && !headerElement) return null;

  const timeNode =
    dateElement?.tagName === 'TIME'
      ? (dateElement as HTMLTimeElement)
      : (dateElement?.querySelector?.<HTMLTimeElement>('time') ??
        headerElement?.querySelector?.<HTMLTimeElement>('time'));

  const rawDateTime =
    timeNode?.getAttribute('datetime') ||
    timeNode?.dateTime ||
    dateElement?.getAttribute('datetime');

  if (rawDateTime) {
    const parsed = parseDateString(rawDateTime);
    if (parsed) return parsed;
  }

  const text = normalizeText(timeNode?.textContent || dateElement?.textContent);
  if (text) {
    const parsed = parseDateString(text);
    if (parsed) return parsed;
  }

  return null;
}

export function formatRelativeTime(targetDate: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - targetDate.getTime();

  if (diffMs <= 0) {
    return 'Today';
  }

  const diffHours = diffMs / (1000 * 60 * 60);
  const todayCalendar = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetCalendar = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  ).getTime();
  const calendarDayDiff = Math.round((todayCalendar - targetCalendar) / 86400000);

  if (calendarDayDiff <= 0 || diffHours < 18) {
    return 'Today';
  }

  if (calendarDayDiff === 1 || (diffHours >= 18 && diffHours < 42)) {
    return 'Yesterday';
  }

  const days = Math.max(2, Math.floor(diffHours / 24));
  if (days < 7) {
    return `${days}d ago`;
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
