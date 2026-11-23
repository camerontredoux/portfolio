# camerontredoux.github.io

My portfolio, drawn as a dithered solar system in WebGL2. Planets are sections, moons are projects, comets are updates, the black hole is the archive.

No build step: it's plain HTML, CSS and ES modules, served as-is by GitHub Pages.

## Editing content

Almost everything you'd change is in **`src/content.js`**:

| What | Where |
| --- | --- |
| Projects, essays, jobs (the moons) | `ISL` |
| The Resume dig (eras, logos, links) | `STRATA` |
| Starlee's monoliths (photos, titles, lines) | `MEM` |
| Planet field notes | `FACTS` |
| Comet updates | `UPD` |

Images live in `assets/`. A project's `imgs` takes up to two image paths; a monolith takes `img` (the stone) and `full` (the photo that opens when you tap it).

## Running locally

Any static server works, for example:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. (Opening `index.html` straight from disk won't work, because browsers block ES modules on `file://`.)

## Layout

```
index.html        page shell, HUD markup, crawler-readable summary
src/content.js    everything editable
src/main.js       the engine: camera, interaction, scenes, render loop
src/shaders.js    GLSL for the points, the planet worlds and the pixel blit
src/fallback.js   plain-text version for browsers without WebGL2
src/styles.css    HUD and text styles
assets/           photos and logos
og.png            link-preview image
```

## Notes

- Quality adapts: if frames run slow for a few seconds, the page renders at a lower pixel ratio.
- Browsers without WebGL2 get the plain version built from the same content.
- Deep links: `/#slug` opens a project (for example `/#bytebot`).
