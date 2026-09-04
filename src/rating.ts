import type { GameRatingData } from './types';

export const RATING_CACHE_PREFIX = 'fitgirl-web-enhanced:v1:rating:';
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 成功匹配缓存 7 天
export const NEGATIVE_CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 未匹配缓存 3 天

interface CacheEntry {
  data: GameRatingData | null;
  timestamp: number;
}

/**
 * 从页面 DOM 中快速探测 Steam 链接与 AppID（0ms 快速路径）
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
 * 智能标题清洗器：剔除 FitGirl 专属修饰符、版本号、构建号、DLC 标签等
 */
export function cleanTitleBase(raw: string): string {
  let text = raw;
  // 0. 规范化弯单双引号与特殊标点
  text = text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  // 1. 移除 FitGirl Repack 编号，如 "#1500 "
  text = text.replace(/^#\d+\s+/, '');
  // 2. 移除破折号之后的所有版本/更新信息（如 " – v1.12.3 + All DLCs"、" - Build 1491.50"）
  text = text.replace(/\s*[–—-]\s+.*$/, '');
  // 3. 移除在破折号前或主标题末尾挂载的附属包（如 "+ Soundtrack Bundle", "+ Bonus OST", "+ All DLCs*", "+ Artbook"）
  text = text.replace(
    /\s*\+\s*(All DLCs?|DLCs?|Soundtrack( Bundle)?|Bonus OST|OST|Artbook|Goodies|Wallpapers|Score|Expansions?|Add[- ]?ons?)\b.*$/i,
    '',
  );
  // 4. 移除内联版本号如 "v1.1"、"v2.0.4a"、"Build 12345"
  text = text.replace(/\b(v\d+(\.\d+)*[a-z]?|Build\s+\d+(\.\d+)*)\b/gi, '');
  // 5. 移除方括号与圆括号注记，如 "[FitGirl Repack]"、"(MULTi8)"、"(Denuvoless)"
  text = text.replace(/\s*(\[[^\]]*\]|\([^)]*\))\s*/g, ' ');
  // 6. 移除星号 *（FitGirl 常见注释标号，如 Deluxe Edition*）与其他杂质符号
  text = text.replace(/[*~]/g, '');
  // 7. 移除尾部可能残留的连字符、加号或逗号
  text = text.replace(/[\s,+–—-]+$/, '');
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * 生成多级候选词列表（降级回退）
 */
export function generateTitleCandidates(raw: string): string[] {
  const candidates: string[] = [];
  const base = cleanTitleBase(raw);
  if (!base) return [];

  // 如果包含斜杠别名（如 "Grand Theft Auto V / GTA V"），拆分为多条候选
  if (base.includes('/')) {
    const parts = base.split('/').map((p) => p.trim());
    for (const part of parts) {
      if (part.length >= 2) {
        candidates.push(part);
      }
    }
  }

  // 剥除任意特定发行版后缀（如 ": Ultimate Edition", ": Eclipse Edition", "Deluxe Edition", "GOTY Edition" 等）
  const noEdition = base.replace(/[:\-–—]?\s*\b([A-Za-z0-9'’-]+\s+)?Edition\*?\b/gi, '').trim();
  if (noEdition && noEdition !== base && noEdition.length >= 2) {
    // 优先尝试剔除 Edition 后的纯粹主游戏名（如 "The Blood of Dawnwalker" 或 "Dragon's Dogma 2"）
    candidates.push(noEdition);
  }

  // 其次尝试带完整名称的基准标题
  candidates.push(base);

  // 若带副标题（冒号分隔），提取主标题（如 "Elden Ring: Shadow of the Erdtree" -> "Elden Ring"）
  if (base.includes(':')) {
    const mainTitle = base.split(':')[0]?.trim();
    if (mainTitle && mainTitle.length >= 2 && !candidates.includes(mainTitle)) {
      candidates.push(mainTitle);
    }
  }

  return [...new Set(candidates.filter((c) => c.length >= 2))];
}

/**
 * 标准化文本供相似度比较
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
 * 校验标题相似度（Token Jaccard / 子集重合度），防止模糊搜索误匹配无关游戏
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
 * 发送网络请求（优先使用 GM_xmlhttpRequest 突破 CORS 限制，回退使用 fetch）
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
 * 本地持久化缓存读写
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
      // 忽略存储读取异常
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
      // 忽略本地存储写入配额异常
    }
  }

  delete(key: string): void {
    this.memory.delete(key);
    try {
      const storageKey = `${RATING_CACHE_PREFIX}${key}`;
      window.localStorage.removeItem(storageKey);
    } catch {
      // 忽略本地存储删除异常
    }
  }
}

export const globalRatingCache = new RatingCache();

/**
 * Steam 评价层级英汉映射
 */
const SCORE_DESC_MAP: Record<string, string> = {
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

export function translateScoreDesc(desc: string): string {
  return SCORE_DESC_MAP[desc] || desc;
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
 * 从 Steam 查询游戏并获取评分
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
        // 排序：优先将纯粹游戏本体排在 DLC / Soundtrack / Content Pack 前面
        const sortedItems = [...json.items].sort((a, b) => {
          const aIsAddon = /\b(content|dlc|pack|soundtrack|expansion|season pass)\b/i.test(a.name);
          const bIsAddon = /\b(content|dlc|pack|soundtrack|expansion|season pass)\b/i.test(b.name);
          if (aIsAddon && !bIsAddon) return 1;
          if (!aIsAddon && bIsAddon) return -1;
          return 0;
        });

        // 校验候选词与结果的相似度
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
 * 根据 AppID 拉取 Steam 玩家好评数据与详情
 * 如果目标 AppID 为 DLC 或附属包，自动通过 appdetails 探测重定向至游戏本体（fullgame）
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

    // 先查询 appdetails 检查是否为 DLC/附加内容，并提取本体 AppID 与 Metacritic 分数
    try {
      const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
      const detailsText = await makeRequest(detailsUrl);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detailsJson = JSON.parse(detailsText) as Record<string, any>;
      const appData = detailsJson?.[String(appId)]?.data;
      if (appData) {
        // 若为 DLC，提取其 fullgame 本体 AppID
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
      // 忽略详情探测失败，降级直接查询原 AppID reviews
    }

    const url = `https://store.steampowered.com/appreviews/${targetAppId}?json=1&language=all&l=schinese&purchase_type=all&num_per_page=0`;
    const text = await makeRequest(url);
    const json = JSON.parse(text) as SteamReviewsResult;
    const summary = json.query_summary;

    if (!summary || summary.total_reviews <= 0) {
      return null;
    }

    const positivePercent = Math.round((summary.total_positive / summary.total_reviews) * 100);
    const scoreDesc = translateScoreDesc(summary.review_score_desc);

    return {
      appId: targetAppId,
      name: targetName,
      positivePercent,
      scoreDesc,
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
 * 综合入口：解析并获取文章对应游戏的评分
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

  // Tier 1: 检查 DOM 内是否有现成的 Steam 链接
  if (articleRoot) {
    appId = extractSteamAppIdFromElement(articleRoot);
  }

  // Tier 2 & 3: 若无直接链接，执行候选词搜索
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

  // Tier 5: 拉取评测详情（包含 DLC 自动重定向至本体游戏）
  const ratingData = await fetchSteamReviews(appId, gameName, metascore);
  globalRatingCache.set(cacheKey, ratingData);
  return ratingData;
}

/**
 * 请求并发节流队列（防止瞬间大量请求触发 Steam 429）
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
