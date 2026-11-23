# portfolio

My portfolio, drawn as a dithered solar system in WebGL2. Planets are sections, moons are projects, comets are updates, the black hole is the archive.

No build step: it's plain HTML, CSS and ES modules in `public/`, served as-is by a Cloudflare Worker at https://tredoux.dev.

## Editing content

Almost everything you'd change is in **`public/src/content.js`**:

| What | Where |
| --- | --- |
| Projects, essays, jobs (the moons) | `ISL` |
| The Resume dig (eras, logos, links) | `STRATA` |
| Starlee's monoliths (photos, titles, lines) | `MEM` |
| Planet field notes | `FACTS` |

Images live in `public/assets/`. A project's `imgs` takes up to two image paths; a monolith takes `img` (the stone) and `full` (the photo that opens when you tap it).

## Comets

Every push to a public repo on the `camerontredoux` GitHub account flies in as a comet and hits Work. Pages that are open when the push lands get the comet live. Tapping its crater shows the repo, branch, commit title, and a link to the commit on GitHub.

- **Webhook:** a GitHub App on the `camerontredoux` account sends push events to `https://tredoux.dev/api/github`. The Worker (`worker/index.js`) checks the signature against the secret `GITHUB_WEBHOOK_SECRET` and drops pushes to private repos.
- **Live updates:** one Durable Object, `Sky`, keeps the latest 40 comets. Each open page holds a WebSocket to `/api/comets`. The Durable Object hibernates between pushes, so idle connections cost almost nothing.
- **Visitors** see each push once: first-time visitors get the latest three, returning visitors get whatever was pushed since their last visit.
- **The second line** is the commit count for a multi-commit push. For a single commit, it is the first line of the commit body.

## Running locally

```sh
pnpm install
pnpm dev
```

Then open http://localhost:8787. `pnpm dev` runs the Worker locally with Wrangler. (Opening `index.html` straight from disk won't work, because browsers block ES modules on `file://`.)

## Deploying

A push to `main` deploys. The GitHub Actions workflow in `.github/workflows/deploy.yml` runs `wrangler deploy` with the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

Set the webhook secret once with `pnpm exec wrangler secret put GITHUB_WEBHOOK_SECRET`. For local dev, put it in `.dev.vars`.

To deploy by hand, put the Cloudflare token and account ID in `.env` (it is gitignored) and run:

```sh
set -a && . ./.env && set +a && pnpm run deploy
```

## Layout

```
wrangler.jsonc           Worker config: domains, static assets, Durable Object
worker/index.js          webhook endpoint, comet WebSocket, the Sky Durable Object
public/index.html        page shell, HUD markup, crawler-readable summary
public/src/content.js    everything editable
public/src/main.js       the engine: camera, interaction, scenes, render loop
public/src/shaders.js    GLSL for the points, the planet worlds and the pixel blit
public/src/fallback.js   plain-text version for browsers without WebGL2
public/src/styles.css    HUD and text styles
public/src/comets.js     comet feed client: WebSocket, queue, "seen" tracking
public/_headers          cache and preload headers
public/assets/           photos and logos
public/og.png            link-preview image
```

## Notes

- Quality adapts: if frames run slow for a few seconds, the page renders at a lower pixel ratio.
- Browsers without WebGL2 get the plain version built from the same content.
- Caching: scripts are cached for 5 minutes and then refreshed in the background, so a returning visitor may see the previous deploy once. Images are cached for a week. `index.html` is always checked.
- Deep links: `/#slug` opens a project (for example `/#bytebot`).
