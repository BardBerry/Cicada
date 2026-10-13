import { defineConfig, mergeConfig } from 'vite';

import originalConfig from '../../vite.config.ts';

export default defineConfig(async (environment) =>
  mergeConfig(await originalConfig(environment), {
    server: { port: 1423, host: '127.0.0.1', hmr: false },
  }),
);
