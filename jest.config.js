/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/*.test.ts"],
  // Block live fetch unless a test installs its own mock. Fixtures only.
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};
