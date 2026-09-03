const paths: Record<string, string> = {
  popular: '<path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/><path d="M3 3h18v18H3z" opacity="0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.4 1-1.4 2.1M12 17h.01"/>',
  download: '<path d="M12 3v11m0 0 4-4m-4 4-4-4"/><path d="M4 17v3h16v-3"/>',
  features:
    '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  description: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4M15 3v4h4"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  external:
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
  zoomIn:
    '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
  zoomOut:
    '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>',
  zoomReset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  calendar: '<path d="M5 4h14v16H5zM8 2v4m8-4v4M5 9h14"/>',
  tag: '<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8" cy="8" r="1"/>',
  building: '<path d="M5 21V6l7-3 7 3v15M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M3 21h18"/>',
  language: '<path d="M4 5h9M8.5 3v2c0 5-2 8-5 10m3-6c1 2 3 4 6 5M14 19l3.5-9 3.5 9m-5.8-3h4.6"/>',
  drive: '<path d="M5 5h14l2 10H3zM3 15v4h18v-4M17 17h.01"/>',
};

export function createIcon(name: keyof typeof paths, className = ''): SVGSVGElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<svg class="fwe-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  const icon = wrapper.firstElementChild;
  if (!(icon instanceof SVGSVGElement)) {
    throw new Error(`无法创建图标：${name}`);
  }
  return icon;
}
