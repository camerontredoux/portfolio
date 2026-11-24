# Pull, the black hole's world

Tap the black hole in orbit view to zoom into it. Tap the hole again to fall into Pull. Escape or the back button runs Pull's `back` hook first. If the hook does not handle it, Pull closes and you return to the zoomed black hole.

While Pull opens, the camera pushes into the hole until its radius is `pullR()` in `../main.js`. Pull draws its hole at `ctx.hole`, so the hole you tapped is the hole you arrive at.

Pull owns three files:

- `pull.js`: the hooks and the game.
- `pull.glsl.js`: the shader, drawn when `w_mode` is 6. The planet worlds use `w_mode` 1 (surface), 3 (strata) and 5 (crater).
- `story.js`: every word the game shows. Change the story here and nowhere else.

## Page time, the game

Pull is a small game about Hawking radiation. Archived projects are not in Pull; open them from their moons in the `bz` view.

1. The next fragment waits on the rim, just outside the photon ring, as a smear: its first glyphs stretched along the horizon, glitchy and red-shifted. It arrives as a pair of quanta: one falls in, the other lands on the rim and spreads into the smear. It stays until you take it.
2. Drag the smear outward to catch it. It sharpens and whitens as it comes off the rim, then unfolds into a fragment card: a small terminal with fragment k of the message and an input. Enter or the up arrow pulls it with the keyboard.
3. Each catch makes the hole smaller (down to 45% of its radius) and hotter, and the next smear arrives sooner. Between catches, other pairs flicker at the horizon; their escaping partners fly off and can't be caught.
4. Until half the fragments are caught, the card text and every terminal reply are scrambled. The catch that reaches half is the Page time: the hole flares and all caught fragments decode at once. After that, text arrives decoded.
5. When all fragments are caught, the card shows the final lines from `story.js` and no more pairs appear.

The collected strip at the bottom has one tile per caught fragment. Tap a tile to open that card again. Escape closes an open card first.

Progress is saved in `localStorage` under `pull.page` as `{"n": <fragments caught>}`. The terminal command `reset` sets it back to 0. `reset` is not listed by `help`.

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

- `t` (seconds), `W`, `H`, `DPR`, `narrow`, `pointer` (`{x, y, down}` in CSS px), `hole` (`{x, y, R}` on screen), `e` (0 to 1 while the world opens), `leaving`.
- `spin`: the disc spin of the black hole as `[angle, speed, direction]`. Pass it to `bhDisc` so the disc turns as it does in the `bz` view.
- `gl`, `u(name)`: the WebGL2 context and a cached uniform location in the world program.

## Shader (`pull.glsl.js`)

The default export is GLSL that defines `vec4 pull(vec2 cell)`. It is placed in `WFS` in `../shaders.js`, after the shared helpers (`hh`, `n2`, `fbm`, `b8`, `BONE`) and `BH_DISC`.

- Start every uniform and helper name with `pull_`.
- `cell` is a pixel of the low-res buffer. The screen position in device px, y down, is `vec2((cell.x+.5)*w_cell, w_scr.y-(cell.y+.5)*w_cell)`.
- Shared uniforms: `w_res`, `w_scr`, `w_cell`, `w_t`, `w_dpr`, `w_e`, `w_fade`, `w_atl`. `w_ctr.xy` is the hole's centre and `w_ctr.z` its radius, in device px. `w_rev` is a reveal radius around the hole that grows to cover the screen.
- `bhDisc(q, spin, t, w, big)` from `BH_DISC` in `../shaders.js` draws the black hole: the tilted accretion disc, the photon ring and the glow. The orbit and `bz` views use the same function, so the disc keeps its tilt from `bz` into Pull. `q` is the offset from the hole centre in hole radii, y down. The result is an intensity. Inside the shadow it is `0` except where the near side of the disc crosses in front.
- The colours come from the black hole's own ramp in `VS` (`kind==13`): ember `(.95,.34,.08)`, amber `(1,.66,.24)`, white-hot `(1,.97,.86)`. `pull_hue(c)` maps 0 to 1 along that ramp.
- Around the disc Pull draws a lensed sky: stars, a diagonal dust band, and a soft Einstein ring at 1.55 hole radii (`pull_sky`).
- The smear samples `pull_tx`, a small canvas texture on texture unit 4 that `pull.js` redraws with the waiting fragment's glyphs. Before the Page time they are scrambled with the same seed as the fragment's card.
- Return `vec4(colour, a)`: `a = 1.` draws a lit dot, `a = .5` draws background, `a = 0.` shows the scene behind.
