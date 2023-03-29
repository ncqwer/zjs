// import reactRefresh from '@vitejs/plugin-react-refresh';
// import typescript from 'rollup-plugin-typescript2';
// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vite';

import pkg from './package.json';

const deps = ([] as string[])
  .concat(
    (pkg as any).dependencies ? Object.keys((pkg as any).dependencies) : [],
  )
  .concat(pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : []);

const name = [
  'ZHUJIANSHI',
  pkg.name
    .replace('@zhujianshi/', '')
    .replace(/^(s)/, (char) => char.toUpperCase()),
].join('');

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: pkg.source,
      name,
      fileName: 'index',
      // formats: ['es'],
    },
    rollupOptions: {
      external: deps,
    },
  },
  // plugins: [reactRefresh()],
});
