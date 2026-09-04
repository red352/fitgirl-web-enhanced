import './style.css';
import { getFastStoredLayoutMode, getFastStoredShowRatings } from './preferences';
import { FitGirlEnhancedApp } from './ui';

// 在 document-start 阶段执行同步 Fast-Path 标记，消除原版页面未样式化闪现 (FOUC)
function syncPreloadState(): void {
  if (window.top !== window.self) return;
  try {
    const fastMode = getFastStoredLayoutMode();
    document.documentElement.dataset.fweMode = fastMode;
    const fastRatings = getFastStoredShowRatings();
    document.documentElement.dataset.fweShowRatings = String(fastRatings);
  } catch {
    document.documentElement.dataset.fweMode = 'enhanced';
    document.documentElement.dataset.fweShowRatings = 'true';
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
    console.error('[FitGirl Web Enhanced] 初始化失败', error);
    document.documentElement.dataset.fweMode = 'original';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void boot(), { once: true });
} else {
  void boot();
}
