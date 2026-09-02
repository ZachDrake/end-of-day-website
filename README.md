# End of Day Website — V17

V2 turns the landing-page concept into a real Astro project.

## Direction

The site is designed as the public front door for one WARDOGS community server:

- dark / modern / military-adjacent without becoming "tacticool"
- community-first rather than generic WARDOGS fan-site copy
- server and Discord are the primary calls to action
- temporary brand values are centralized so a final clan/community name is easy to swap
- prepared for live server data when the dedicated-server interface is known
- built for static deployment and good SEO

## Run it

Requirements:

- Node.js 20+
- npm

```bash
npm install
npm run dev
```

Then open the local URL Astro prints in the terminal.

Production build:

```bash
npm run build
```

## Configure the site

Edit:

```text
src/config/site.ts
```

This holds:

- community name
- three-letter tag
- server name
- region
- Discord URL
- Steam URL
- launch date
- server state
- SEO title / description

## Add screenshots

The "FROM THE SERVER" section currently uses styled placeholders on purpose.

Once you have real community screenshots:

1. Put optimized `.webp` images in `public/images/`.
2. Replace the placeholder blocks in `src/pages/index.astro`.
3. Use `<img>` with useful `alt` text.
4. Keep images from the actual community server whenever possible.

## Deployment

Good V1 hosting options for this architecture:

- Cloudflare Pages
- Netlify
- Vercel
- GitHub Pages

Cloudflare Pages is the current recommendation.

## Next engineering milestone

Once we know how WARDOGS exposes dedicated server information, add:

```text
/api/server-status
```

and return normalized JSON such as:

```json
{
  "online": true,
  "name": "Community Server",
  "players": 64,
  "maxPlayers": 100,
  "map": "Example",
  "queue": 3
}
```

The homepage's server intel card is already laid out to display it.

## SEO expansion after the homepage is live

Add useful, human-written routes instead of mass-producing thin pages:

```text
/server
/discord
/rules
/about
/guides
```

Possible guide topics should only be added when we have something genuinely useful to say.

## Temporary branding

The final community name is intentionally unresolved.

Current placeholder:

- Name: `WARDOGS Community`
- Tag: `WDC`

When a real name wins, change it in `src/config/site.ts` and update the domain / canonical URL.


## V3 changes

- Replaced placeholder site rules with the current Discord rules.
- Updated the rules section heading to `RULES OF ENGAGEMENT`.
- Preserved the community's existing tone and humor.
- Kept community name, tag, logo, and final identity intentionally neutral until the vote is complete.


## V4 changes — Discord funnel

- Wired the live Discord invite into the site:
  `https://discord.gg/NVgJ5mpscy`
- Every Discord CTA now opens the invite in a new tab.
- Strengthened the Discord section with three clear visitor benefits:
  - Find a squad
  - Server announcements
  - Community & clips
- Updated the copy for the pre-launch funnel.
- Kept all invite-link configuration centralized in `src/config/site.ts`.


## V5 changes — pre-launch conversion funnel

- Discord is now the primary hero CTA during pre-launch.
- Added a dedicated `JOIN NOW` section explaining why joining before launch matters.
- Added a three-step visitor path:
  1. Join the Discord
  2. Meet the regulars
  3. Be there day one
- Added a pre-launch FAQ section.
- Added a persistent mobile Discord CTA.
- Updated SEO copy to emphasize both the WARDOGS Discord and upcoming community server.
- Left name, logo, tag, and final visual identity flexible until the community vote is complete.


## V6 changes — visual polish and JavaScript

This is the first fully polished visual pass.

### CSS
- Cinematic layered backgrounds and dynamic cursor lighting
- Animated tactical grid
- Glassy sticky navigation
- Modern hover states and button shine
- HUD-style telemetry
- Server intel rings / visual treatment
- Stronger screenshot placeholders
- Card lift / accent interactions
- Scroll progress indicator
- Motion-reduction accessibility support

### JavaScript
- Live Early Access countdown with days / hours / minutes
- IntersectionObserver scroll-reveal animations
- Sticky navigation scroll state
- Scroll progress calculation
- Desktop cursor spotlight
- Lightweight hero parallax

The production site still uses plain CSS + vanilla JavaScript inside Astro. No animation
framework was added, keeping the site small and fast.

### Preview fix
The standalone preview is now self-contained with its CSS embedded directly in the HTML,
so it should display correctly when opened from ChatGPT's sandbox rather than appearing
as an unstyled HTML document.


## V7 changes — founding community and brand scaffolding

- Added a temporary emblem slot designed to be replaced by the final community logo.
- Added a `FOUNDING COMMUNITY` section aimed at pre-launch recruitment.
- Added a "founding members wanted" identity card without inventing member counts.
- Added desktop Discord QR-code support.
- Preserved the direct Discord button for all devices.
- Updated final call-to-action copy to match the current branding roadmap.
- Kept all current branding temporary until the community name vote and logo are complete.

### Replacing the temporary emblem later

When the final logo is ready:

1. Add the logo to `public/images/`.
2. Replace `.brand-emblem` in `src/pages/index.astro` with the real `<img>`.
3. Replace the `W` inside `.founding-symbol` with the same mark or a simplified variant.
4. Generate favicon / social-card versions from the same identity.


## V8 changes — real WARDOGS visual layer

