export type LayoutMode = 'enhanced' | 'original';

export type PageKind = 'single' | 'listing';

export type ArticleKind = 'game' | 'upcoming' | 'special';

export type SectionKind = 'downloads' | 'screenshots' | 'features' | 'description';

export interface MediaItem {
  element: HTMLAnchorElement;
  image: HTMLImageElement | null;
  video: HTMLVideoElement | null;
}

export interface FactLink {
  text: string;
  href: string;
}

export interface GameFact {
  label: 'Genres/Tags' | 'Company' | 'Languages' | 'Original Size' | 'Repack Size';
  value: string;
  links: FactLink[];
}

export interface ArticleSection {
  kind: SectionKind;
  heading: HTMLElement | null;
  nodes: HTMLElement[];
}

export interface ParsedArticle {
  root: HTMLElement;
  kind: ArticleKind;
  pageKind: PageKind;
  header: HTMLElement | null;
  entry: HTMLElement | null;
  title: string;
  titleLink: HTMLAnchorElement | null;
  repackHeading: HTMLElement | null;
  infoBlock: HTMLElement | null;
  cover: HTMLImageElement | null;
  sections: Map<SectionKind, ArticleSection>;
  media: MediaItem[];
}

export interface UpcomingItem {
  text: string;
  href: string | null;
}

export interface PopularItem {
  rank: number;
  title: string;
  href: string;
  imageUrl: string | null;
}

export interface NavigationItem {
  title: string;
  href: string;
  target: string | null;
  rel: string | null;
  children: NavigationItem[];
}

export interface ArchiveItem {
  label: string;
  href: string;
  count: string;
}

export interface ArchiveGroup {
  year: string;
  items: ArchiveItem[];
}

export interface LightboxMedia {
  type: 'image' | 'video';
  src: string;
  hdSrc?: string;
  externalUrl?: string;
  alt: string;
}

export interface StoredLayoutPreference {
  mode: LayoutMode;
  updatedAt: number;
}

export interface StoredMediaPreference {
  expanded: boolean;
  updatedAt: number;
}

export interface DomRestoreRecord {
  node: Node;
  parent: Node;
  nextSibling: Node | null;
}

export interface AttributeRestoreRecord {
  element: Element;
  name: string;
  existed: boolean;
  value: string | null;
}
