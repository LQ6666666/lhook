const fs = require("node:fs");
const path = require("node:path");

const minimist = require("minimist");

const version = require("../package.json").version;
const args = minimist(process.argv.slice(2));
const packagesDir = path.resolve(__dirname, "../packages");
const files = fs.readdirSync(packagesDir);

files.forEach(shortName => {
  if (!fs.statSync(path.join(packagesDir, shortName)).isDirectory()) {
    return;
  }

  const name = shortName === `lhook` ? shortName : `@lhook/${shortName}`;
  const pkgPath = path.join(packagesDir, shortName, `package.json`);
  const pkgExists = fs.existsSync(pkgPath);

  if (pkgExists) {
    const pkg = require(pkgPath);
    if (pkg.private) {
      return;
    }
  }

  if (args.force || !pkgExists) {
    const json = {
      name,
      version,
      description: name,
      main: "./index.js",
      module: `./dist/${shortName}.esm-bundler.js`,
      types: `./dist/${shortName}.d.ts`,
      unpkg: `./dist/${shortName}.global.js`,
      exports: {
        import: {
          types: `./dist/${shortName}.d.ts`,
          default: `./dist/${shortName}.esm-bundler.js`
        },
        require: {
          types: `./dist/${shortName}.d.ts`,
          default: "./index.js"
        }
      },
      sideEffects: false,
      repository: {
        type: "git",
        url: "git+https://github.com/LQ6666666/lhook",
        directory: `packages/${shortName}`
      },
      peerDependencies: {
        vue: "^3.2.0"
      },
      devDependencies: {
        vue: "^3.2.47"
      },
      keywords: ["vue", "hook", "vue-hook"],
      author: "Qi Li",
      license: "MIT",
      bugs: {
        url: "https://github.com/LQ6666666/lhook/issues"
      },
      homepage: `https://github.com/LQ6666666/lhook/tree/main/packages/${shortName}`
    };
    fs.writeFileSync(pkgPath, JSON.stringify(json, null, 2));
  }

  const readmePath = path.join(packagesDir, shortName, `README.md`);
  if (args.force || !fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, `# ${name}`);
  }

  const apiExtractorConfigPath = path.join(packagesDir, shortName, `api-extractor.json`);
  if (args.force || !fs.existsSync(apiExtractorConfigPath)) {
    fs.writeFileSync(
      apiExtractorConfigPath,
      `
{
  "extends": "../../api-extractor.json",
  "mainEntryPointFilePath": "./dist/packages/<unscopedPackageName>/src/index.d.ts",
  "dtsRollup": {
    "publicTrimmedFilePath": "./dist/<unscopedPackageName>.d.ts"
  }
}

`.trim() + "\n"
    );
  }

  const srcDir = path.join(packagesDir, shortName, `src`);
  const indexPath = path.join(packagesDir, shortName, `src/index.ts`);
  if (args.force || !fs.existsSync(indexPath)) {
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir);
    }
    fs.writeFileSync(indexPath, ``);
  }

  const nodeIndexPath = path.join(packagesDir, shortName, "index.js");
  if (args.force || !fs.existsSync(nodeIndexPath)) {
    fs.writeFileSync(
      nodeIndexPath,
      `
"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/${shortName}.cjs.prod.js");
} else {
  module.exports = require("./dist/${shortName}.cjs.js");
}
    `.trim() + "\n"
    );
  }
});
