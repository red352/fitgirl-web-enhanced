import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    exclude: ['test/e2e/**', 'node_modules/**', 'dist/**'],
    /*
     * jsdom has no localStorage of its own, so the suite relies on Node's
     * `--localstorage-file` (see the design doc's verification section). That
     * store is one per process and the specs write real preference keys, so two
     * files running at once can clear each other's writes between a setItem and
     * the read that follows it. Serialising the files removes the race.
     */
    fileParallelism: false,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
