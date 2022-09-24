const path = require("node:path");

const fs = require("fs-extra");
const execa = require("execa");
const chalk = require("chalk");

const { targets: allTargets, fuzzyMatchTarget } = require("./utils");

const args = require("minimist")(process.argv.slice(2));
const targets = args._;
const formats = args.formats || args.f;
const devOnly = args.devOnly || args.d;
const prodOnly = !devOnly && (args.prodOnly || args.p);
const sourceMap = args.sourcemap || args.s;
const isRelease = args.release;
const buildTypes = args.t || args.types || isRelease;
const buildAllMatching = args.all || args.a;

run();

async function run() {
  if (isRelease) {
    // remove build cache for release builds to avoid outdated enum values
    await fs.remove(path.resolve(__dirname, "../node_modules/.rts2_cache"));
  }

  // 没有传入 targets 就打包所有的
  if (!targets.length) {
    await buildAll(allTargets);
  } else {
    await buildAll(fuzzyMatchTarget(targets, buildAllMatching));
  }
}

async function buildAll(targets) {
  await runParallel(require("os").cpus().length, targets, build);
}

// 异步并发控制
async function runParallel(maxConcurrency, source, iteratorFn) {
  const ret = [];
  const executing = [];

  for (const item of source) {
    const p = Promise.resolve().then(() => iteratorFn(item, source));
    ret.push(p);

    if (maxConcurrency <= source.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(ret);
}

/**
 * 打包目标包
 * @param {string} target 目标包名称
 * @returns {Promise<void>}
 */
async function build(target) {
  const pkgDir = path.resolve(`packages/${target}`);
  const pkg = require(`${pkgDir}/package.json`);
  // 忽略私有的包
  if (!targets.length && pkg.private) {
    return;
  }

  // 如果要构建特定的格式，不要删除 dist
  if (!formats) {
    await fs.remove(`${pkgDir}/dist`);
  }

  const env =
    (pkg.buildOptions && pkg.buildOptions.env) ||
    (devOnly ? "development" : "production");

  await execa(
    "rollup",
    [
      "-c",
      "--environment",
      [
        `NODE_ENV:${env}`,
        `TARGET:${target}`,
        formats ? `FORMATS:${formats}` : ``,
        buildTypes ? `TYPES:true` : ``,
        prodOnly ? `PROD_ONLY:true` : ``,
        sourceMap ? `SOURCE_MAP:true` : ``,
      ]
        .filter(Boolean)
        .join(","),
    ],
    { stdio: "inherit" }
  );

  if (buildTypes && pkg.types) {
    console.log();
    console.log(
      chalk.bold(chalk.yellow(`Rolling up type definitions for ${target}...`))
    );

    // build types
    const { Extractor, ExtractorConfig } = require("@microsoft/api-extractor");

    const extractorConfigPath = path.resolve(pkgDir, `api-extractor.json`);
    const extractorConfig =
      ExtractorConfig.loadFileAndPrepare(extractorConfigPath);

    const extractorResult = Extractor.invoke(extractorConfig, {
      localBuild: true,
      showVerboseMessages: true,
    });

    if (extractorResult.succeeded) {
      // concat additional d.ts to rolled-up dts
      const typesDir = path.resolve(pkgDir, "types");
      if (
        await fs.promises
          .stat(typesDir)
          .then((s) => s.isDirectory())
          .catch(() => false)
      ) {
        const dtsPath = path.resolve(pkgDir, pkg.types);
        const existing = await fs.readFile(dtsPath, "utf-8");
        const typeFiles = await fs.readdir(typesDir);
        const toAdd = await Promise.all(
          typeFiles.map((file) => {
            return fs.readFile(path.resolve(typesDir, file), "utf-8");
          })
        );
        await fs.writeFile(dtsPath, existing + "\n" + toAdd.join("\n"));
      }
      console.log(
        chalk.bold(chalk.green(`API Extractor completed successfully.`))
      );
    } else {
      console.error(
        `API Extractor completed with ${extractorResult.errorCount} errors` +
          ` and ${extractorResult.warningCount} warnings`
      );
      process.exitCode = 1;
    }

    await fs.remove(`${pkgDir}/dist/packages`);
  }
}
