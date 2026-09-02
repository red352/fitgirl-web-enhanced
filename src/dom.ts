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

function findInfoBlock(entry: HTMLElement): HTMLElement | null {
  return (
    [...entry.children].find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        /(?:Genres\/Tags|Original Size|Repack Size)/i.test(child.textContent ?? ''),
    ) ?? null
  );
}

function collectSections(entry: HTMLElement): Map<SectionKind, ArticleSection> {
  const sections = new Map<SectionKind, ArticleSection>();
  const children = [...entry.children].filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!child) continue;
    const kind = classifySectionHeading(child);
    if (!kind) continue;

    let end = index + 1;
    while (end < children.length) {
      const candidate = children[end];
      if (!candidate || classifySectionHeading(candidate) || candidate.matches('.su-spoiler'))
        break;
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

  const spoiler = entry.querySelector<HTMLElement>(':scope > .su-spoiler');
  if (spoiler) {
    sections.set('description', { kind: 'description', heading: null, nodes: [spoiler] });
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

  const infoBlock = findInfoBlock(entry);
  const sections = collectSections(entry);
  const repackHeading =
    [...entry.children].find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        /^H[2-4]$/.test(child.tagName) &&
        !classifySectionHeading(child),
    ) ?? null;
  const cover = infoBlock?.querySelector<HTMLImageElement>('img') ?? null;

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
