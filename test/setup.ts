import { afterEach } from 'vitest';

afterEach(() => {
  document.documentElement.removeAttribute('data-fwe-mode');
  document.documentElement.removeAttribute('data-fwe-booted');
  document.documentElement.removeAttribute('data-fwe-show-ratings');
  document.documentElement.removeAttribute('data-fwe-lang');
  document.documentElement.removeAttribute('data-fwe-theme');
  document.body.className = '';
  document.body.innerHTML = '';
  localStorage.clear();
  // M2's page-count memory lives in sessionStorage; without this it leaks
  // between specs and the catch-up fires against a previous test's count.
  sessionStorage.clear();
  /*
   * M2 从 URL 推导初始页号（`/page/N/` → N）。spec 之间 URL 是共享的，上一个
   * 用例 replaceState 到 /page/2/ 之后，下一个用例新建的 app 就会把自己当成
   * 第 2 页起步，页数断言全歪。每个用例都从「刚打开 / 」开始，和真实文档加载一致。
   */
  window.history.replaceState(null, '', '/');
});
