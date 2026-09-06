import type { GameRatingData, SupportedLanguage } from './types';

export const RATING_CACHE_PREFIX = 'fitgirl-web-enhanced:v1:rating:';
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // Cache hits for 7 days
export const NEGATIVE_CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // Cache misses for 3 days

interface CacheEntry {
  data: GameRatingData | null;
  timestamp: number;
}

/**
 * Rapidly probes Steam store links and AppIDs directly from element DOM (0ms fast path).
 */
export function extractSteamAppIdFromElement(element: HTMLElement): number | null {
  const links = element.querySelectorAll<HTMLAnchorElement>(
    'a[href*="store.steampowered.com/app/"]',
  );
  for (const link of links) {
    const match = link.href.match(/store\.steampowered\.com\/app\/(\d+)/i);
    if (match?.[1]) {
      const id = Number.parseInt(match[1], 10);
      if (Number.isFinite(id) && id > 0) {
        return id;
      }
    }
  }
  return null;
}

/**
 * Intelligent title sanitizer: strips FitGirl repack numbers, version tags, build numbers, and DLC markers.
 */
export function cleanTitleBase(raw: string): string {
  let text = raw;
  // 0. Normalize quotes and special punctuation
  text = text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  // 1. Remove FitGirl Repack numbers (e.g. "#1500 ")
  text = text.replace(/^#\d+\s+/, '');
  // 2. Remove trailing version/update info after dashes (e.g. " – v1.12.3 + All DLCs", " - Build 1491.50")
  text = text.replace(/\s*[–—-]\s+.*$/, '');
  // 3. Remove bundled extras attached to the main title (e.g. "+ Soundtrack Bundle", "+ Bonus OST", "+ All DLCs*", "+ Artbook")
  text = text.replace(
    /\s*\+\s*(All DLCs?|DLCs?|Soundtrack( Bundle)?|Bonus OST|OST|Artbook|Goodies|Wallpapers|Score|Expansions?|Add[- ]?ons?)\b.*$/i,
    '',
  );
  // 4. Remove inline version patterns like "v1.1", "v2.0.4a", "Build 12345"
  text = text.replace(/\b(v\d+(\.\d+)*[a-z]?|Build\s+\d+(\.\d+)*)\b/gi, '');
  // 5. Remove brackets and parenthesized annotations (e.g. "[FitGirl Repack]", "(MULTi8)", "(Denuvoless)")
  text = text.replace(/\s*(\[[^\]]*\]|\([^)]*\))\s*/g, ' ');
  // 6. Remove asterisk * and other noise characters
  text = text.replace(/[*~]/g, '');
  // 7. Remove trailing commas, hyphens, plus signs
  text = text.replace(/[\s,+–—-]+$/, '');
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Generates ranked candidate queries for Steam search fallback.
 */
