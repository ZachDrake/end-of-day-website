import { defineConfig } from "astro/config";

const siteUrl =
  process.env.SITE_URL ??
  "https://playendofday.com";

export default defineConfig({
  site: siteUrl,
  output: "static"
});
