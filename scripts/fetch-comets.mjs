// Builds data/comets.json from the merged pull requests in the repos listed in comets.config.json.
// Runs in GitHub Actions with GH_TOKEN set to a token that can read those repos' pull requests.
//
// What a comet shows: repo name, PR number, PR title, and a one-line description.
// The one-liner is a line in the PR body starting with "comet:" if there is one,
// otherwise the first plain sentence of the body. Private repos never get a link.

import { readFile, writeFile } from 'node:fs/promises';

const token = process.env.GH_TOKEN;
if (!token) { console.error('GH_TOKEN is not set'); process.exit(1); }
const cfg = JSON.parse(await readFile(new URL('../comets.config.json', import.meta.url)));

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

function oneLiner(body) {
  if (!body) return '';
  const text = body.replace(/<!--[\s\S]*?-->/g, '').replace(/\r/g, '');
  const tagged = text.match(/^\s*comet:\s*(.+)$/im);
  if (tagged) return tagged[1].trim().slice(0, 160);
  for (let line of text.split('\n')) {
    line = line.trim();
    if (!line || /^(#|[-*+] |\d+\. |\||>|```|!\[)/.test(line)) continue;      // skip headings, lists, tables, quotes, code, images
    line = line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim();
    if (line.length < 8) continue;
    const sentence = line.match(/^.+?[.!?](\s|$)/);
    return (sentence ? sentence[0] : line).trim().slice(0, 160);
  }
  return '';
}

const since = Date.now() - cfg.maxAgeDays * 86400e3;
const prs = [];
for (const full of cfg.repos) {
  try {
    const repo = await gh(`/repos/${full}`);
    const list = await gh(`/repos/${full}/pulls?state=closed&sort=updated&direction=desc&per_page=50`);
    for (const p of list) {
      if (!p.merged_at || Date.parse(p.merged_at) < since) continue;
      prs.push({
        repo: full,
        name: repo.name,
        number: p.number,
        title: p.title,
        line: oneLiner(p.body),
        merged_at: p.merged_at,
        url: repo.private ? null : p.html_url,
      });
    }
  } catch (e) {
    console.error(`skipping ${full}: ${e.message}`);
  }
}
prs.sort((a, b) => b.merged_at.localeCompare(a.merged_at));
const out = { prs: prs.slice(0, cfg.maxComets) };
await writeFile(new URL('../data/comets.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${out.prs.length} comets`);
