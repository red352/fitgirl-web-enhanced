import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import monkey from 'vite-plugin-monkey';
import pkg from './package.json' with { type: 'json' };
import { escapeNonAscii } from './scripts/escape-non-ascii.ts';

const repository = 'https://github.com/red352/fitgirl-web-enhanced';
const distribution =
  'https://raw.githubusercontent.com/red352/fitgirl-web-enhanced/master/dist/fitgirl-enhanced.user.js';

const METADATA_END = '// ==/UserScript==';

/**
 * Tampermonkey injects scripts through an internal `userscript.html` document
 * that re-decodes the source, and non-ASCII bytes can be mangled there. A
 * mangled byte sequence turns the whole script into an `Uncaught SyntaxError`,
 * so nothing loads at all. Escaping the artifact keeps the distributed script
 * immune to that decoding path while the source stays readable.
 *
 * Only the script body is escaped: the metadata block is left verbatim so
 * `@name` and friends keep their real characters, and being comments they can
 * never break parsing.
 */
function asciiUserscript(): Plugin {
  return {
    name: 'fwe-ascii-userscript',
    apply: 'build',
    writeBundle(options, bundle) {
      const outDir = options.dir;
      if (!outDir) return;
      for (const fileName of Object.keys(bundle)) {
        if (!fileName.endsWith('.user.js')) continue;
        const filePath = resolve(outDir, fileName);
        const original = readFileSync(filePath, 'utf8');
        const metadataEnd = original.indexOf(METADATA_END);
        const head = metadataEnd === -1 ? '' : original.slice(0, metadataEnd + METADATA_END.length);
        const body =
          metadataEnd === -1 ? original : original.slice(metadataEnd + METADATA_END.length);
        const escapedBody = escapeNonAscii(body);
        if (escapedBody !== body) {
          writeFileSync(filePath, head + escapedBody, 'utf8');
        }
      }
    },
  };
}

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
    asciiUserscript(),
  ],
  build: {
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
  },
});
