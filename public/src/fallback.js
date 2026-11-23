// The plain version of the site, for browsers without WebGL2.
// Built from the same content as the 3D version, so the two never drift apart.
import { ISL, STRATA, MEM, APPN } from './content.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function projects(p) {
  return ISL.filter((s) => s.p === p).map((s) => {
    const links = s.links.filter((l) => l.url).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join(' ');
    return `<li><b>${esc(s.t)}</b> <span>${esc(s.d)}</span>${s.role ? `<div>${esc(s.role)}</div>` : ''}<p>${esc(s.desc)}</p>${links}</li>`;
  }).join('');
}

export function renderFallback() {
  document.body.classList.add('fallback');
  const root = document.getElementById('fallback');
  const resume = STRATA.filter((l) => l.lg != null).map((l) =>
    `<li><b>${esc(l.t)}</b> <span>${esc(l.y)}</span><p>${l.x}</p>${l.u ? `<a href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.u.replace(/^https?:\/\/(www\.)?/, ''))} ↗</a>` : ''}</li>`).join('');
  const starlee = MEM.filter((m) => m.full || m.img).map((m) =>
    `<figure><img src="${esc(m.full || m.img)}" alt="${esc(m.t)}" loading="lazy"><figcaption><b>${esc(m.t)}</b> ${esc(m.s)}</figcaption></figure>`).join('');
  root.innerHTML = `
    <header><h1>Cameron Tredoux</h1><p>This browser can't draw the solar system, so here's everything in plain text.</p></header>
    <section><h2>${APPN[0]}</h2><ul>${projects(0)}</ul></section>
    <section><h2>${APPN[1]}</h2><ul>${projects(1)}</ul></section>
    <section><h2>${APPN[2]}</h2><ul>${resume}</ul></section>
    <section><h2>${APPN[3]}</h2><div class="mem">${starlee}</div></section>`;
  root.hidden = false;
}