- Added official WARDOGS key art as the provisional hero background.
- Replaced generic media placeholders with official WARDOGS pre-launch screenshots.
- Added a responsive gallery and vanilla-JavaScript lightbox.
- Added `src/config/media.ts` so visual sources are centralized.
- Added a clear content roadmap: official media now, genuine community-server captures after launch.
- Updated the footer to clarify ownership of promotional media.

### Before public deployment

The prototype references Team17-hosted media remotely. Before the public site goes live,
download approved images from the official Team17 WARDOGS press kit and host optimized
copies under `/public/images` instead of hotlinking.

Official press-kit URL discovered through Team17's Press & Creator Hub:

`https://www.team17.com/hubfs/WARDOGS%20-%20Press%20Kit%20%28Aug%2026%29.zip`


## V9 — End of Day branding

The temporary community identity has been replaced with the official brand:

- **Name:** End of Day
- **Tag:** EOD
- **Established:** 2026
- **Primary logo:** `public/images/end-of-day-logo.png`

### Brand palette

- Charcoal / near-black backgrounds
- Gunmetal panels
- Silver / steel borders and secondary typography
- Deep EOD red as the main accent
- Brighter red reserved for active states and calls to action

The logo is now used in the navigation, hero, founding-community panel, favicon,
and social metadata. The earlier lime prototype accent has been removed from the brand system.


## V10 — standalone preview asset fix

- Fixed broken EOD logo images in the ChatGPT/sandbox preview.
- The standalone `preview/index.html` now embeds the EOD logo as a base64 data URI.
- The production Astro project still uses `/images/end-of-day-logo.png`, which is the correct deployment path.


## V11 — hero cleanup

- Removed the large EOD logo from the right side of the hero.
- Kept the smaller navigation/header logo as the primary brand mark.
- Removed the unused hero-logo CSS and responsive overrides.


## V12 — deployment hardening

This pass focuses on the pieces needed for a real public deployment rather than new visual effects.

### Added
- Dedicated 1200×630 OpenGraph / social share card.
- Web app manifest and mobile icons.
- `robots.txt`.
- Cloudflare Pages `_headers` security defaults.
- Domain-ready `SITE_URL` environment configuration.
- Proper branded 404 page.
- Dedicated `/rules` route using the canonical Discord rules.
- Improved OpenGraph and Twitter metadata.
- Apple touch icon and cleaner favicon setup.

### Domain deployment

When the domain is chosen, set:

```text
SITE_URL=https://your-real-domain.com
```

in the Cloudflare Pages environment variables. Astro will then produce correct
canonical and social URLs without changing source code.

### Still pending
- Downloading approved WARDOGS press-kit media and serving it locally rather than
  relying on Team17-hosted URLs.
- Sitemap submission after the final production domain exists.
- Google Search Console / Bing Webmaster setup after deployment.


## V13 — cleaner hero and confident server messaging

- Replaced the key-art hero with a cleaner WARDOGS battlefield screenshot to remove competing embedded text.
- Removed the floating telemetry panel.
- Removed the giant background hero mark.
- Reduced headline scale and simplified supporting copy.
- Added a small right-side note instead of another full information panel.
- Simplified the bottom launch/status strip.
- Replaced tentative `server planned` language with `server coming`.
- Server status now reads `COMING WITH EARLY ACCESS`.


## V14 — permanent Discord invite locked

Permanent End of Day Discord invite:

`https://discord.gg/NVgJ5mpscy`

This invite is configured as:
- Never expires
- Unlimited uses

V14 changes:
- Replaced the previous Discord invite everywhere in the project.
- Regenerated `public/images/discord-qr.png` from the permanent invite.
- Updated the standalone preview QR so it remains self-contained.
- All Join Discord / Join Before Launch / Join End of Day CTAs now use the same permanent invite.


## V15 — header fixes

Two production issues were fixed:

1. **Header logo / QR mix-up**
   - The EOD logo is explicitly assigned to the navigation brand.
   - The Discord QR is explicitly assigned only to the Discord QR container.
   - The standalone preview now embeds each image independently instead of using a broad image replacement.

2. **Navigation overlap while scrolling**
   - The top navigation is now a fixed, full-width banner.
   - Initial page content reserves the banner height.
   - As the page scrolls, content moves underneath the banner instead of colliding with the logo/text.
   - The banner uses an opaque charcoal/glass background so scrolling content does not reduce navigation readability.


## V16 — searchable site architecture

The homepage is still the main recruitment funnel, but End of Day now has focused,
crawlable pages for search engines and direct sharing:

- `/server` — dedicated WARDOGS server information and launch status.
- `/discord` — permanent Discord landing page with the locked QR code and invite.
- `/about` — community identity and philosophy.
- `/rules` — canonical End of Day rules.
- `/sitemap.xml` — generated automatically from `Astro.site` / the `SITE_URL` environment variable.

This gives Google useful pages for searches such as:
- End of Day WARDOGS
- WARDOGS community server
- WARDOGS Discord
- WARDOGS US East server

The sitemap will automatically use the real production hostname once `SITE_URL` is set.


## V17 — WARDOGS community search page

- Added `/wardogs-community` as the primary landing page for people searching
  for a WARDOGS community.
- Focused the page on EOD's real identity: familiar names, busy lives,
  teamwork, a low-drama culture, and a community server at launch.
- Linked the page from the homepage, every main navigation, and the footer.
- Added the new route to the XML sitemap and declared it in `robots.txt`.
- Updated the homepage title and description around `WARDOGS community` and
  `US East server` search intent.
- Expanded structured data to identify End of Day as both a website and an
  organization, with EOD as an alternate name.
