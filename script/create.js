/* eslint-disable import/no-extraneous-dependencies */
const fsp = require('fs/promises');
const { resolve } = require('path');
const child_process = require('child_process');
const { promisify } = require('node:util');
const prettier = require('prettier');

const main = async (pkgName) => {
  const pwd = process.cwd();
  const meta = await getProjectMeta();
  // const packageName =
  const context = {
    pwd,
    fullName: `@${meta.name}/${pkgName}`,
    packageName: pkgName,
    meta,
    path: resolve(pwd, 'packages', pkgName),
  };
  await createPackageWithLerna(context);
  await adjustPackageJSON(context);
  await appendConfigs(context);
};

async function getProjectMeta() {
  const { name, description, keywords, license } = JSON.parse(
    await fsp.readFile('./package.json'),
  );
  return { name, description, keywords, license };
}

async function createPackageWithLerna({ fullName }) {
  return promisify(child_process.exec)(`yarn lerna create ${fullName} -y`);
}

async function adjustPackageJSON({ path, meta }) {
  try {
    const packagePath = resolve(path, 'package.json');
    const pkg = JSON.parse(await fsp.readFile(packagePath));
    delete pkg.type;
    pkg.main = 'dist/index.umd.js';
    pkg.module = 'dist/index.mjs';
    pkg.source = 'src/index.ts';
    pkg.types = 'dist/src/index.d.ts';
    pkg.files = ['dist', 'style'];
    pkg.description = meta.description;
    pkg.keywords = meta.keywords;
    pkg.license = meta.license;

    pkg.scripts = {
      'build:type': 'tsc --emitDeclarationOnly',
      'build:ts': 'vite build',
      build: 'yarn build:ts && yarn build:type',
      prepublish: 'rm dist/tsconfig.tsbuildinfo',
    };
    const tmp = JSON.stringify(pkg);
    await fsp.writeFile(
      packagePath,
      prettier.format(tmp, {
        parser: 'json',
        trailingComma: 'all',
        printWidth: 80,
      }),
      {
        encoding: 'utf-8',
      },
    );
  } catch (e) {
    console.log(e);
  }
}

async function appendConfigs(context) {
  const { path } = context;
  await fsp.writeFile(resolve(path, 'jest.config.js'), JESTCONFIG(context), {
    encoding: 'utf-8',
  });
  await fsp.writeFile(resolve(path, 'postcss.config.js'), POSTCSS(context), {
    encoding: 'utf-8',
  });
  await fsp.writeFile(resolve(path, 'tsconfig.json'), TSCONFIG(context), {
    encoding: 'utf-8',
  });
  await fsp.writeFile(
    resolve(path, 'tailwind.config.js'),
    TAILWINDCSS(context),
    {
      encoding: 'utf-8',
    },
  );
  await fsp.writeFile(resolve(path, 'vite.config.ts'), VITE(context), {
    encoding: 'utf-8',
  });
}

const TSCONFIG = () => `{
  "extends":"../../config/tsconfig.base.json",
  "include": ["src/**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "outDir": "dist",
  },
}
`;

const JESTCONFIG = ({
  packageName,
}) => `const base = require('../../config/jest.config.base');

module.exports = {
  ...base,
  displayName: '${packageName}',
};
`;

const POSTCSS =
  () => `const baseConfig = require('../../config/postcss.config.base');

module.exports = {
  ...baseConfig,
};
`;

const TAILWINDCSS =
  () => `const baseConfig = require('../../config/tailwind.config.base');

module.exports = {
  ...baseConfig,
  corePlugins: {
    preflight: false,
  },
};
`;

const VITE = ({
  meta,
}) => `// import reactRefresh from '@vitejs/plugin-react-refresh';
// import typescript from 'rollup-plugin-typescript2';
// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vite';

import pkg from './package.json';

const deps = ([] as string[])
  .concat(
    (pkg as any).dependencies ? Object.keys((pkg as any).dependencies) : [],
  )
  .concat((pkg as any).peerDependencies ? Object.keys((pkg as any).peerDependencies) : []);

const name = ['${meta.name.toUpperCase()}',pkg.name.replace('@${
  meta.name
}/', '').replace(/^(\s)/, (char) => char.toUpperCase())].join('');

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
});
`;

main(process.argv[2]);
