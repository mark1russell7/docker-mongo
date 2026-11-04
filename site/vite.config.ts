import { siteShell } from "@mark1russell7/site-pages/vite";
import { defineConfig } from "vite";

// The site has one page: the settings, the dry run, the API and the Docker commands. The deploy adds `status/` and `releases/`.
export default defineConfig({
  plugins: [siteShell({ themeKey: "docker-mongo-theme" })],
});
