import { describe, expect, it, beforeEach } from 'vitest';
import {
  calculateTitleSimilarity,
  cleanTitleBase,
  extractSteamAppIdFromElement,
  generateTitleCandidates,
  RatingCache,
  RATING_CACHE_PREFIX,
  translateScoreDesc,
} from '../src/rating';
import { RatingPopover } from '../src/ui';
import type { GameRatingData } from '../src/types';

describe('游戏评分模块（Rating Engine）', () => {
  describe('cleanTitleBase 标题清洗', () => {
    it('去除 FitGirl Repack 编号前缀', () => {
      expect(cleanTitleBase('#1500 Red Dead Redemption 2')).toBe('Red Dead Redemption 2');
      expect(cleanTitleBase('#42 The Witcher 3')).toBe('The Witcher 3');
    });

    it('去除破折号后的版本、更新及 DLC 注释', () => {
      expect(cleanTitleBase('Elden Ring: Shadow of the Erdtree Edition – v1.12.3 + All DLCs')).toBe(
        'Elden Ring: Shadow of the Erdtree Edition',
      );
      expect(cleanTitleBase('Cyberpunk 2077: Ultimate Edition - Build 1491.50')).toBe(
        'Cyberpunk 2077: Ultimate Edition',
      );
    });

    it('去除独立的构建号与版本标识', () => {
      expect(cleanTitleBase('Harvest Moon: Home Sweet Home Special Edition v1.1')).toBe(
        'Harvest Moon: Home Sweet Home Special Edition',
      );
      expect(cleanTitleBase('Rune Factory: Guardians of Azuma v1.1.4')).toBe(
        'Rune Factory: Guardians of Azuma',
      );
      expect(cleanTitleBase('My Dream Setup Build 24206446')).toBe('My Dream Setup');
    });

    it('去除方括号与圆括号注记', () => {
      expect(cleanTitleBase('Grand Theft Auto V [FitGirl Repack] (MULTi8)')).toBe(
        'Grand Theft Auto V',
      );
    });

    it('清洗复杂组合修饰词（Dragon’s Dogma 2, Hollowbody, 智能弯引号、星号与附属包）', () => {
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

  describe('generateTitleCandidates 多级候选词生成', () => {
    it('处理多别名斜杠拆分', () => {
      const candidates = generateTitleCandidates(
        'Grand Theft Auto V / GTA V – v1.0.3095 / v1.68 Online',
      );
      expect(candidates).toContain('Grand Theft Auto V');
      expect(candidates).toContain('GTA V');
    });

    it('剥除常见 Edition 版本尾缀并优先生成基础游戏名', () => {
      const candidates = generateTitleCandidates('Red Dead Redemption 2: Ultimate Edition');
      expect(candidates).toContain('Red Dead Redemption 2: Ultimate Edition');
      expect(candidates).toContain('Red Dead Redemption 2');
    });

    it('为复杂游戏名生成精准基础游戏候选词（Dragon’s Dogma 2 与 The Blood of Dawnwalker）', () => {
      const ddCandidates = generateTitleCandidates(
        'Dragon’s Dogma 2: Deluxe Edition* – v3.2 (Denuvoless) + All DLCs* + Bonus OST',
      );
      expect(ddCandidates).toContain("Dragon's Dogma 2");

      const dawnCandidates = generateTitleCandidates('The Blood of Dawnwalker: Eclipse Edition');
      expect(dawnCandidates).toContain('The Blood of Dawnwalker');
    });

    it('处理带副标题的主标题回退', () => {
      const candidates = generateTitleCandidates('Elden Ring: Shadow of the Erdtree');
      expect(candidates).toContain('Elden Ring: Shadow of the Erdtree');
      expect(candidates).toContain('Elden Ring');
    });
  });

  describe('calculateTitleSimilarity 相似度算法', () => {
    it('完全一致或标点大小写忽略后返回 1.0', () => {
      expect(calculateTitleSimilarity('Elden Ring', 'ELDEN RING')).toBe(1.0);
      expect(calculateTitleSimilarity('The Witcher 3', 'The Witcher 3™')).toBe(1.0);
    });

    it('前缀/包含关系返回较高相似度', () => {
      const sim = calculateTitleSimilarity('Grand Theft Auto V', 'Grand Theft Auto V Enhanced');
      expect(sim).toBeGreaterThanOrEqual(0.8);
    });

    it('无关游戏返回低相似度', () => {
      const sim = calculateTitleSimilarity('Doom Eternal', 'Animal Crossing');
      expect(sim).toBeLessThan(0.3);
    });
  });

  describe('extractSteamAppIdFromElement DOM 指纹提取', () => {
    it('从文章内链接中精准提取 Steam AppID', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <p>Official site: <a href="https://store.steampowered.com/app/1245620/ELDEN_RING/">Steam Store</a></p>
      `;
      expect(extractSteamAppIdFromElement(div)).toBe(1245620);
    });

    it('无相关链接时返回 null', () => {
      const div = document.createElement('div');
      div.innerHTML = `<p>No external links</p>`;
      expect(extractSteamAppIdFromElement(div)).toBeNull();
    });
  });

  describe('RatingCache 本地缓存', () => {
    let cache: RatingCache;

    beforeEach(() => {
      window.localStorage.clear();
      cache = new RatingCache();
    });

    it('正确存取并持久化评分数据', () => {
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

      // 验证 localStorage 同步写入
      const raw = window.localStorage.getItem(`${RATING_CACHE_PREFIX}elden ring`);
      expect(raw).toBeTruthy();
    });

    it('过期缓存被自动失效', () => {
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

      // 模拟 10 天前的缓存数据
      const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
      window.localStorage.setItem(
        `${RATING_CACHE_PREFIX}old game`,
        JSON.stringify({ data: sampleData, timestamp: tenDaysAgo }),
      );

      const cached = cache.get('old game');
      expect(cached).toBeNull();
    });

    it('delete 方法正确清除内存与 localStorage 缓存（用于强制刷新）', () => {
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
  });

  describe('translateScoreDesc 评价层级本地化', () => {
    it('正确翻译 Steam 经典评价词', () => {
      expect(translateScoreDesc('Overwhelmingly Positive')).toBe('好评如潮');
      expect(translateScoreDesc('Very Positive')).toBe('特别好评');
      expect(translateScoreDesc('Mixed')).toBe('褒贬不一');
      expect(translateScoreDesc('Mostly Negative')).toBe('多半差评');
      expect(translateScoreDesc('Unknown Score')).toBe('Unknown Score');
    });
  });

  describe('RatingPopover 与徽章状态交互', () => {
    it('Popover 支持展示已匹配评分、Metascore 与强制刷新按钮', () => {
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

    it('Popover 支持未收录状态展示并提供 Steam 搜索与重新查询操作', () => {
      const popover = new RatingPopover();
      const anchor = document.createElement('div');
      document.body.append(anchor);

      let refreshCalled = false;
      popover.showUnmatched(anchor, 'Some Obscure Indie Game', () => {
        refreshCalled = true;
      });

      const popoverEl = document.querySelector('.fwe-rating-popover') as HTMLElement;
      expect(popoverEl.querySelector('.fwe-rating-popover__appid')?.textContent).toBe('未收录');
      expect(popoverEl.querySelector('.fwe-rating-popover__title')?.textContent).toBe(
        'Some Obscure Indie Game',
      );

      const steamSearchLink = popoverEl.querySelector<HTMLAnchorElement>(
        '.fwe-rating-popover__actions a[href*="store.steampowered.com/search"]',
      );
      expect(steamSearchLink).not.toBeNull();
      expect(steamSearchLink?.textContent).toBe('Steam 搜索');

      const retryBtn = popoverEl.querySelector<HTMLButtonElement>(
        '.fwe-rating-popover__btn--primary',
      );
      expect(retryBtn).not.toBeNull();
      retryBtn?.click();
      expect(refreshCalled).toBe(true);
      popover.destroy();
    });
  });
});
