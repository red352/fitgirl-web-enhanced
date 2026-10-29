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
        timeout: 6000,
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

export type SteamSearchResolution =
  | { status: 'matched'; appId: number; name: string; metascore?: number }
  | { status: 'not-found' }
  | { status: 'unavailable' };

export type GameRatingLookupStatus = 'ready' | 'unmatched' | 'unavailable';

export interface GameRatingLookup {
  status: GameRatingLookupStatus;
  data: GameRatingData | null;
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

const STEAM_REVIEW_SCORE_DESCRIPTIONS: Record<number, string> = {
  9: 'Overwhelmingly Positive',
  8: 'Very Positive',
  7: 'Positive',
  6: 'Mostly Positive',
  5: 'Mixed',
  4: 'Mostly Negative',
  3: 'Negative',
  2: 'Very Negative',
  1: 'Overwhelmingly Negative',
};

interface SteamStorePageReviewSummary {
  appid?: number;
  appname?: string;
  summary_num_positive_reviews?: number;
  summary_num_reviews?: number;
  summary_options?: {
    summaryDisplayed?: {
      eReviewScore?: number;
    };
  };
}

function toGameRatingData(
  targetAppId: number,
  targetName: string,
  totalPositive: number,
  totalReviews: number,
  scoreDesc: string,
  metascore?: number,
): GameRatingData | null {
  if (
    !Number.isFinite(targetAppId) ||
    targetAppId <= 0 ||
    !Number.isFinite(totalPositive) ||
    !Number.isFinite(totalReviews) ||
    totalPositive < 0 ||
    totalReviews <= 0 ||
    totalPositive > totalReviews
  ) {
    return null;
  }

  const positivePercent = Math.round((totalPositive / totalReviews) * 100);
  return {
    appId: targetAppId,
    name: targetName,
    positivePercent,
    scoreDesc,
    totalReviews,
    totalPositive,
    totalNegative: totalReviews - totalPositive,
    metascore,
    steamUrl: `https://store.steampowered.com/app/${targetAppId}/`,
    steamDbUrl: `https://steamdb.info/app/${targetAppId}/`,
    metacriticUrl: metascore
      ? `https://www.metacritic.com/search/${encodeURIComponent(targetName)}/`
      : undefined,
  };
}

function parseReviewSummaryProps(html: string): SteamStorePageReviewSummary | null {
  const match = html.match(/data-featuretarget="appreviews"[^>]*data-props="([^"]+)"/i);
  if (!match?.[1]) return null;

  try {
    const decoded = match[1]
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    return JSON.parse(decoded) as SteamStorePageReviewSummary;
  } catch {
    return null;
  }
}

/**
 * Parses the official app page review payload used by Steam's own storefront.
 */
export function parseSteamStorePageRating(
  html: string,
  appId: number,
  fallbackName?: string,
  metascore?: number,
): GameRatingData | null {
  const summary = parseReviewSummaryProps(html);
  if (!summary) return null;

  const totalPositive = summary.summary_num_positive_reviews;
  const totalReviews = summary.summary_num_reviews;
  if (typeof totalPositive !== 'number' || typeof totalReviews !== 'number') return null;

  const scoreDescription = summary.summary_options?.summaryDisplayed?.eReviewScore;
  const scoreDesc =
    typeof scoreDescription === 'number' ? STEAM_REVIEW_SCORE_DESCRIPTIONS[scoreDescription] : '';
  if (!scoreDesc) return null;

  return toGameRatingData(
    appId,
    summary.appname || fallbackName || `App ${appId}`,
    totalPositive,
    totalReviews,
    scoreDesc,
    metascore,
  );
}

/**
 * Searches Steam store for matching candidates and extracts base rating data.
 */
