import babel from '@rollup/plugin-babel';
// import builtins from '@rollup/plugin-node-builtins'
import commonjs from '@rollup/plugin-commonjs';
// import globals from '@rollup/plugin-node-globals'
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import asyncT from 'rollup-plugin-async';
import { terser } from 'rollup-plugin-terser';

import caseMatch from '../packages/case-match/package.json';
import lens from '../packages/lens/package.json';
import useLens from '../packages/use-lens/package.json';
import fe from '../packages/fe/package.json';
import radar from '../packages/radar-echo-utils/package.json';

/**
 * Return a Rollup configuration for a `pkg` with `env` and `target`.
 */

function configure(pkg, env, target) {
  const isProd = env === 'production';
  const isUmd = target === 'umd';
  const isModule = target === 'module';
  const isCommonJs = target === 'cjs';
  const realPkgName = pkg.name.replace('@zhujianshi/', '');
  const input = `packages/${realPkgName}/src/index.ts`;
  const deps = []
    .concat(pkg.dependencies ? Object.keys(pkg.dependencies) : [])
    .concat(pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : []);

  // Stop Rollup from warning about circular dependencies.
  const onwarn = (warning) => {
    if (warning.code !== 'CIRCULAR_DEPENDENCY') {
      console.warn(`(!) ${warning.message}`); // eslint-disable-line no-console
    }
  };

  const plugins = [
    // Allow Rollup to resolve modules from `node_modules`, since it only
    // resolves local modules by default.
    resolve({
      browser: true,
    }),

    typescript({
      // abortOnError: false,
      tsconfig: `./packages/${realPkgName}/tsconfig.json`,
      // COMPAT: Without this flag sometimes the declarations are not updated.
      // clean: isProd ? true : false,
      // clean: true,
    }),

    // Allow Rollup to resolve CommonJS modules, since it only resolves ES2015
    // modules by default.
    commonjs({
      exclude: [`packages/${realPkgName}/src/**`],
      // HACK: Sometimes the CommonJS plugin can't identify named exports, so
      // we have to manually specify named exports here for them to work.
      // https://github.com/rollup/rollup-plugin-commonjs#custom-named-exports
      // namedExports: {
      //   esrever: ['reverse'],

      //   immutable: [
      //     'List',
      //     'Map',
      //     'Record',
      //     'OrderedSet',
      //     'Set',
      //     'Stack',
      //     'is',
      //   ],
      //   'react-dom': ['findDOMNode'],
      //   'react-dom/server': ['renderToStaticMarkup'],
      // },
    }),

    // Convert JSON imports to ES6 modules.
    json(),

    // Replace `process.env.NODE_ENV` with its value, which enables some modules
    // like React and Slate to use their production variant.
    replace({
      'process.env.NODE_ENV': JSON.stringify(env),
      preventAssignment: true,
    }),

    // Register Node.js builtins for browserify compatibility.
    // builtins(),

    isUmd && asyncT(),
    // Use Babel to transpile the result, limiting it to the source code.
    babel({
      include: [`packages/${realPkgName}/src/**`],
      extensions: ['.js', '.ts', '.tsx'],
      babelHelpers: 'runtime',
      presets: [
        '@babel/preset-typescript',
        [
          '@babel/preset-env',
          isUmd
            ? { modules: false }
            : {
                // Compact:rollup生态(rollup-plugin-async)和babel在处理async的时候可能存在兼容问题
                // https://github.com/rollup/rollup/issues/1518
                exclude: [
                  '@babel/plugin-transform-regenerator',
                  '@babel/transform-async-to-generator',
                ],
                modules: false,
                targets: {
                  esmodules: isModule,
                },
              },
        ],
        /^use-lens$/.test(realPkgName) && '@babel/preset-react',
      ].filter(Boolean),
      plugins: [
        [
          '@babel/plugin-transform-runtime',
          isUmd
            ? {}
            : {
                regenerator: false,
                useESModules: isModule,
              },
        ],
        '@babel/plugin-proposal-class-properties',
      ].filter(Boolean),
    }),

    // Register Node.js globals for browserify compatibility.
    // globals(),

    // Only minify the output in production, since it is very slow. And only
    // for UMD builds, since modules will be bundled by the consumer.
    isUmd && isProd && terser(),
  ].filter(Boolean);

  if (isUmd) {
    // Fixme:The 'this' keyword is equivalent to 'undefined' at the top level of an ES module, and has been rewritten warning
    // 猜测为babel和rollup在处理全局的this时存在冲突
    // https://rollupjs.org/guide/en/#error-this-is-undefined
    // https://github.com/rollup/rollup/issues/1518
    // return {
    //   plugins,
    //   input,
    //   onwarn,
    //   output: {
    //     format: 'umd',
    //     file: `packages/${realPkgName}/${isProd ? pkg.umdMin : pkg.umd}`,
    //     exports: 'named',
    //     name: realPkgName.replace(/ /g, ''),
    //     globals: pkg.umdGlobals,
    //   },
    //   external: Object.keys(pkg.umdGlobals || {}),
    // }
  }

  if (isCommonJs) {
    return {
      plugins,
      input,
      onwarn,
      output: [
        {
          file: `packages/${realPkgName}/${pkg.main}`,
          format: 'cjs',
          exports: 'named',
          sourcemap: true,
        },
      ],
      // We need to explicitly state which modules are external, meaning that
      // they are present at runtime. In the case of non-UMD configs, this means
      // all non-Slate packages.
      external: (id) => {
        return !!deps.find((dep) => dep === id || id.startsWith(`${dep}/`));
      },
      watch: {
        include: `packages/${realPkgName}/${realPkgName}/**`,
        clearScreen: true,
        chokidar: {
          useFsEvents: true,
        },
        buildDelay: 1000,
      },
    };
  }

  if (isModule) {
    return {
      plugins,
      input,
      onwarn,
      output: [
        {
          file: `packages/${realPkgName}/${pkg.module}`,
          format: 'es',
          sourcemap: true,
        },
      ],
      // We need to explicitly state which modules are external, meaning that
      // they are present at runtime. In the case of non-UMD configs, this means
      // all non-Slate packages.
      external: (id) => {
        return !!deps.find((dep) => dep === id || id.startsWith(`${dep}/`));
      },
      // watch: {
      //   include: `packages/${realPkgName}/${realPkgName}/**`,
      //   clearScreen: true,
      //   chokidar: {
      //     useFsEvents: true,
      //   },
      //   buildDelay: 1000,
      // },
    };
  }
}

/**
 * Return a Rollup configuration for a `pkg`.
 */

export function factory(pkg, options = {}) {
  // const isProd = process.env.NODE_ENV === 'production'
  return [
    configure(pkg, 'development', 'cjs', options),
    configure(pkg, 'development', 'module', options),
    // 暂时不提供umd规格的编译
    // isProd && configure(pkg, 'development', 'umd', options),
    // isProd && configure(pkg, 'production', 'umd', options),
  ].filter(Boolean);
}

/**
 * Config.
 */

export default [
  ...factory(caseMatch),
  ...factory(lens),
  ...factory(useLens),
  ...factory(fe),
  ...factory(radar),
];
