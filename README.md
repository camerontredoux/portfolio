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

Every merged pull request in the repos listed in **`comets.config.json`** flies in as a comet and hits Work. Tapping its crater shows the repo, PR number, title and a one-line description. Private repos show all of that but no link.

- **One-liner:** add a line like `comet: Faster PDF export for invoices` anywhere in the PR description. Without it, the first plain sentence of the description is used.
- **Refresh:** `.github/workflows/comets.yml` runs every 20 minutes (and on demand from the Actions tab), writes `public/data/comets.json`, and redeploys if anything is new. Its own commit does not trigger a deploy (GitHub skips workflows for pushes made with the workflow token), so it starts `deploy.yml` itself.
- **Token:** the workflow reads a repository secret named `COMETS_TOKEN`: a fine-grained personal access token with read-only *Pull requests* and *Metadata* access to the listed repos.
- **Visitors** see each PR once: first-time visitors get the latest three, returning visitors get whatever merged since their last visit.

## Running locally

```sh
pnpm install
pnpm dev
```

Then open http://localhost:8787. `pnpm dev` runs the Worker locally with Wrangler. (Opening `index.html` straight from disk won't work, because browsers block ES modules on `file://`.)

## Deploying

A push to `main` deploys. The GitHub Actions workflow in `.github/workflows/deploy.yml` runs `wrangler deploy` with the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

To deploy by hand, put those two values in `.env` (it is gitignored) and run:

```sh
set -a && . ./.env && set +a && pnpm run deploy
```

## Layout

```
wrangler.jsonc           Worker config: name, static assets directory
public/index.html        page shell, HUD markup, crawler-readable summary
public/src/content.js    everything editable
public/src/main.js       the engine: camera, interaction, scenes, render loop
public/src/shaders.js    GLSL for the points, the planet worlds and the pixel blit
public/src/fallback.js   plain-text version for browsers without WebGL2
public/src/styles.css    HUD and text styles
public/src/comets.js     reads the comet feed
public/data/comets.json  comet feed, written by the comets workflow
public/assets/           photos and logos
public/og.png            link-preview image
scripts/fetch-comets.mjs builds the comet feed from comets.config.json
```

## Notes

- Quality adapts: if frames run slow for a few seconds, the page renders at a lower pixel ratio.
- Browsers without WebGL2 get the plain version built from the same content.
- Deep links: `/#slug` opens a project (for example `/#bytebot`).
