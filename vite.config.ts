import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import pkg from './package.json' with { type: 'json' };

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
        version: pkg.version,
        description: pkg.description,
        author: pkg.author,
        license: pkg.license,
        match: ['https://fitgirl-repacks.site/*'],
        'run-at': 'document-start',
        grant: ['GM_xmlhttpRequest', 'GM_getValue', 'GM_setValue'],
        connect: ['store.steampowered.com'],
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
