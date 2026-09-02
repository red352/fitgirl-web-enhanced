import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const repository = 'https://github.com/red352/fitgirl-web-enhanced';
const distribution =
  'https://raw.githubusercontent.com/red352/fitgirl-web-enhanced/master/dist/fitgirl-enhanced.user.js';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'FitGirl Web Enhanced',
        namespace: repository,
        version: '1.2.0',
        description: '优化 FitGirl Repacks 的信息密度、宽屏布局、折叠内容与热门榜单。',
        author: 'red352',
        license: 'MIT',
        match: ['https://fitgirl-repacks.site/*'],
        'run-at': 'document-start',
        grant: 'none',
        noframes: true,
        homepageURL: repository,
        supportURL: `${repository}/issues`,
        updateURL: distribution,
        downloadURL: distribution,
      },
      build: {
        fileName: 'fitgirl-enhanced.user.js',
      },
    }),
  ],
  build: {
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
  },
});
