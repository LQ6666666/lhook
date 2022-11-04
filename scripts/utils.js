const fs = require("node:fs");
const chalk = require("chalk");

const targets = (exports.targets = fs.readdirSync("packages").filter(f => {
  if (!fs.statSync(`packages/${f}`).isDirectory()) {
    return false;
  }

  const pkg = require(`../packages/${f}/package.json`);
  if (pkg.private && !pkg.buildOptions) {
    return false;
  }

  return true;
}));

// 模糊匹配 target
exports.fuzzyMatchTarget = (partialTargets, includeAllMatching) => {
  const matched = [];
  partialTargets.forEach(partialTarget => {
    for (const target of targets) {
      // 匹配到了就退出
      if (target.match(partialTarget)) {
        matched.push(target);

        if (!includeAllMatching) {
          break;
        }
      }
    }
  });

  if (matched.length) {
    return matched;
  } else {
    console.log();
    console.error(
      `  ${chalk.bgRed.white(" ERROR ")} ${chalk.red(
        `Target ${chalk.underline(partialTargets)} not found!`
      )}`
    );
    console.log();

    process.exit(1);
  }
};
