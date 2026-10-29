import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  calculateTitleSimilarity,
  cleanTitleBase,
  extractSteamAppIdFromElement,
  fetchSteamReviews,
  generateTitleCandidates,
  getGameRating,
  parseSteamStorePageRating,
  globalRatingCache,
  resolveRatingByCandidates,
  RatingCache,
  RATING_CACHE_PREFIX,
  translateScoreDesc,
} from '../src/rating';
import { RatingPopover } from '../src/ui';
import { setActiveLanguage } from '../src/i18n';
import type { GameRatingData } from '../src/types';

describe('Rating Engine', () => {
  describe('cleanTitleBase title sanitization', () => {
    it('removes FitGirl repack number prefixes', () => {
      expect(cleanTitleBase('#1500 Red Dead Redemption 2')).toBe('Red Dead Redemption 2');
      expect(cleanTitleBase('#42 The Witcher 3')).toBe('The Witcher 3');
    });

    it('strips post-dash version, update, and DLC annotations', () => {
      expect(cleanTitleBase('Elden Ring: Shadow of the Erdtree Edition – v1.12.3 + All DLCs')).toBe(
        'Elden Ring: Shadow of the Erdtree Edition',
      );
      expect(cleanTitleBase('Cyberpunk 2077: Ultimate Edition - Build 1491.50')).toBe(
        'Cyberpunk 2077: Ultimate Edition',
      );
    });

    it('removes standalone build numbers and version markers', () => {
      expect(cleanTitleBase('Harvest Moon: Home Sweet Home Special Edition v1.1')).toBe(
        'Harvest Moon: Home Sweet Home Special Edition',
      );
      expect(cleanTitleBase('Rune Factory: Guardians of Azuma v1.1.4')).toBe(
        'Rune Factory: Guardians of Azuma',
      );
      expect(cleanTitleBase('My Dream Setup Build 24206446')).toBe('My Dream Setup');
    });

    it('removes bracketed and parenthesized tags', () => {
      expect(cleanTitleBase('Grand Theft Auto V [FitGirl Repack] (MULTi8)')).toBe(
        'Grand Theft Auto V',
      );
    });

    it('sanitizes complex modifier combinations (Dragon’s Dogma 2, Hollowbody, curly quotes, asterisks, bundles)', () => {
      expect(
        cleanTitleBase(
          'Dragon’s Dogma 2: Deluxe Edition* – v3.2 (Denuvoless) + All DLCs* + Bonus OST',
        ),
      ).toBe("Dragon's Dogma 2: Deluxe Edition");

      expect(cleanTitleBase('Hollowbody + Soundtrack Bundle – v2.2 + Bonus OST')).toBe(
        'Hollowbody',
      );

      expect(cleanTitleBase('The Blood of Dawnwalker: Eclipse Edition')).toBe(
        'The Blood of Dawnwalker: Eclipse Edition',
      );
    });
  });

  describe('generateTitleCandidates multi-tier candidate generation', () => {
    it('handles multiple aliases split by slashes', () => {
      const candidates = generateTitleCandidates(
        'Grand Theft Auto V / GTA V – v1.0.3095 / v1.68 Online',
      );
      expect(candidates).toContain('Grand Theft Auto V');
      expect(candidates).toContain('GTA V');
    });

    it('strips common Edition suffixes and prioritizes base game names', () => {
      const candidates = generateTitleCandidates('Red Dead Redemption 2: Ultimate Edition');
      expect(candidates).toContain('Red Dead Redemption 2: Ultimate Edition');
      expect(candidates).toContain('Red Dead Redemption 2');
    });

    it('generates accurate base game candidates for complex game titles', () => {
      const ddCandidates = generateTitleCandidates(
        'Dragon’s Dogma 2: Deluxe Edition* – v3.2 (Denuvoless) + All DLCs* + Bonus OST',
      );
      expect(ddCandidates).toContain("Dragon's Dogma 2");

      const dawnCandidates = generateTitleCandidates('The Blood of Dawnwalker: Eclipse Edition');
      expect(dawnCandidates).toContain('The Blood of Dawnwalker');
    });

    it('handles subtitle fallback to main title', () => {
      const candidates = generateTitleCandidates('Elden Ring: Shadow of the Erdtree');
      expect(candidates).toContain('Elden Ring: Shadow of the Erdtree');
      expect(candidates).toContain('Elden Ring');
    });
  });

  describe('calculateTitleSimilarity string matching algorithm', () => {
    it('returns 1.0 for exact matches or matches ignoring punctuation/case', () => {
      expect(calculateTitleSimilarity('Elden Ring', 'ELDEN RING')).toBe(1.0);
      expect(calculateTitleSimilarity('The Witcher 3', 'The Witcher 3™')).toBe(1.0);
    });

    it('returns high similarity for prefix and substring inclusions', () => {
      const sim = calculateTitleSimilarity('Grand Theft Auto V', 'Grand Theft Auto V Enhanced');
      expect(sim).toBeGreaterThanOrEqual(0.8);
    });

    it('returns low similarity for unrelated games', () => {
      const sim = calculateTitleSimilarity('Doom Eternal', 'Animal Crossing');
      expect(sim).toBeLessThan(0.3);
    });
  });

  describe('parseSteamStorePageRating store-page fallback', () => {
    it('parses the official embedded review payload when the reviews API redirects', () => {
      const html = `
        <div
          data-featuretarget="appreviews"
          data-props="{&quot;appid&quot;:1245620,&quot;appname&quot;:&quot;ELDEN RING&quot;,&quot;summary_num_positive_reviews&quot;:412075,&quot;summary_num_reviews&quot;:437156,&quot;summary_options&quot;:{&quot;summaryDisplayed&quot;:{&quot;eReviewScore&quot;:8}}}"
        ></div>
      `;

      expect(parseSteamStorePageRating(html, 1245620, undefined, 94)).toMatchObject({
        appId: 1245620,
        name: 'ELDEN RING',
        positivePercent: 94,
        scoreDesc: 'Very Positive',
        totalReviews: 437156,
        totalPositive: 412075,
        totalNegative: 25081,
        metascore: 94,
      });
    });
  });

  describe('fetchSteamReviews resilient review source', () => {
    it('uses the store page summary when the reviews endpoint returns HTML', async () => {
      const originalFetch = globalThis.fetch;
      const storeHtml = `
        <div
          data-featuretarget="appreviews"
          data-props="{&quot;appid&quot;:1245620,&quot;appname&quot;:&quot;ELDEN RING&quot;,&quot;summary_num_positive_reviews&quot;:412075,&quot;summary_num_reviews&quot;:437156,&quot;summary_options&quot;:{&quot;summaryDisplayed&quot;:{&quot;eReviewScore&quot;:8}}}"
        ></div>
      `;
      globalThis.fetch = async (input) => {
        const url = String(input);
        if (url.includes('/api/appdetails')) {
          return new Response(
            JSON.stringify({
              1245620: {
                success: true,
                data: {
                  type: 'game',
                  name: 'ELDEN RING',
                  metacritic: { score: 94 },
                },
              },
            }),
            { status: 200 },
          );
        }
        if (url.includes('/appreviews/')) {
          return new Response('<html>Steam home</html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
          });
        }
        if (url.endsWith('/app/1245620/')) {
          return new Response(storeHtml, {
            status: 200,
            headers: { 'content-type': 'text/html' },
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      try {
        await expect(fetchSteamReviews(1245620, 'ELDEN RING')).resolves.toMatchObject({
          appId: 1245620,
          positivePercent: 94,
          scoreDesc: 'Very Positive',
          totalReviews: 437156,
          metascore: 94,
        });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('Steam search failure classification', () => {
    it('rejects an unrelated search hit instead of caching it as a Steam match', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            total: 1,
            items: [{ type: 'app', id: 999, name: 'Completely Different Game' }],
          }),
          { status: 200 },
        );

      try {
        await expect(
          resolveRatingByCandidates(['over the hill', 'Supporter Pack Bundle', 'unknown']),
        ).resolves.toEqual({ status: 'not-found' });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('distinguishes a completed empty search from a network failure', async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () =>
        new Response(JSON.stringify({ total: 0, items: [] }), { status: 200 });
      try {
        await expect(resolveRatingByCandidates(['Unknown Game'])).resolves.toEqual({
          status: 'not-found',
        });
      } finally {
        globalThis.fetch = originalFetch;
      }

      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch');
      };
      try {
        await expect(resolveRatingByCandidates(['Unknown Game'])).resolves.toEqual({
          status: 'unavailable',
        });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('does not persist a network failure as a negative rating cache entry', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch');
      };

      try {
        await expect(getGameRating('Network Failure Game', undefined, true)).resolves.toEqual({
          status: 'unavailable',
          data: null,
        });
        expect(
          window.localStorage.getItem(`${RATING_CACHE_PREFIX}network failure game`),
        ).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('extractSteamAppIdFromElement DOM fingerprinting', () => {
    it('extracts Steam AppID accurately from article hyperlinks', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <p>Official site: <a href="https://store.steampowered.com/app/1245620/ELDEN_RING/">Steam Store</a></p>
      `;
      expect(extractSteamAppIdFromElement(div)).toBe(1245620);
    });

    it('returns null when no matching links are present', () => {
      const div = document.createElement('div');
      div.innerHTML = `<p>No external links</p>`;
      expect(extractSteamAppIdFromElement(div)).toBeNull();
    });
  });

  describe('RatingCache local storage cache', () => {
    let cache: RatingCache;

    let sampleRating: GameRatingData;

    beforeEach(() => {
      window.localStorage.clear();
      cache = new RatingCache();
      sampleRating = {
        appId: 1245620,
        name: 'ELDEN RING',
        positivePercent: 93,
        scoreDesc: '特别好评',
        totalReviews: 1150000,
        totalPositive: 1070000,
        totalNegative: 80000,
        steamUrl: 'https://store.steampowered.com/app/1245620/',
        steamDbUrl: 'https://steamdb.info/app/1245620/',
      };
    });

    it('stores, retrieves, and persists rating data correctly', () => {
      const sampleData: GameRatingData = {
        appId: 1245620,
        name: 'ELDEN RING',
        positivePercent: 93,
        scoreDesc: '特别好评',
        totalReviews: 1150000,
        totalPositive: 1070000,
        totalNegative: 80000,
        metascore: 94,
        steamUrl: 'https://store.steampowered.com/app/1245620/',
        steamDbUrl: 'https://steamdb.info/app/1245620/',
      };

      cache.set('elden ring', sampleData);

      const cached = cache.get('elden ring');
      expect(cached).not.toBeNull();
      expect(cached?.data?.appId).toBe(1245620);
      expect(cached?.data?.positivePercent).toBe(93);

      // Verify localStorage persistence
      const raw = window.localStorage.getItem(`${RATING_CACHE_PREFIX}elden ring`);
      expect(raw).toBeTruthy();
    });

    it('automatically invalidates expired cache entries', () => {
      const sampleData: GameRatingData = {
        appId: 100,
        name: 'Old Game',
        positivePercent: 80,
        scoreDesc: '特别好评',
        totalReviews: 1000,
        totalPositive: 800,
        totalNegative: 200,
        steamUrl: 'https://store.steampowered.com/app/100/',
        steamDbUrl: 'https://steamdb.info/app/100/',
      };

      // Simulate cache entry from 10 days ago
      const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
      window.localStorage.setItem(
        `${RATING_CACHE_PREFIX}old game`,
        JSON.stringify({ data: sampleData, timestamp: tenDaysAgo }),
      );

      const cached = cache.get('old game');
      expect(cached).toBeNull();
    });

    it('deletes entries from both memory and localStorage cache for force refresh', () => {
      const sampleData: GameRatingData = {
        appId: 1245620,
        name: 'ELDEN RING',
        positivePercent: 93,
        scoreDesc: '特别好评',
        totalReviews: 1150000,
        totalPositive: 1070000,
        totalNegative: 80000,
        steamUrl: 'https://store.steampowered.com/app/1245620/',
        steamDbUrl: 'https://steamdb.info/app/1245620/',
      };

      cache.set('elden ring', sampleData);
      expect(cache.get('elden ring')).not.toBeNull();
      expect(window.localStorage.getItem(`${RATING_CACHE_PREFIX}elden ring`)).toBeTruthy();

      cache.delete('elden ring');
      expect(cache.get('elden ring')).toBeNull();
      expect(window.localStorage.getItem(`${RATING_CACHE_PREFIX}elden ring`)).toBeNull();
    });

    it('clears every persisted rating entry and invalidates in-flight writes', async () => {
      const first = new RatingCache();
      first.set('elden ring', sampleRating);
      first.set('unmatched game', null);

      const removed = first.clear();
      expect(removed).toBeGreaterThanOrEqual(2);
      expect(first.get('elden ring')).toBeNull();
      expect(window.localStorage.getItem(`${RATING_CACHE_PREFIX}elden ring`)).toBeNull();
      expect(window.localStorage.getItem(`${RATING_CACHE_PREFIX}unmatched game`)).toBeNull();

      const originalFetch = globalThis.fetch;
      let releaseRatingResponse!: (value: Response) => void;
      const ratingResponse = new Promise<Response>((resolve) => {
        releaseRatingResponse = resolve;
      });
      let ratingRequested = false;
      const originalGmRequest = (globalThis as Record<string, unknown>).GM_xmlhttpRequest;
      (globalThis as Record<string, unknown>).GM_xmlhttpRequest = undefined;
      globalThis.fetch = async (input) => {
        const url = String(input);
        if (url.includes('/api/storesearch')) {
          return Response.json({
            total: 1,
            items: [{ type: 'app', id: 1245620, name: 'ELDEN RING' }],
          });
        }
        if (url.includes('/appreviews/')) {
          ratingRequested = true;
          return ratingResponse;
        }
        return Response.json({
          1245620: {
            success: true,
            data: { type: 'game', name: 'ELDEN RING' },
          },
        });
      };

      first.clear();
      try {
        const inFlight = getGameRating('elden ring', undefined, true);
        await vi.waitFor(() => {
          expect(ratingRequested).toBe(true);
        });
        globalRatingCache.clear();
        releaseRatingResponse(
          Response.json({
            success: 1,
            query_summary: {
              review_score: 8,
              review_score_desc: 'Very Positive',
              total_positive: 1070,
              total_negative: 80,
              total_reviews: 1150,
            },
          }),
        );
        await expect(inFlight).resolves.toMatchObject({ status: 'ready' });
        expect(window.localStorage.getItem(`${RATING_CACHE_PREFIX}elden ring`)).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
        (globalThis as Record<string, unknown>).GM_xmlhttpRequest = originalGmRequest;
      }
    });
  });

  describe('translateScoreDesc score description localization', () => {
    it('correctly translates Steam score descriptions in both English and Chinese', () => {
      // Default (Chinese fallback or zh-CN)
      expect(translateScoreDesc('Overwhelmingly Positive')).toBe('好评如潮');
      expect(translateScoreDesc('Very Positive')).toBe('特别好评');
      expect(translateScoreDesc('Mixed')).toBe('褒贬不一');
      expect(translateScoreDesc('Mostly Negative')).toBe('多半差评');
      expect(translateScoreDesc('Unknown Score')).toBe('Unknown Score');

      // English mode
      expect(translateScoreDesc('Overwhelmingly Positive', 'en')).toBe('Overwhelmingly Positive');
      expect(translateScoreDesc('特别好评', 'en')).toBe('Very Positive');
      expect(translateScoreDesc('特别好评', 'zh-CN')).toBe('特别好评');
    });
  });

  describe('RatingPopover and badge interactions', () => {
    it('renders matched rating view, Metascore, and handles refresh action', () => {
      const popover = new RatingPopover();
      const anchor = document.createElement('div');
      document.body.append(anchor);

      const sampleData: GameRatingData = {
        appId: 1245620,
        name: 'ELDEN RING',
        positivePercent: 93,
        scoreDesc: '特别好评',
        totalReviews: 1150000,
        totalPositive: 1070000,
        totalNegative: 80000,
        metascore: 94,
        steamUrl: 'https://store.steampowered.com/app/1245620/',
        steamDbUrl: 'https://steamdb.info/app/1245620/',
        metacriticUrl: 'https://www.metacritic.com/game/elden-ring/',
      };

      let refreshCalled = false;
      popover.show(anchor, sampleData, () => {
        refreshCalled = true;
      });

      const popoverEl = document.querySelector('.fwe-rating-popover') as HTMLElement;
      expect(popoverEl).not.toBeNull();
      expect(popoverEl.querySelector('.fwe-rating-popover__percent')?.textContent).toBe('93%');
      expect(popoverEl.querySelector('.fwe-rating-popover__appid')?.textContent).toBe(
        'AppID: 1245620',
      );
      expect(popoverEl.querySelector('.fwe-rating-popover__meta-val')?.textContent).toBe('94/100');

      const refreshBtn = popoverEl.querySelector<HTMLButtonElement>(
        '.fwe-rating-popover__refresh-btn',
      );
      expect(refreshBtn).not.toBeNull();
      refreshBtn?.click();
      expect(refreshCalled).toBe(true);
      popover.destroy();
    });

    it('renders unmatched view and supports language updates, Steam search, and query retry', () => {
      setActiveLanguage('en');
      const popover = new RatingPopover();
      const anchor = document.createElement('div');
      document.body.append(anchor);

      let refreshCalled = false;
      popover.showUnmatched(anchor, 'Some Obscure Indie Game', () => {
        refreshCalled = true;
      });

      const popoverEl = document.querySelector('.fwe-rating-popover') as HTMLElement;
      expect(popoverEl.querySelector('.fwe-rating-popover__appid')?.textContent).toBe('Unmatched');
      expect(popoverEl.querySelector('.fwe-rating-popover__title')?.textContent).toBe(
        'Some Obscure Indie Game',
      );

      const steamSearchLink = popoverEl.querySelector<HTMLAnchorElement>(
        '.fwe-rating-popover__actions a[href*="store.steampowered.com/search"]',
      );
      expect(steamSearchLink).not.toBeNull();
      expect(steamSearchLink?.textContent).toBe('Steam Search');

      // Test dynamic language switching to Chinese
      setActiveLanguage('zh-CN');
      popover.updateLanguage();
      expect(popoverEl.querySelector('.fwe-rating-popover__appid')?.textContent).toBe('未收录');
      expect(steamSearchLink?.textContent).toBe('Steam 搜索');

      const retryBtn = popoverEl.querySelector<HTMLButtonElement>(
        '.fwe-rating-popover__btn--primary',
      );
      expect(retryBtn).not.toBeNull();
      retryBtn?.click();
      expect(refreshCalled).toBe(true);
      popover.destroy();
    });

    it('renders a distinct transient failure view instead of claiming the game is unindexed', () => {
      setActiveLanguage('en');
      const popover = new RatingPopover();
      const anchor = document.createElement('div');
      document.body.append(anchor);

      popover.showUnavailable(anchor, 'Elden Ring', () => undefined);

      const popoverEl = document.querySelector('.fwe-rating-popover') as HTMLElement;
      expect(popoverEl.querySelector('.fwe-rating-popover__appid')?.textContent).toBe(
        'Query Failed',
      );
      expect(popoverEl.querySelector('.fwe-rating-popover__unmatched-text')?.textContent).toContain(
        'temporary network or request failure',
      );

      setActiveLanguage('zh-CN');
      popover.updateLanguage();
      expect(popoverEl.querySelector('.fwe-rating-popover__appid')?.textContent).toBe('查询失败');

      popover.destroy();
    });
  });
});
