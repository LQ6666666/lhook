const fs = require("node:fs");
const path = require("node:path");

const chalk = require("chalk");
const execa = require("execa");
const semver = require("semver");
const { prompt } = require("enquirer");

const args = require("minimist")(process.argv.slice(2));
const currentVersion = require("../package.json").version;

// 获取全部的 package
const packages = fs
  .readdirSync(path.resolve(__dirname, "../packages"))
  .filter((p) => !p.endsWith(".ts") && !p.startsWith("."));

// 忽略的包
const skippedPackages = [];

const versionIncrements = ["patch", "minor", "major"];
const inc = (i) => semver.inc(currentVersion, i);

// const bin = (name) => path.resolve(__dirname, "../node_modules/.bin/" + name);

const run = (bin, args, opts = {}) =>
  execa(bin, args, { stdio: "inherit", ...opts });

const dryRun = (bin, args, opts = {}) =>
  console.log(chalk.blue(`[dryrun] ${bin} ${args.join(" ")}`), opts);

const getPkgRoot = (pkg) => path.resolve(__dirname, "../packages/" + pkg);
const step = (msg) => console.log(chalk.cyan(msg));

async function main() {
  let targetVersion = args._[0];

  if (!targetVersion) {
    // @ts-ignore
    const { release } = await prompt({
      type: "select",
      name: "release",
      message: "Select release type",
      choices: versionIncrements.map((i) => `${i} (${inc(i)})`),
    });

    targetVersion = release.match(/\((.*)\)/)[1];
    console.log(targetVersion);
  }

  if (!semver.valid(targetVersion)) {
    throw new Error(`invalid target version: ${targetVersion}`);
  }

  // @ts-ignore
  const { yes } = await prompt({
    type: "confirm",
    name: "yes",
    message: `Releasing v${targetVersion}. Confirm?`,
  });

  if (!yes) {
    return;
  }

  step("\nRunning tests...");

  // update all package versions and inter-dependencies
  step("\nUpdating cross dependencies...");
  updateVersions(targetVersion);

  // build all packages with types
  step("\nBuilding all packages...");
  await run("pnpm", ["run", "build", "--release"]);

  // update pnpm-lock.yaml
  step("\nUpdating lockfile...");
  await run(`pnpm`, ["install", "--prefer-offline"]);

  const { stdout } = await run("git", ["diff"], { stdio: "pipe" });
  if (stdout) {
    step("\nCommitting changes...");
    await run("git", ["add", "-A"]);
    await run("git", ["commit", "-m", `chore: v${targetVersion}`]);
  } else {
    console.log("No changes to commit.");
  }

  // publish packages
  step("\nPublishing packages...");
  for (const pkg of packages) {
    await publishPackage(pkg, targetVersion);
  }

  // push to GitHub
  step("\nPushing to GitHub...");
  await run("git", ["tag", `v${targetVersion}`]);
  await run("git", ["push", "origin", `refs/tags/v${targetVersion}`]);
  await run("git", ["push"]);

  if (skippedPackages.length) {
    console.log(
      chalk.yellow(
        `The following packages are skipped and NOT published:\n- ${skippedPackages.join(
          "\n- "
        )}`
      )
    );
  }
  console.log();
}

function updateVersions(version) {
  // 1. update root package.json
  updatePackage(path.resolve(__dirname, ".."), version);
  // 2. update all packages
  packages.forEach((p) => updatePackage(getPkgRoot(p), version));
}

function updatePackage(pkgRoot, version) {
  const pkgPath = path.resolve(pkgRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  pkg.version = version;
  updateDeps(pkg, "dependencies", version);
  updateDeps(pkg, "peerDependencies", version);
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

function updateDeps(pkg, depType, version) {
  const deps = pkg[depType];
  if (!deps) return;

  Object.keys(deps).forEach((dep) => {
    if (
      dep.startsWith("@lhook") &&
      packages.includes(dep.replace(/^@lhook\//, ""))
    ) {
      console.log(
        chalk.yellow(`${pkg.name} -> ${depType} -> ${dep}@${version}`)
      );
      deps[dep] = `workspace:^${version}`;
    }
  });
}

async function publishPackage(pkgName, version) {
  if (skippedPackages.includes(pkgName)) {
    return;
  }

  const pkgRoot = getPkgRoot(pkgName);
  const pkgPath = path.resolve(pkgRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  if (pkg.private) return;

  step(`Publishing ${pkgName}...`);

  try {
    await run(
      "pnpm",
      ["publish", "-r", "--access", "public", "--filter", pkgName],
      {
        cwd: pkgRoot,
        stdio: "pipe",
      }
    );
    console.log(chalk.green(`Successfully published ${pkgName}@${version}`));
  } catch (e) {
    if (e.stderr.match(/previously published/)) {
      console.log(chalk.red(`Skipping already published: ${pkgName}`));
    } else {
      throw e;
    }
  }
}

main().catch((err) => {
  updateVersions(currentVersion);
  console.error(err);
});
