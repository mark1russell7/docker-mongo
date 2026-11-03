import { defineConfig } from "vitest/config";

// The tests of the package. The tests of the site run in site/.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});
