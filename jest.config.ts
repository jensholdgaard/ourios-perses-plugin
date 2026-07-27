import type { Config } from "@jest/types";

// Self-contained equivalent of the Perses plugins monorepo's
// `jest.shared`: the percli scaffold assumed a parent workspace this
// standalone repository does not have.
const jestConfig: Config.InitialOptions = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setup-tests.ts"],
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  // Tests land with the RFC0041.1-.3 slices; until then an empty suite
  // must not fail the gate.
  passWithNoTests: true,
};

export default jestConfig;
