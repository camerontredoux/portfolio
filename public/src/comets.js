// Real comets: every merged pull request in the repos listed in comets.config.json.
// A GitHub Action (.github/workflows/comets.yml) refreshes public/data/comets.json; this module reads it
// and hands the engine one PR at a time, oldest first, each one exactly once per visitor.

const FEED = 'data/comets.json';
const SEEN_KEY = 'comets:seen';      // ISO time of the newest PR this browser has already watched land
const FIRST_VISIT = 3;               // a first-time visitor sees the latest few
const POLL_MS = 5 * 60 * 1000;

const queue = [];
let seen = null;

function readSeen() {
  try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
}
function writeSeen(iso) {
  try { localStorage.setItem(SEEN_KEY, iso); } catch { /* private mode: comets just replay next visit */ }
}

async function refresh() {
  let prs;
  try {
    const res = await fetch(`${FEED}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    prs = (await res.json()).prs || [];
  } catch { return; }
  prs.sort((a, b) => a.merged_at.localeCompare(b.merged_at));          // oldest first
  const fresh = seen ? prs.filter((p) => p.merged_at > seen) : prs.slice(-FIRST_VISIT);
  for (const p of fresh) if (!queue.some((q) => q.repo === p.repo && q.number === p.number)) queue.push(p);
}

export function startCometFeed() {
  seen = readSeen();
  refresh();
  setInterval(refresh, POLL_MS);
}

// the next PR to fly in, or null. Marks it as seen so it won't come again.
export function nextComet() {
  const p = queue.shift();
  if (!p) return null;
  if (!seen || p.merged_at > seen) { seen = p.merged_at; writeSeen(seen); }
  return p;
}

// "3 min ago", "yesterday", "12 Nov"
export function ago(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 172800) return 'yesterday';
  if (s < 7 * 86400) return `${Math.round(s / 86400)} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toLowerCase();
}
