const SEEN_KEY = 'comets:seen';
const CRATERS_KEY = 'comets:craters';
const FIRST_VISIT = 5;
const PING_MS = 30 * 1000;
const RECONNECT_MS = 5 * 1000;

const queue = [];
let seen = null;

function readSeen() {
  try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
}
function writeSeen(iso) {
  try { localStorage.setItem(SEEN_KEY, iso); } catch {}
}

function take(comets) {
  comets.sort((a, b) => a.at.localeCompare(b.at));
  const fresh = seen ? comets.filter((c) => c.at > seen) : comets.slice(-FIRST_VISIT);
  for (const c of fresh) if (!queue.some((q) => q.id === c.id)) queue.push(c);
}

function connect() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/comets`);
  let ping;
  ws.onopen = () => { ping = setInterval(() => ws.send('ping'), PING_MS); };
  ws.onmessage = (e) => { if (e.data !== 'pong') take(JSON.parse(e.data).comets); };
  ws.onclose = () => { clearInterval(ping); setTimeout(connect, RECONNECT_MS); };
}

export function startCometFeed() {
  seen = readSeen();
  connect();
}

export function nextComet() {
  const c = queue.shift();
  if (!c) return null;
  if (!seen || c.at > seen) { seen = c.at; writeSeen(seen); }
  return c;
}

export function loadCraters() {
  try {
    const list = JSON.parse(localStorage.getItem(CRATERS_KEY));
    return Array.isArray(list) ? list.filter((c) => Number.isInteger(c?.p) && Array.isArray(c.d) && c.d.length === 3 && c.u?.at).map((c) => ({ ...c, ack: c.ack === true })) : [];
  } catch { return []; }
}
export function saveCraters(list) {
  try { localStorage.setItem(CRATERS_KEY, JSON.stringify(list)); } catch {}
}

export function ago(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 172800) return 'yesterday';
  if (s < 7 * 86400) return `${Math.round(s / 86400)} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toLowerCase();
}
