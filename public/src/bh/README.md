# Black hole worlds

The Void label in orbit view has four buttons. Each button opens one world: Pull, Tune, Sink, Plunge. Escape or the back button leaves the world and returns to orbit.

## Files a world owns

A world agent edits only its own two files:

| World | Hooks | Shader | `w_mode` |
| --- | --- | --- | --- |
| pull | `pull.js` | `pull.glsl.js` | 6 |
| tune | `tune.js` | `tune.glsl.js` | 7 |
| sink | `sink.js` | `sink.glsl.js` | 8 |
| plunge | `plunge.js` | `plunge.glsl.js` | 9 |

The planet worlds use `w_mode` 1 (surface), 3 (strata) and 5 (crater).

## Hooks (`<name>.js`)

The default export is an object. Every key is optional.

- `hint`: the text at the bottom of the world. It fades after the user drags or scrolls.
- `enter(ctx)`: the world opens. `ctx.el` is the `#world` overlay, which already holds the hint. Append your own DOM there; text in a direct child `div` gets dark dots behind it.
- `leave(ctx)`: the world starts to close. It is called once.
- `frame(ctx, dt)`: every frame while the world is on screen, with the world program bound. Set your uniforms here.
- `drag(ctx, dx, dy, dt)`, `release(ctx)`: a pointer drag in CSS px, and its end.
- `tap(ctx, x, y)`, `wheel(ctx, e)`, `key(ctx, e)`: Escape never reaches `key`.

`ctx` has:

- `projects()`: the archived projects as `{i, t, d, slug, slots}`. The list can be empty. `slots` are atlas slots for the project's images.
- `open(i)`: leave the world and open project `i` in the black hole.
- `t` (seconds), `W`, `H`, `DPR`, `narrow`, `pointer` (`{x, y, down}` in CSS px), `hole` (`{x, y, R}` on screen), `e` (0 to 1 while the world opens), `leaving`.
- `gl`, `u(name)`: the WebGL2 context and a cached uniform location in the world program.
- `atlas`: the 1024×2048 canvas behind the shader's `w_atl` texture (4 columns, 8 rows of 256 px slots).

## Shader (`<name>.glsl.js`)

The default export is GLSL that defines `vec4 <name>(vec2 cell)`. It is placed in `WFS` in `../shaders.js`, after the shared helpers (`hh`, `n2`, `fbm`, `b8`, `BONE`).

- Start every uniform and helper name with `<name>_`. All four worlds compile into one shader.
- `cell` is a pixel of the low-res buffer. The screen position in device px, y down, is `vec2((cell.x+.5)*w_cell, w_scr.y-(cell.y+.5)*w_cell)`.
- Shared uniforms: `w_res`, `w_scr`, `w_cell`, `w_t`, `w_dpr`, `w_e`, `w_fade`, `w_atl`. `w_ctr.xy` is the hole's centre and `w_ctr.z` its radius, in device px. `w_rev` is a reveal radius around the hole that grows to cover the screen.
- Return `vec4(colour, a)`: `a = 1.` draws a lit dot, `a = .5` draws background, `a = 0.` shows the scene behind.
