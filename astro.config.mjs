import { defineConfig } from "astro/config";

const siteUrl =
  process.env.SITE_URL ??
  "https://example.com";

export default defineConfig({
  site: siteUrl,
  output: "static"
});
