import { afterEach } from 'vitest';

afterEach(() => {
  document.documentElement.removeAttribute('data-fwe-mode');
  document.documentElement.removeAttribute('data-fwe-booted');
  document.body.className = '';
  document.body.innerHTML = '';
  localStorage.clear();
});
