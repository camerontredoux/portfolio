const HISTORY = new URL('./sink-history.json', import.meta.url);
const TZ = 'America/Los_Angeles';
const fDate = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fTime = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const MAX = 8;
const FALL_S = 3.6;
const COMET_S = 1.1;
const LEAD_MS = 7 * 86400e3;
const CAUGHT_UP_MS = 1500;
const K_MAX = 1 / 1.4;
const LONG_PRESS_S = 0.45;
const UNITS = [[31557600, 'yr'], [86400, 'd'], [3600, 'h'], [60, 'min'], [1, 's']];

let commits = null;
let S = null;
const cmV = new Float32Array(MAX * 4), caV = new Float32Array(MAX), prV = new Float32Array(MAX * 4), pvV = new Float32Array(MAX * 3);

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function loadCommits() {
  return commits ??= fetch(HISTORY).then((r) => (r.ok ? r.json() : { commits: [] }))
    .then((j) => (Array.isArray(j?.commits) ? j.commits : []).filter((c) => typeof c?.s === 'string' && Number.isFinite(Date.parse(c.at)))
      .map((c) => ({ at: Date.parse(c.at), id: String(c.id), kind: 'commit', text: c.s })))
    .catch(() => []);
}

function livePushes() {
  return new Promise((resolve) => {
    let ws;
    const done = (list) => { clearTimeout(timer); try { ws?.close(); } catch {} resolve(list); };
    const timer = setTimeout(() => done([]), 4000);
    try { ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/comets`); } catch { done([]); return; }
    ws.onerror = () => done([]);
    ws.onmessage = (e) => {
      try {
        const list = JSON.parse(e.data).comets;
        done((Array.isArray(list) ? list : []).filter((c) => typeof c?.title === 'string' && Number.isFinite(Date.parse(c.at)))
          .map((c) => ({ at: Date.parse(c.at), id: String(c.id), kind: 'push', text: `${c.name} · ${c.title}` })));
      } catch { done([]); }
    };
  });
}

function projectAt(d, now) {
  if (/now|new/i.test(d)) return now;
  const years = String(d).match(/\d{4}|\b\d{2}\b/g);
  if (!years) return now;
  const y = +years[years.length - 1];
  return Math.min(now, Date.UTC(y < 100 ? 2000 + y : y, 0, 1, 8));
}

function span(sec) {
  for (const [k, n] of UNITS) if (sec >= k) { const v = sec / k; return `${v < 10 ? +v.toFixed(1) : Math.round(v).toLocaleString('en')} ${n}`; }
  return '1 s';
}

function horizon(W, H, s) {
  const top = H * (0.8 - 0.42 * s), R = Math.max(W, H) * 1.1;
  return { x: W / 2, y: top + R, R, top };
}

function addEvents(list) {
  const sim = Date.now() - S.L;
  const all = [...S.events, ...list], shas = all.filter((e) => e.kind === 'commit').map((e) => e.id);
  S.events = all.filter((e) => e.kind !== 'push' || !shas.some((id) => e.id.startsWith(id))).sort((a, b) => a.at - b.at);
  S.next = S.events.findIndex((e) => e.at > sim);
  if (S.next < 0) S.next = S.events.length;
  if (!S.moved && S.events.length) S.L = Math.max(0, Date.now() - (S.events[0].at - LEAD_MS));
}

function el(parent, css, html = '') {
  const d = document.createElement('div');
  d.style.cssText = css;
  d.innerHTML = html;
  parent.appendChild(d);
  return d;
}

function fire(e, t) {
  if (e.kind === 'project') { S.queue.push(e.p); S.pending = { k: 'archived', x: e.p.t }; return; }
  S.pending = { k: e.kind, x: e.text };
  if (reduced() || S.comets.length >= MAX) return;
  const r = Math.random, x0 = S.W * (0.1 + 0.8 * r());
  S.comets.push({ t0: t, x0, y0: -10, x1: x0 + (r() - 0.5) * S.W * 0.9, y1: S.hTop * (0.45 + 0.4 * r()) });
}

function spawnFall(ctx, t) {
  const p = S.queue.shift(), x = 0.2 + 0.6 * hash(p.i * 7 + S.falls.length);
  const label = el(ctx.el, 'white-space:nowrap;line-height:1.6;color:#fff',
    `<div style="font-size:12.5px;text-transform:none;letter-spacing:.02em;max-width:40vw;overflow:hidden;text-overflow:ellipsis"></div><div style="color:#d9d4ca;font-size:10.5px"></div>`);
  label.children[0].textContent = p.t;
  label.children[1].textContent = p.d ? `${p.d} · tap` : 'tap';
  S.falls.push({ p, t0: t, x, slot: p.slots[0] ?? -1, label, box: null });
  S.lastFall = t;
}

export default {
  hint: 'hold to sink · tap a project to open',
  enter(ctx) {
    const readout = el(ctx.el, 'left:50%;top:56px;transform:translateX(-50%);text-align:center;line-height:1.7;white-space:nowrap;color:#fff',
      `<div style="font-size:12px;font-variant-numeric:tabular-nums"><span></span><span style="margin-left:18px"></span></div>
       <div style="color:#d9d4ca;font-size:10.5px"></div>
       <div style="font-size:12px;text-transform:none;letter-spacing:.02em;max-width:min(440px,86vw);overflow:hidden;text-overflow:ellipsis;margin:2px auto 0"><span style="color:#ff7a4f;text-transform:uppercase;letter-spacing:.06em;font-size:10.5px"></span> <span></span></div>`);
    const [l1, l2, l3] = readout.children;
    S = {
      s: 0, L: 86400e3, moved: false, events: [], next: 0, comets: [], falls: [], queue: [], lastFall: -9,
      rot: 0, acc: 0, pending: null, lineT: -9, down: false, pressAt: 0, seen: false, alive: true, W: ctx.W, hTop: ctx.H * 0.8,
      ui: { readout, date: l1.children[0], time: l1.children[1], rate: l2, kind: l3.children[0], text: l3.children[1] },
    };
    const state = S, now = Date.now();
    addEvents(ctx.projects().map((p) => ({ at: projectAt(p.d, now), kind: 'project', p })));
    Promise.all([loadCommits(), livePushes()]).then(([c, live]) => { if (state.alive && S === state) addEvents([...c, ...live]); });
  },
  leave() {
    if (S) S.alive = false;
  },
  release() {
    if (S) S.seen = false;
  },
  tap(ctx, x, y) {
    if (!S) return;
    const long = S.seen && ctx.t - S.pressAt > LONG_PRESS_S;
    S.seen = false;
    if (long) return;
    const f = S.falls.find((f) => f.box && Math.abs(x - f.box.x) < f.box.hx + 14 && Math.abs(y - f.box.y) < f.box.hy + 14);
    if (f) ctx.open(f.p.i);
  },
  frame(ctx, dt) {
    if (!S) return;
    const { gl, W, H, DPR: D, t } = ctx, rm = reduced(), u = ctx.u;
    const down = ctx.pointer.down && S.alive;
    if (down && !S.down) { S.pressAt = t; S.seen = true; }
    if (!down && S.down) S.seen = false;
    S.down = down;
    S.s += ((down ? 1 : 0) - S.s) * Math.min(1, dt * (down ? 0.55 : 1.1));
    if (S.s > 0.02) S.moved = true;

    const k = K_MAX * S.s * S.s, rate = 1 + k * S.L / 1000;
    S.L *= Math.exp(-k * dt);
    if (S.L < CAUGHT_UP_MS) S.L = 0;
    const now = Date.now(), sim = now - S.L, hz = horizon(W, H, S.s);
    S.W = W; S.hTop = hz.top;
    while (S.next < S.events.length && S.events[S.next].at <= sim) fire(S.events[S.next++], t);

    const ui = S.ui, simD = new Date(sim);
    ui.readout.style.opacity = sstep(0.6, 1, ctx.e);
    ui.date.textContent = fDate.format(simD).replace(',', '');
    ui.time.textContent = fTime.format(simD);
    ui.rate.textContent = S.L === 0 ? 'caught up · now' : `1 s here · ${span(rate)} outside`;
    if (S.pending && t - S.lineT > 0.25) { ui.kind.textContent = S.pending.k; ui.text.textContent = S.pending.x; S.pending = null; S.lineT = t; }

    const w = rm ? 0 : 0.015 + 1.1 * Math.min(1, Math.log10(rate) / 8);
    S.rot += w * dt;
    S.acc += dt * (rm ? 0.2 : 1 + 4 * S.s);

    S.comets = S.comets.filter((c) => t - c.t0 < COMET_S);
    S.comets.forEach((c, j) => {
      const a = (t - c.t0) / COMET_S, e = 1 - (1 - a) * (1 - a), dx = c.x1 - c.x0, dy = c.y1 - c.y0, n = Math.hypot(dx, dy) || 1;
      cmV.set([(c.x0 + dx * e) * D, (c.y0 + dy * e) * D, dx / n, dy / n], j * 4);
      caV[j] = 1 - sstep(0.7, 1, a);
    });

    if (S.queue.length && S.falls.length < MAX && t - S.lastFall > 0.35) spawnFall(ctx, t);
    S.falls = S.falls.filter((f) => { if (t - f.t0 < FALL_S && S.alive) return true; f.label.remove(); return false; });
    const base = ctx.narrow ? 26 : 32;
    S.falls.forEach((f, j) => {
      const p = (t - f.t0) / FALL_S, x = f.x * W, q = sstep(0.55, 1, p);
      const yEnd = hz.y - Math.sqrt(Math.max(0, hz.R * hz.R - (x - hz.x) ** 2)) + base * 3;
      const y = -base + (yEnd + base) * p ** 1.8, hx = base * (1 - 0.55 * q), hy = base * (1 + 1.6 * q);
      f.box = { x, y, hx, hy };
      prV.set([x * D, y * D, hx * D, hy * D], j * 4);
      pvV.set([f.slot, sstep(0, 0.08, p), q], j * 3);
      const left = x < W / 2;
      f.label.style.opacity = sstep(0, 0.08, p) * (1 - sstep(0.4, 0.75, p));
      f.label.style.transform = `translate(${Math.round(left ? x + hx + 12 : x - hx - 12)}px,${Math.round(y)}px) translate(${left ? 0 : -100}%,-50%)`;
      f.label.style.textAlign = left ? 'left' : 'right';
    });

    gl.uniform1f(u('sink_s'), S.s);
    gl.uniform3f(u('sink_hz'), hz.x * D, hz.y * D, hz.R * D);
    gl.uniform2f(u('sink_pole'), W / 2 * D, hz.top * 0.42 * D);
    gl.uniform1f(u('sink_rot'), S.rot);
    gl.uniform1f(u('sink_trail'), rm ? 0 : Math.min(0.9, w * 0.35));
    gl.uniform1f(u('sink_acc'), S.acc);
    gl.uniform1f(u('sink_nc'), S.comets.length);
    gl.uniform4fv(u('sink_cm'), cmV);
    gl.uniform1fv(u('sink_ca'), caV);
    gl.uniform1f(u('sink_np'), S.falls.length);
    gl.uniform4fv(u('sink_pr'), prV);
    gl.uniform3fv(u('sink_pv'), pvV);
  },
};