export function generateTitleCandidates(raw: string): string[] {
  const candidates: string[] = [];
  const base = cleanTitleBase(raw);
  if (!base) return [];

  // If title contains slash aliases (e.g. "Grand Theft Auto V / GTA V"), split into separate candidates
  if (base.includes('/')) {
    const parts = base.split('/').map((p) => p.trim());
    for (const part of parts) {
      if (part.length >= 2) {
        candidates.push(part);
      }
    }
  }

  // Strip release edition suffixes (e.g. ": Ultimate Edition", ": Eclipse Edition", "Deluxe Edition", "GOTY Edition")
  const noEdition = base.replace(/[:\-–—]?\s*\b([A-Za-z0-9'’-]+\s+)?Edition\*?\b/gi, '').trim();
  if (noEdition && noEdition !== base && noEdition.length >= 2) {
    // Prioritize clean base title without edition suffix (e.g. "The Blood of Dawnwalker" or "Dragon's Dogma 2")
    candidates.push(noEdition);
  }

  // Next candidate: full cleaned base title
  candidates.push(base);

  // If title contains subtitle separated by colon, extract main title (e.g. "Elden Ring: Shadow of the Erdtree" -> "Elden Ring")
  if (base.includes(':')) {
    const mainTitle = base.split(':')[0]?.trim();
    if (mainTitle && mainTitle.length >= 2 && !candidates.includes(mainTitle)) {
      candidates.push(mainTitle);
    }
  }

  return [...new Set(candidates.filter((c) => c.length >= 2))];
}

/**
 * Normalizes text for similarity comparison.
 */
function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[:\-–—_,.!?']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes title similarity (Token Jaccard / subset overlap) to avoid false matches.
 */
export function calculateTitleSimilarity(query: string, candidate: string): number {
  const normQ = normalizeForComparison(query);
  const normC = normalizeForComparison(candidate);

  if (normQ === normC) return 1.0;
  if (normC.startsWith(normQ) || normQ.startsWith(normC)) return 0.9;

  const tokensQ = new Set(normQ.split(' ').filter((t) => t.length > 1));
  const tokensC = new Set(normC.split(' ').filter((t) => t.length > 1));

  if (tokensQ.size === 0 || tokensC.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensQ) {
    if (tokensC.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...tokensQ, ...tokensC]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Dispatches an HTTP request (prefers GM_xmlhttpRequest to bypass CORS, falls back to fetch).
 */
export function makeRequest(url: string): Promise<string> {
  const globalScope = globalThis as unknown as {
    GM_xmlhttpRequest?: (options: {
      method: string;
      url: string;
      timeout?: number;
      onload?: (res: { status: number; responseText: string }) => void;
      onerror?: (err: unknown) => void;
      ontimeout?: () => void;
    }) => void;
  };
  const gmRequest = globalScope.GM_xmlhttpRequest;
  if (typeof gmRequest === 'function') {
    return new Promise((resolve, reject) => {
      gmRequest({
        method: 'GET',
        url,
        timeout: 10000,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            resolve(res.responseText);
          } else {
            reject(new Error(`HTTP ${res.status}`));
          }
        },
        onerror: (err) => reject(err),
        ontimeout: () => reject(new Error('Request timeout')),
      });
    });
  }

  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  });
}

/**
 * Local persistent cache manager for game ratings.
 */
export class RatingCache {
  private readonly memory = new Map<string, CacheEntry>();

  get(key: string): CacheEntry | null {
    const mem = this.memory.get(key);
    if (mem) {
      const now = Date.now();
      const ttl = mem.data ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS;
      if (now - mem.timestamp < ttl) return mem;
      this.memory.delete(key);
    }

    try {
      const storageKey = `${RATING_CACHE_PREFIX}${key}`;
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CacheEntry;
      const now = Date.now();
      const ttl = parsed.data ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS;
      if (now - parsed.timestamp < ttl) {
        this.memory.set(key, parsed);
        return parsed;
      }
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage read errors
    }
    return null;
  }

  set(key: string, data: GameRatingData | null): void {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    this.memory.set(key, entry);
    try {
      const storageKey = `${RATING_CACHE_PREFIX}${key}`;
      window.localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch {
      // Ignore quota exceeded errors
    }
  }

  delete(key: string): void {
    this.memory.delete(key);
    try {
      const storageKey = `${RATING_CACHE_PREFIX}${key}`;
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore removal errors
    }
  }
}

export const globalRatingCache = new RatingCache();

/**
 * Steam rating description mapping (English <-> Simplified Chinese).
 */
export const STEAM_SCORE_MAP: Record<string, string> = {
  'Overwhelmingly Positive': '好评如潮',
  'Very Positive': '特别好评',
  Positive: '好评',
  'Mostly Positive': '多半好评',
  Mixed: '褒贬不一',
  'Mostly Negative': '多半差评',
  Negative: '差评',
  'Very Negative': '特别差评',
  'Overwhelmingly Negative': '差评如潮',
};

export const CHINESE_TO_STEAM_SCORE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(STEAM_SCORE_MAP).map(([en, zh]) => [zh, en]),
);

export function translateScoreDesc(desc: string, lang?: SupportedLanguage): string {
  if (lang === 'en') {
    return CHINESE_TO_STEAM_SCORE_MAP[desc] ?? desc;
  }
  return STEAM_SCORE_MAP[desc] ?? desc;
}

interface SteamStoreSearchItem {
  id: number;
  name: string;
  metascore?: string;
}

interface SteamStoreSearchResult {
  total: number;
  items?: SteamStoreSearchItem[];
}

interface SteamReviewsResult {
  success: number;
  query_summary?: {
    review_score: number;
    review_score_desc: string;
    total_positive: number;
    total_negative: number;
    total_reviews: number;
  };
}

/**
 * Searches Steam store for matching candidates and extracts base rating data.
 */
export async function resolveRatingByCandidates(
  candidates: string[],
): Promise<{ appId: number; name: string; metascore?: number } | null> {
  for (const candidate of candidates) {
    try {
      const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(candidate)}&l=english&cc=US`;
      const text = await makeRequest(url);
      const json = JSON.parse(text) as SteamStoreSearchResult;
      if (json.items && json.items.length > 0) {
        // Prioritize standalone base game entries over DLC, soundtracks, and expansion packs
        const sortedItems = [...json.items].sort((a, b) => {
          const aIsAddon = /\b(content|dlc|pack|soundtrack|expansion|season pass)\b/i.test(a.name);
          const bIsAddon = /\b(content|dlc|pack|soundtrack|expansion|season pass)\b/i.test(b.name);
          if (aIsAddon && !bIsAddon) return 1;
          if (!aIsAddon && bIsAddon) return -1;
          return 0;
        });

        // Verify similarity between candidate query and matched title
        for (const item of sortedItems.slice(0, 3)) {
          const sim = calculateTitleSimilarity(candidate, item.name);
          if (sim >= 0.35) {
            const metascore = item.metascore ? Number.parseInt(item.metascore, 10) : undefined;
            return {
              appId: item.id,
              name: item.name,
              metascore: Number.isFinite(metascore) ? metascore : undefined,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[FitGirl Rating] Search candidate failed:', candidate, err);
    }
  }
  return null;
}

/**
 * Fetches Steam player review statistics and metadata by AppID.
 * If target AppID is DLC or an add-on, automatically traces back to parent full game via appdetails.
 */
export async function fetchSteamReviews(
  appId: number,
  fallbackName?: string,
  initialMetascore?: number,
): Promise<GameRatingData | null> {
  try {
    let targetAppId = appId;
    let targetName = fallbackName || `App ${appId}`;
    let metascore = initialMetascore;

    // Check appdetails to detect DLC/extras and resolve parent game AppID and Metacritic score
    try {
      const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
      const detailsText = await makeRequest(detailsUrl);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detailsJson = JSON.parse(detailsText) as Record<string, any>;
      const appData = detailsJson?.[String(appId)]?.data;
      if (appData) {
        if (appData.type === 'dlc' || appData.type === 'music' || appData.fullgame?.appid) {
          if (appData.fullgame?.appid) {
            targetAppId = Number.parseInt(appData.fullgame.appid, 10);
            if (appData.fullgame.name) {
              targetName = appData.fullgame.name;
            }
          }
        } else if (appData.name) {
          targetName = appData.name;
        }

        if (metascore === undefined && typeof appData.metacritic?.score === 'number') {
          metascore = appData.metacritic.score;
        }
      }
    } catch {
      // Fallback directly to querying review API with initial AppID
    }

    const url = `https://store.steampowered.com/appreviews/${targetAppId}?json=1&language=all&purchase_type=all&num_per_page=0`;
    const text = await makeRequest(url);
    const json = JSON.parse(text) as SteamReviewsResult;
    const summary = json.query_summary;

    if (!summary || summary.total_reviews <= 0) {
      return null;
    }

    const positivePercent = Math.round((summary.total_positive / summary.total_reviews) * 100);
    // Standardize scoreDesc in English (e.g. 'Very Positive')
    const rawScoreDesc = summary.review_score_desc;

    return {
      appId: targetAppId,
      name: targetName,
      positivePercent,
      scoreDesc: rawScoreDesc,
      totalReviews: summary.total_reviews,
      totalPositive: summary.total_positive,
      totalNegative: summary.total_negative,
      metascore,
      steamUrl: `https://store.steampowered.com/app/${targetAppId}/`,
      steamDbUrl: `https://steamdb.info/app/${targetAppId}/`,
      metacriticUrl: metascore
        ? `https://www.metacritic.com/search/${encodeURIComponent(targetName)}/`
        : undefined,
    };
  } catch (err) {
    console.warn('[FitGirl Rating] Fetch reviews failed for appId:', appId, err);
    return null;
  }
}

/**
 * Unified entry point: resolves and fetches Steam rating data for an article title.
 */
export async function getGameRating(
  title: string,
  articleRoot?: HTMLElement,
  forceRefresh = false,
): Promise<GameRatingData | null> {
  const cacheKey = title.trim().toLowerCase();
  if (!forceRefresh) {
    const cached = globalRatingCache.get(cacheKey);
    if (cached) {
      return cached.data;
    }
  } else {
    globalRatingCache.delete(cacheKey);
  }

  let appId: number | null = null;
  let gameName = title;
  let metascore: number | undefined;

  // Tier 1: Check element DOM for existing Steam store link
  if (articleRoot) {
    appId = extractSteamAppIdFromElement(articleRoot);
  }

  // Tier 2 & 3: If no link in DOM, search candidate titles
  if (!appId) {
    const candidates = generateTitleCandidates(title);
    const match = await resolveRatingByCandidates(candidates);
    if (match) {
      appId = match.appId;
      gameName = match.name;
      metascore = match.metascore;
    }
  }

  if (!appId) {
    globalRatingCache.set(cacheKey, null);
    return null;
  }

  // Tier 5: Fetch review details (resolves DLC to parent game when appropriate)
  const ratingData = await fetchSteamReviews(appId, gameName, metascore);
  globalRatingCache.set(cacheKey, ratingData);
  return ratingData;
}

/**
 * Concurrency throttling queue to prevent Steam API rate limiting (HTTP 429).
 */
export class RequestQueue {
  private readonly queue: Array<() => Promise<void>> = [];
  private activeCount = 0;
  private readonly maxConcurrent: number;
  private readonly delayMs: number;

  constructor(maxConcurrent = 2, delayMs = 120) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
  }

  add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  private processNext(): void {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) return;
    const task = this.queue.shift();
    if (!task) return;

    this.activeCount += 1;
    void task().finally(() => {
      this.activeCount -= 1;
      setTimeout(() => this.processNext(), this.delayMs);
    });
  }
}

export const globalRatingQueue = new RequestQueue(2, 150);
