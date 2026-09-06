import type { SupportedLanguage } from './types';

export const STEAM_RATING_TRANSLATIONS: Record<string, string> = {
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

const translations = {
  en: {
    // Search
    searchPlaceholder: 'Search repacks…',
    searchAria: 'Search repacks and posts',
    searchSubmitAria: 'Submit search',

    // Navigation & Drawers
    popularBtn: 'Popular',
    popularAria: 'Open most popular repacks',
    popularHeading: 'Most Popular Repacks',
    popularCloseAria: 'Close popular list',
    browseBtn: 'Browse',
    browseAria: 'Browse site categories and monthly archives',
    browseHeading: 'Browse FitGirl',
    browseCloseAria: 'Close browse menu',
    archivesHeading: 'Monthly Archives',

    // View Control
    viewTrigger: 'View',
    enhancedView: 'Enhanced View',
    enhancedViewAria: 'Toggle enhanced grid layout',
    expandScreenshots: 'Expand Screenshots',
    expandScreenshotsAria: 'Toggle default screenshot and preview expansion',
    infiniteScroll: 'Infinite Scroll',
    infiniteScrollAria: 'Toggle infinite scroll loading',
    showRatings: 'Show Game Ratings',
    showRatingsAria: 'Toggle Steam ratings display',
    language: 'Language',
    languageAria: 'Switch interface language',
    langEn: 'English',
    langZh: '简体中文',

    // Lightbox
    lightboxAria: 'Screenshot and gameplay preview',
    zoomOutTitle: 'Zoom out (Ctrl -)',
    zoomOutAria: 'Zoom out',
    zoomResetTitle: 'Reset zoom (Ctrl 0)',
    zoomResetAria: 'Reset zoom',
    zoomInTitle: 'Zoom in (Ctrl +)',
    zoomInAria: 'Zoom in',
    fitScreenTitle: 'Fit to screen',
    fitScreenAria: 'Fit to screen',
    openExternalTitle: 'Open original image in new tab',
    openExternalAria: 'Open original image in new tab',
    closeLightboxTitle: 'Close preview (Esc)',
    closeLightboxAria: 'Close preview',
    prevMediaTitle: 'Previous (←)',
    prevMediaAria: 'Previous',
    nextMediaTitle: 'Next (→)',
    nextMediaAria: 'Next',

    // Modals & Card Actions
    gameModalAria: 'Game details dialog',
    gameModalCloseAria: 'Close details dialog',
    gameInfoAria: 'Game basic information',
    cardMirrors: 'Download Mirrors',
    cardFeatures: 'Features',
    cardDescription: 'Description',
    pinkPawBadge: '🐾 Pink Paw',

    // Ratings & Popover
    ratingLoadingText: 'Querying...',
    ratingLoadingAria: 'Loading game rating...',
    ratingLoadingTitle: 'Fetching Steam rating...',
    ratingUnmatchedText: 'Unmatched',
    ratingUnmatchedAria: '{title} rating not indexed, click or hover for details',
    ratingUnmatchedTitle: 'No Steam rating matched. Hover for details or force refresh.',
    ratingUnmatchedDesc:
      'No matching review data found on Steam. The game may lack sufficient reviews or uses a custom title alias.',
    ratingRefreshTitle: 'Force refresh rating (clear local cache)',
    ratingRefreshAria: 'Force refresh rating',
    steamStore: 'Steam Store',
    steamSearch: 'Steam Search',
    steamDb: 'SteamDB',
    steamDbSearch: 'SteamDB Search',
    queryAgain: 'Query Again 🔄',
    reviewCount: '{total} reviews',
    reviewsSummary: '{total} user reviews ({positive} positive / {negative} negative)',
    singleRatingAria: 'Steam: {percent}% ({scoreDesc} · {total} reviews)',
    cardRatingAria: '{name} Rating: Steam {percent}% {scoreDesc}',

    // Infinite Scroll
    infiniteLoading: 'Loading more repacks...',
    infiniteEnd: 'All repacks loaded',
    infiniteRetry: 'Retry loading more',

    // Relative Time
    timeToday: 'Today',
    timeYesterday: 'Yesterday',
    timeDaysAgo: '{days}d ago',
    timeWeeksAgo: '{weeks}w ago',
    timeMonthsAgo: '{months}mo ago',
    timeYearsAgo: '{years}y ago',
  },
  'zh-CN': {
    // Search
    searchPlaceholder: '搜索游戏与文章…',
    searchAria: '搜索游戏与文章',
    searchSubmitAria: '提交搜索',

    // Navigation & Drawers
    popularBtn: '热门',
    popularAria: '打开热门榜单',
    popularHeading: '本周最热门 Repacks',
    popularCloseAria: '关闭热门榜单',
    browseBtn: '浏览',
    browseAria: '浏览站点分类与月度归档',
    browseHeading: '浏览 FitGirl',
    browseCloseAria: '关闭浏览菜单',
    archivesHeading: '月度归档',

    // View Control
    viewTrigger: '视图',
    enhancedView: '增强视图',
    enhancedViewAria: '切换增强布局与原站布局',
    expandScreenshots: '展开截图画廊',
    expandScreenshotsAria: '切换截图与实机预览默认展开状态',
    infiniteScroll: '无限滚动',
    infiniteScrollAria: '切换瀑布流无限滚动加载',
    showRatings: '显示游戏评分',
    showRatingsAria: '切换游戏评分显示',
    language: '语言',
    languageAria: '切换界面语言',
    langEn: 'English',
    langZh: '简体中文',

    // Lightbox
    lightboxAria: '截图与实机预览',
    zoomOutTitle: '缩小 (Ctrl -)',
    zoomOutAria: '缩小',
    zoomResetTitle: '重置缩放 (Ctrl 0)',
    zoomResetAria: '重置缩放',
    zoomInTitle: '放大 (Ctrl +)',
    zoomInAria: '放大',
    fitScreenTitle: '自适应重置',
    fitScreenAria: '自适应重置',
    openExternalTitle: '在新标签页打开原图网站',
    openExternalAria: '在新标签页打开原图网站',
    closeLightboxTitle: '关闭预览 (Esc)',
    closeLightboxAria: '关闭预览',
    prevMediaTitle: '上一张 (←)',
    prevMediaAria: '上一张',
    nextMediaTitle: '下一张 (→)',
    nextMediaAria: '下一张',

    // Modals & Card Actions
    gameModalAria: '游戏详情弹窗',
    gameModalCloseAria: '关闭详情弹窗',
    gameInfoAria: '游戏基本信息',
    cardMirrors: '下载镜像',
    cardFeatures: '特性介绍',
    cardDescription: '详细介绍',
    pinkPawBadge: '🐾 粉红爪印',

    // Ratings & Popover
    ratingLoadingText: '查询中...',
    ratingLoadingAria: '正在加载游戏评分...',
    ratingLoadingTitle: '正在查询 Steam 评分...',
    ratingUnmatchedText: '未收录',
    ratingUnmatchedAria: '{title} 未收录评分，点击或悬浮查看详情',
    ratingUnmatchedTitle: '未在 Steam 自动匹配到评分，悬浮可查看详情或强制刷新',
    ratingUnmatchedDesc:
      '未能在 Steam 自动匹配到有效评测数据，可能是游戏在 Steam 暂无足够评价，或标题包含特殊别名。',
    ratingRefreshTitle: '强制重新获取评分（清除本地缓存）',
    ratingRefreshAria: '强制重新获取评分',
    steamStore: 'Steam 商店',
    steamSearch: 'Steam 搜索',
    steamDb: 'SteamDB',
    steamDbSearch: 'SteamDB 搜索',
    queryAgain: '重新查询 🔄',
    reviewCount: '{total} 评测',
    reviewsSummary: '共 {total} 篇玩家评测（{positive} 好评 / {negative} 差评）',
    singleRatingAria: 'Steam: {percent}% ({scoreDesc} · {total} 评测)',
    cardRatingAria: '{name} 评分：Steam {percent}% {scoreDesc}',

    // Infinite Scroll
    infiniteLoading: '正在加载更多 repacks...',
    infiniteEnd: '已加载全部条目',
    infiniteRetry: '重试加载',

    // Relative Time
    timeToday: '今天',
    timeYesterday: '昨天',
    timeDaysAgo: '{days}天前',
    timeWeeksAgo: '{weeks}周前',
    timeMonthsAgo: '{months}个月前',
    timeYearsAgo: '{years}年前',
  },
} as const;

export type TranslationKey = keyof (typeof translations)['en'];

export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('zh')) return 'zh-CN';
  }
  return 'en';
}

