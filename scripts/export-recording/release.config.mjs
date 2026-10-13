import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vite';

import originalConfig from '../../vite.config.ts';

// Optional bundled verification entry; normal production assets are unchanged.
export default defineConfig(async (environment) => {
  const outDir = process.env.CICADA_EXPORT_VERIFY_DIST;
  if (!outDir)
    throw new Error('Set CICADA_EXPORT_VERIFY_DIST to a temporary directory');
  return mergeConfig(await originalConfig(environment), {
    build: {
      outDir,
      rolldownOptions: {
        input: {
          verification: fileURLToPath(
            new URL('./native-verification.ts', import.meta.url),
          ),
        },
      },
    },
  });
});
