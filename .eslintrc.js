const NodeGlobals = ["module", "require"];

module.exports = {
  parser: "@typescript-eslint/parser",
  // plugin:prettier/recommended ===
  // "extends": ["prettier"] +
  // "plugins": ["prettier"] +  "rules": { "prettier/prettier": "error"}
  extends: ["plugin:prettier/recommended"],
  env: {
    browser: true,
    es6: true,
    jest: true
  },
  parserOptions: {
    sourceType: "module"
  },
  plugins: ["jest"],
  rules: {
    "prettier/prettier": "error",
    "no-debugger": "error",
    "no-unused-vars": [
      "error",
      // 捕获未使用的变量，但不捕获参数
      { varsIgnorePattern: ".*", args: "none" }
    ],
    // most of the codebase are expected to be env agnostic
    "no-restricted-globals": ["error", ...NodeGlobals],
    // since we target ES2015 for baseline support, we need to forbid object
    // rest spread usage in destructure as it compiles into a verbose helper.
    // TS now compiles assignment spread into Object.assign() calls so that
    // is allowed.
    "no-restricted-syntax": ["error", "ObjectPattern > RestElement", "AwaitExpression"]
  },
  overrides: [
    // tests, no restrictions (runs in Node / jest with jsdom)
    {
      files: ["**/__tests__/**"],
      rules: {
        "no-restricted-globals": "off",
        "no-restricted-syntax": "off",
        "jest/no-disabled-tests": "error",
        "jest/no-focused-tests": "error"
      }
    }
  ]
};
