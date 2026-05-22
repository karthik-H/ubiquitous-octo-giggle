/**
 * CodeValid Jest config — tests live under .codevalid/ (rootDir here) while
 * TypeScript + node_modules resolve from the installable package (monorepo-safe
 * via CODEVALID_PACKAGE_ROOT). Using the package as rootDir breaks testMatch for
 * paths under .codevalid/, so module paths point at the package explicitly.
 */
const path = require("path");

const codevalidDir = __dirname;
const appRoot = path.resolve(codevalidDir, "..");
const rel =
  process.env.CODEVALID_PACKAGE_ROOT != null &&
  String(process.env.CODEVALID_PACKAGE_ROOT).trim() !== ""
    ? String(process.env.CODEVALID_PACKAGE_ROOT).trim().replace(new RegExp("^/+"), "")
    : "";
const packageRoot = rel ? path.join(appRoot, rel) : appRoot;
const pkgTsconfig = path.join(packageRoot, "tsconfig.test.json");

let tsJestTransform;
try {
  tsJestTransform = require.resolve("ts-jest", { paths: [packageRoot] });
} catch (e) {
  tsJestTransform = require.resolve("ts-jest");
}

module.exports = {
  rootDir: codevalidDir,
  testEnvironment: "node",
  testMatch: ["**/*.ts"],
  moduleDirectories: [
    path.join(packageRoot, "node_modules"),
    path.join(appRoot, "node_modules"),
    "node_modules",
  ],
  moduleNameMapper: {
    "^@app/(.*)$": path.join(packageRoot, "src", "$1"),
  },
  transform: {
    '^.+\.ts$': [
      tsJestTransform,
      {
        tsconfig: pkgTsconfig,
        diagnostics: { 
          ignoreCodes: [5107],
          warnOnly: true,
        },
      },
    ],
  },
  verbose: true,
  silent: false,
};
