# Pull, the black hole's world

Tap the black hole in orbit view to zoom into it. Tap the hole again to fall into Pull. Escape or the back button runs Pull's `back` hook first. If the hook does not handle it, Pull closes and you return to the zoomed black hole.

While Pull opens, the camera pushes into the hole until its radius is `pullR()` in `../main.js`. Pull draws its hole at `ctx.hole`, so the hole you tapped is the hole you arrive at.

Pull owns two files:

- `pull.js`: the hooks.
- `pull.glsl.js`: the shader, drawn when `w_mode` is 6. The planet worlds use `w_mode` 1 (surface), 3 (strata) and 5 (crater).

## Hooks (`pull.js`)

The default export is an object with these keys:

- `hint`: the text at the bottom of the world. It fades after the user drags or scrolls.
- `enter(ctx)`: the world opens. `ctx.el` is the `#world` overlay, which already holds the hint. Append your own DOM there; text in a direct child `div` gets dark dots behind it.
- `leave(ctx)`: the world starts to close. It is called once.
- `frame(ctx, dt)`: every frame while the world is on screen, with the world program bound. Set your uniforms here.
- `drag(ctx, dx, dy, dt)`, `release(ctx)`: a pointer drag in CSS px, and its end.
- `tap(ctx, x, y)`, `key(ctx, e)`: Escape never reaches `key`.
- `back(ctx)`: Escape or the back button was pressed. Return `true` if the world handled it, for example to put something away. The world then stays open. Otherwise the world closes.

`ctx` has:

- `projects()`: the archived projects as `{i, t, d, slug, role, tools, desc, links, slots}`. The list can be empty. `links` are `{label, url}`, and `url` can be empty. `slots` are atlas slots for the project's images.
- `t` (seconds), `W`, `H`, `DPR`, `narrow`, `pointer` (`{x, y, down}` in CSS px), `hole` (`{x, y, R}` on screen), `e` (0 to 1 while the world opens), `leaving`.
- `gl`, `u(name)`: the WebGL2 context and a cached uniform location in the world program.

## Shader (`pull.glsl.js`)

The default export is GLSL that defines `vec4 pull(vec2 cell)`. It is placed in `WFS` in `../shaders.js`, after the shared helpers (`hh`, `n2`, `fbm`, `b8`, `BONE`).

- Start every uniform and helper name with `pull_`.
- `cell` is a pixel of the low-res buffer. The screen position in device px, y down, is `vec2((cell.x+.5)*w_cell, w_scr.y-(cell.y+.5)*w_cell)`.
- Shared uniforms: `w_res`, `w_scr`, `w_cell`, `w_t`, `w_dpr`, `w_e`, `w_fade`, `w_atl`. `w_ctr.xy` is the hole's centre and `w_ctr.z` its radius, in device px. `w_rev` is a reveal radius around the hole that grows to cover the screen.
- The colours come from the black hole's own ramp in `VS` (`kind==13`): ember `(.95,.34,.08)`, amber `(1,.66,.24)`, white-hot `(1,.97,.86)`. `pull_hue(c)` maps 0 to 1 along that ramp.
- Return `vec4(colour, a)`: `a = 1.` draws a lit dot, `a = .5` draws background, `a = 0.` shows the scene behind.
