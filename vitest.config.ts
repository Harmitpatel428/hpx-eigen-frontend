import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // scripts/*.test.mjs are plain-node self-check scripts (run via `node`,
    // see package.json test:csv / test:doc-dup) — not vitest specs. Vitest's
    // default include glob (**/*.test.*) picks them up anyway and they fail
    // vitest's esbuild bundling step, so exclude the whole dir explicitly.
    exclude: [...configDefaults.exclude, 'scripts/**'],
  },
});
