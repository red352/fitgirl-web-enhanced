import { afterEach } from 'vitest';

afterEach(() => {
  document.documentElement.removeAttribute('data-fwe-mode');
  document.documentElement.removeAttribute('data-fwe-booted');
  document.documentElement.removeAttribute('data-fwe-show-ratings');
  document.documentElement.removeAttribute('data-fwe-lang');
  document.body.className = '';
  document.body.innerHTML = '';
  localStorage.clear();
});
