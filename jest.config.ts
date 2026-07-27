import type { Config } from "@jest/types";

// Self-contained equivalent of the Perses plugins monorepo's
// `jest.shared`: the percli scaffold assumed a parent workspace this
// standalone repository does not have. The swc options are inline —
// the build's `.swcrc` excludes `*.test.*` (correct for the build,
// but `@swc/jest` would inherit that exclusion and refuse the suites).
const jestConfig: Config.InitialOptions = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        swcrc: false,
        jsc: {
          parser: { syntax: "typescript", tsx: true },
          target: "es2022",
          transform: { react: { runtime: "automatic" } },
        },
        module: { type: "commonjs" },
      },
    ],
  },
  // echarts/zrender ship untranspiled ESM; let swc transform them (the
  // default ignore skips all of node_modules and jest chokes on the
  // `export` syntax even though setup-tests mocks echarts/core).
  transformIgnorePatterns: ["/node_modules/(?!(echarts|zrender)/)"],
  // CSS imports (e.g. @fontsource pulled in by @perses-dev/components)
  // are style side effects with no test semantics — stub them.
  moduleNameMapper: {
    "\\.(css|less|scss)$": "<rootDir>/src/test-stubs/style-stub.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setup-tests.ts"],
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  // Suites now exist for RFC0041.1/.2; keep an empty run non-fatal for
  // sparse checkouts.
  passWithNoTests: true,
};

export default jestConfig;