let activeLanguage: SupportedLanguage = 'en';
const listeners = new Set<(lang: SupportedLanguage) => void>();

export function getActiveLanguage(): SupportedLanguage {
  return activeLanguage;
}

export function setActiveLanguage(lang: SupportedLanguage): void {
  if (activeLanguage !== lang) {
    activeLanguage = lang;
    listeners.forEach((listener) => {
      try {
        listener(lang);
      } catch (err) {
        console.error('[i18n] Error in language listener', err);
      }
    });
  }
}

export function onLanguageChange(listener: (lang: SupportedLanguage) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function t(
  key: TranslationKey,
  paramsOrLang?: Record<string, string | number> | SupportedLanguage,
  overrideLang?: SupportedLanguage,
): string {
  let params: Record<string, string | number> | undefined;
  let lang: SupportedLanguage;

  if (typeof paramsOrLang === 'string') {
    lang = paramsOrLang;
    params = undefined;
  } else {
    params = paramsOrLang;
    lang = overrideLang ?? activeLanguage;
  }

  const dict = translations[lang] ?? translations.en;
  let text: string = dict[key] ?? translations.en[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([paramKey, val]) => {
      text = text.replaceAll(`{${paramKey}}`, String(val));
    });
  }
  return text;
}

export function translateSteamScoreDesc(
  rawDesc: string,
  lang: SupportedLanguage = activeLanguage,
): string {
  if (lang === 'zh-CN') {
    return STEAM_RATING_TRANSLATIONS[rawDesc] ?? rawDesc;
  }
  return rawDesc;
}
