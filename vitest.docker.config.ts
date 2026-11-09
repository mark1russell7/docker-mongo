import { defineConfig } from "vitest/config";

// The Docker tests. They need Docker, so `pnpm test` does not start them. CI starts them (compose.yml).
export default defineConfig({
  test: {
    include: ["test/docker/**/*.docker.ts"],
    testTimeout: 300_000,
    hookTimeout: 300_000,
    fileParallelism: false,
  },
});