export async function resolveRatingByCandidates(
  candidates: string[],
): Promise<SteamSearchResolution> {
  const settled = await Promise.allSettled(
    candidates.map(async (candidate) => {
      const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(candidate)}&l=english&cc=US`;
      const text = await makeRequest(url);
      const json = JSON.parse(text) as SteamStoreSearchResult;
      if (!json.items?.length) return null;

      // Prioritize standalone base game entries over DLC, soundtracks, and expansion packs
      const sortedItems = [...json.items].sort((a, b) => {
        const aIsAddon = /\b(content|dlc|pack|soundtrack|expansion|season pass)\b/i.test(a.name);
        const bIsAddon = /\b(content|dlc|pack|soundtrack|expansion|season pass)\b/i.test(b.name);
        if (aIsAddon && !bIsAddon) return 1;
        if (!aIsAddon && bIsAddon) return -1;
        return 0;
      });

      let best: { item: SteamStoreSearchItem; similarity: number } | null = null;
      for (const item of sortedItems.slice(0, 3)) {
        const similarity = calculateTitleSimilarity(candidate, item.name);
        if (similarity >= 0.35 && (!best || similarity > best.similarity)) {
          best = { item, similarity };
        }
      }
      return best?.item ?? null;
    }),
  );

  const matches = settled
    .map((result, index) => {
      if (result.status !== 'fulfilled' || !result.value) return null;
      const query = candidates[index] ?? '';
      const originalTitle = candidates.at(-1) ?? query;
      const querySimilarity = calculateTitleSimilarity(query, result.value.name);
      const originalSimilarity = calculateTitleSimilarity(originalTitle, result.value.name);
      const score = querySimilarity * 0.35 + originalSimilarity * 0.65;
      return {
        item: result.value,
        similarity: score,
      };
    })
    .filter((match): match is NonNullable<typeof match> => match !== null)
    .sort((left, right) => right.similarity - left.similarity);

  const bestMatch = matches[0];
  if (bestMatch && bestMatch.similarity >= 0.35) {
    const metascore = bestMatch.item.metascore
      ? Number.parseInt(bestMatch.item.metascore, 10)
      : undefined;
    return {
      status: 'matched',
      appId: bestMatch.item.id,
      name: bestMatch.item.name,
      metascore: Number.isFinite(metascore) ? metascore : undefined,
    };
  }

  const completedRequest = settled.some((result) => result.status === 'fulfilled');
  return completedRequest ? { status: 'not-found' } : { status: 'unavailable' };
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
  let targetAppId = appId;
  let targetName = fallbackName || `App ${appId}`;
  let metascore = initialMetascore;

  try {
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
      // appdetails is optional metadata; the review sources can still succeed.
    }

    try {
      const reviewUrl = `https://store.steampowered.com/appreviews/${targetAppId}?json=1&language=all&purchase_type=all&num_per_page=0`;
      const reviewText = await makeRequest(reviewUrl);
      const reviewJson = JSON.parse(reviewText) as SteamReviewsResult;
      const summary = reviewJson.query_summary;
      if (summary) {
        const rating = toGameRatingData(
          targetAppId,
          targetName,
          summary.total_positive,
          summary.total_reviews,
          summary.review_score_desc,
          metascore,
        );
        if (rating) return rating;
      }
    } catch (err) {
      console.warn(
        '[FitGirl Rating] Review API unavailable, falling back to store page:',
        appId,
        err,
      );
    }

    const storeUrl = `https://store.steampowered.com/app/${targetAppId}/`;
    const storeHtml = await makeRequest(storeUrl);
    return parseSteamStorePageRating(storeHtml, targetAppId, targetName, metascore);
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
): Promise<GameRatingLookup> {
  const cacheKey = title.trim().toLowerCase();
  if (!forceRefresh) {
    const cached = globalRatingCache.get(cacheKey);
    if (cached) {
      return { status: cached.data ? 'ready' : 'unmatched', data: cached.data };
    }
  } else {
    globalRatingCache.delete(cacheKey);
  }

  let appId: number | null = null;
  let gameName = title;
  let metascore: number | undefined;
  let searchFailed = false;

  // Tier 1: Check element DOM for existing Steam store link
  if (articleRoot) {
    appId = extractSteamAppIdFromElement(articleRoot);
  }

  // Tier 2 & 3: If no link in DOM, search candidate titles
  if (!appId) {
    const candidates = generateTitleCandidates(title);
    const resolution = await resolveRatingByCandidates(candidates);
    if (resolution.status === 'matched') {
      appId = resolution.appId;
      gameName = resolution.name;
      metascore = resolution.metascore;
    } else if (resolution.status === 'unavailable') {
      searchFailed = true;
    }
  }

  if (!appId) {
    if (!searchFailed) {
      globalRatingCache.set(cacheKey, null);
    }
    return { status: searchFailed ? 'unavailable' : 'unmatched', data: null };
  }

  // Tier 5: Fetch review details (resolves DLC to parent game when appropriate)
  const ratingData = await fetchSteamReviews(appId, gameName, metascore);
  if (!ratingData) {
    // The AppID was valid but both official review sources failed. This is a
    // transient state, not a confirmed "not indexed" result, so do not cache it.
    return { status: 'unavailable', data: null };
  }
  globalRatingCache.set(cacheKey, ratingData);
  return { status: 'ready', data: ratingData };
}

/**
 * Concurrency throttling queue to prevent Steam API rate limiting (HTTP 429).
 */
export class RequestQueue {
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly queue: Array<() => Promise<void>> = [];
  private activeCount = 0;
  private readonly maxConcurrent: number;
  private readonly delayMs: number;

  constructor(maxConcurrent = 2, delayMs = 120) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
  }

  add<T>(fn: () => Promise<T>, key?: string): Promise<T> {
    if (key) {
      const existing = this.pending.get(key);
      if (existing) return existing as Promise<T>;
    }

    const promise = new Promise<T>((resolve, reject) => {
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

    if (key) {
      this.pending.set(key, promise);
      void promise.finally(() => this.pending.delete(key)).catch(() => undefined);
    }
    return promise;
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

export const globalRatingQueue = new RequestQueue(3, 100);
