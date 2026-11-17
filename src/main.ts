import './style.css';
import {
  DEFAULT_THEME,
  getFastStoredLanguage,
  getFastStoredLayoutMode,
  getFastStoredShowRatings,
  getFastStoredTheme,
} from './preferences';
import { detectBrowserLanguage, setActiveLanguage } from './i18n';
import { FitGirlEnhancedApp } from './ui';

// Execute synchronous Fast-Path tagging at document-start to prevent Flash of Unstyled Content (FOUC)
function syncPreloadState(): void {
  if (window.top !== window.self) return;
  try {
    // Theme is written before the mode: the palette block is what the mode's
    // own background rules read, and writing it second would let the page paint
    // one light frame before flipping.
    document.documentElement.dataset.fweTheme = getFastStoredTheme();
    const fastMode = getFastStoredLayoutMode();
    document.documentElement.dataset.fweMode = fastMode;
    const fastRatings = getFastStoredShowRatings();
    document.documentElement.dataset.fweShowRatings = String(fastRatings);
    const fastLang = getFastStoredLanguage() ?? detectBrowserLanguage();
    document.documentElement.dataset.fweLang = fastLang;
    setActiveLanguage(fastLang);
  } catch {
    document.documentElement.dataset.fweTheme = DEFAULT_THEME;
    document.documentElement.dataset.fweMode = 'enhanced';
    document.documentElement.dataset.fweShowRatings = 'true';
    document.documentElement.dataset.fweLang = 'en';
  }
}

syncPreloadState();

async function boot(): Promise<void> {
  if (window.top !== window.self || document.documentElement.hasAttribute('data-fwe-booted'))
    return;
  document.documentElement.setAttribute('data-fwe-booted', 'true');
  try {
    await new FitGirlEnhancedApp().start();
  } catch (error) {
    console.error('[FitGirl Web Enhanced] Initialization failed', error);
    document.documentElement.dataset.fweMode = 'original';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void boot(), { once: true });
} else {
  void boot();
}
