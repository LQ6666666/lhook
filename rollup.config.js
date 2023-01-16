import path from "node:path";
import ts from "rollup-plugin-typescript2";
import replace from "@rollup/plugin-replace";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";

if (!process.env.TARGET) {
  throw new Error("TARGET package must be specified via --environment flag.");
}

const masterVersion = require("./package.json").version;
const packagesDir = path.resolve(__dirname, "packages");
const packageDir = path.resolve(packagesDir, process.env.TARGET);

const resolve = p => path.resolve(packageDir, p);

const pkg = require(resolve(`package.json`));
const packageOptions = pkg.buildOptions || {};
const name = packageOptions.filename || path.basename(packageDir);

// ensure TS checks only once for each build
let hasTSChecked = false;

const outputConfigs = {
  "esm-bundler": {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: `es`
  },
  "esm-browser": {
    file: resolve(`dist/${name}.esm-browser.js`),
    format: `es`
  },
  cjs: {
    file: resolve(`dist/${name}.cjs.js`),
    format: `cjs`
  },
  global: {
    file: resolve(`dist/${name}.global.js`),
    format: `iife`
  }
};

const defaultFormats = ["esm-bundler", "cjs"];
const inlineFormats = process.env.FORMATS && process.env.FORMATS.split(",");
const packageFormats = inlineFormats || packageOptions.formats || defaultFormats;
const packageConfigs = process.env.PROD_ONLY
  ? []
  : packageFormats.map(format => createConfig(format, outputConfigs[format]));

if (process.env.NODE_ENV === "production") {
  packageFormats.forEach(format => {
    if (packageOptions.prod === false) {
      return;
    }

    if (format === "cjs") {
      packageConfigs.push(createProductionConfig(format));
    }

    if (/^(global|esm-browser)/.test(format)) {
      packageConfigs.push(createMinifiedConfig(format));
    }
  });
}

export default packageConfigs;

function createConfig(format, output, plugins = []) {
  if (!output) {
    console.log(require("chalk").yellow(`invalid format: "${format}"`));
    process.exit(1);
  }

  const isProductionBuild = process.env.__DEV__ === "false" || /\.prod\.js$/.test(output.file);
  const isBundlerESMBuild = /esm-bundler/.test(format);
  const isBrowserESMBuild = /esm-browser/.test(format);

  const isNodeBuild = format === "cjs";
  const isGlobalBuild = /global/.test(format);

  output.exports = "named";
  output.sourcemap = !!process.env.SOURCE_MAP;
  output.externalLiveBindings = false;

  if (isGlobalBuild) {
    output.name = packageOptions.name;
  }

  const shouldEmitDeclarations = pkg.types && process.env.TYPES != null && !hasTSChecked;

  const tsPlugin = ts({
    check: process.env.NODE_ENV === "production" && !hasTSChecked,
    tsconfig: path.resolve(__dirname, "tsconfig.json"),
    cacheRoot: path.resolve(__dirname, "node_modules/.rts2_cache"),
    tsconfigOverride: {
      compilerOptions: {
        target: isNodeBuild ? "es2019" : "es2015",
        sourceMap: output.sourcemap,
        declaration: shouldEmitDeclarations,
        declarationMap: shouldEmitDeclarations
      },
      exclude: ["**/__tests__"]
    }
  });

  // we only need to check TS and generate declarations once for each build.
  // it also seems to run into weird issues when checking multiple times
  // during a single build.
  hasTSChecked = true;

  let external = [];

  if (isGlobalBuild || isBrowserESMBuild) {
    external = ["vue"];
  } else {
    // Node / esm-bundler builds.
    external = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})];
  }

  output.globals = {
    vue: "Vue"
  };

  const nodePlugins = [commonjs({ sourceMap: false }), nodeResolve()];

  const isBrowserBuild = isGlobalBuild || isBrowserESMBuild || isBundlerESMBuild;

  return {
    input: resolve("src/index.ts"),
    // Global and Browser ESM builds inlines everything so that they can be
    // used alone.
    external,
    plugins: [
      json({
        namedExports: false
      }),
      tsPlugin,
      createReplacePlugin(
        isProductionBuild,
        isBundlerESMBuild,
        isBrowserESMBuild,
        isBrowserBuild,
        isGlobalBuild
      ),
      ...nodePlugins,
      ...plugins
    ],
    output,
    onwarn: (msg, warn) => {
      if (!/Circular/.test(msg)) {
        warn(msg);
      }
    },
    treeshake: {
      moduleSideEffects: false
    }
  };
}

function createReplacePlugin(
  isProduction,
  isBundlerESMBuild,
  isBrowserESMBuild,
  isBrowserBuild,
  isGlobalBuild
) {
  const replacements = {
    __VERSION__: `"${masterVersion}"`,
    __DEV__: isBundlerESMBuild
      ? // preserve to be handled by bundlers
        `(process.env.NODE_ENV !== 'production')`
      : // hard coded dev/prod builds
        !isProduction,
    // this is only used during Vue's internal tests
    __TEST__: false,
    // If the build is expected to run directly in the browser (global / esm builds)
    __BROWSER__: isBrowserBuild,
    __GLOBAL__: isGlobalBuild,
    __ESM_BUNDLER__: isBundlerESMBuild,
    __ESM_BROWSER__: isBrowserESMBuild,

    // for compiler-sfc browser build inlined deps
    ...(isBrowserESMBuild
      ? {
          "process.env": "({})",
          "process.platform": '""',
          "process.stdout": "null"
        }
      : {})
  };

  // allow inline overrides like
  Object.keys(replacements).forEach(key => {
    if (key in process.env) {
      replacements[key] = process.env[key];
    }
  });

  return replace({
    // @ts-ignore
    values: replacements,
    preventAssignment: true
  });
}

function createProductionConfig(format) {
  return createConfig(format, {
    file: resolve(`dist/${name}.${format}.prod.js`),
    format: outputConfigs[format].format
  });
}

function createMinifiedConfig(format) {
  const { terser } = require("rollup-plugin-terser");
  return createConfig(
    format,
    {
      file: outputConfigs[format].file.replace(/\.js$/, ".prod.js"),
      format: outputConfigs[format].format
    },
    [
      terser({
        module: /^esm/.test(format),
        compress: {
          ecma: 2015,
          pure_getters: true
        },
        safari10: true
      })
    ]
  );
}
