export const prerender = true;

export function GET({ site }: { site?: URL }) {
  const base = site ?? new URL("https://playendofday.com");
  const paths = [
    "/",
    "/wardogs-community",
    "/server",
    "/discord",
    "/rules",
    "/about"
  ];

  const urls = paths
    .map((path) => {
      const url = new URL(path, base).toString();
      return `  <url><loc>${url}</loc></url>`;
    })
    .join("\n");

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
