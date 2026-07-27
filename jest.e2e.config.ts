import type { Config } from "@jest/types";
import base from "./jest.config";

// The container e2e suites (e2e/run-e2e.sh orchestrates the fixture
// servers): real network, node environment, same transforms as the
// unit config.
const jestConfig: Config.InitialOptions = {
  ...base,
  testEnvironment: "node",
  setupFilesAfterEnv: [],
  testMatch: ["<rootDir>/e2e/**/*.e2e.test.{ts,tsx}"],
  testTimeout: 30_000,
  passWithNoTests: false,
};

export default jestConfig;
