/// <reference types='vitest' />
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import * as fs from 'fs';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

/**
 * Copies the full TypeScript source into dist/src/ so users of the npm package
 * can audit every line without visiting the repository. Test files are excluded.
 */
function copySourcePlugin(outDir: string): Plugin {
  return {
    name: 'copy-source',
    closeBundle() {
      const srcDir = path.join(import.meta.dirname, 'src');
      const destDir = path.join(outDir, 'src');

      function copyDir(from: string, to: string) {
        fs.mkdirSync(to, { recursive: true });
        for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
          if (entry.name.includes('.spec.')) {
            continue;
          }
          const src = path.join(from, entry.name);
          const dst = path.join(to, entry.name);
          if (entry.isDirectory()) {
            copyDir(src, dst);
          } else {
            fs.copyFileSync(src, dst);
          }
        }
      }

      copyDir(srcDir, destDir);
    },
  };
}

const outDir = path.resolve(import.meta.dirname, '../../dist/libs/vantmetry');

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/vantmetry',
  plugins: [
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md', 'LICENSE']),
    dts({ entryRoot: 'src', tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json'), pathsToAliases: false }),
    copySourcePlugin(outDir),
  ],
  build: {
    outDir: '../../dist/libs/vantmetry',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: {
        index: 'src/index.ts',
        'react/index': 'src/react/index.tsx',
        'next/index': 'src/next/index.tsx',
      },
      formats: ['es' as const],
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'next/script'],
    },
  },
  test: {
    name: 'vantmetry',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/vantmetry',
      provider: 'v8' as const,
    },
  },
}));
