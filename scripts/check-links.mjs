// Offline internal link checker for the built site.
// Every href/src that points inside the site must resolve to a file in the build output,
// with the GitHub Pages base path taken into account. Usage: node scripts/check-links.mjs dist
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const BASE = '/Saad-Shaikh-Analytics-Portfolio';
const SITE = 'https://saad-shaikh14.github.io';
const root = process.argv[2] ?? 'dist';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function resolveTarget(pathname) {
  if (!pathname.startsWith(`${BASE}/`) && pathname !== BASE) return { ok: false, why: 'outside base path' };
  let rel = decodeURIComponent(pathname.slice(BASE.length)) || '/';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = join(root, rel);
  if (existsSync(file) && statSync(file).isFile()) return { ok: true, file };
  if (existsSync(`${file}.html`)) return { ok: true, file: `${file}.html` };
  return { ok: false, why: 'no such file' };
}

const files = walk(root).filter((f) => /\.(html|xml|css)$/.test(f));
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const idsByFile = new Map(
  htmlFiles.map((f) => [f, new Set([...readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]),
);

const problems = [];
let checked = 0;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const refs = [
    ...text.matchAll(/\s(?:href|src)="([^"]+)"/g),
    ...text.matchAll(/url\(([^)]+)\)/g),
    ...text.matchAll(/<loc>([^<]+)<\/loc>/g),
    ...text.matchAll(/<link>([^<]+)<\/link>/g),
  ].map((m) => m[1].replace(/^['"]|['"]$/g, ''));
  for (const ref of refs) {
    if (/^(mailto:|data:|javascript:)/.test(ref)) continue;
    let target;
    try {
      target = new URL(ref, `${SITE}${BASE}/${relative(root, f)}`);
    } catch {
      problems.push(`${relative(root, f)}: unparseable ${ref}`);
      continue;
    }
    if (target.origin !== SITE) continue; // external links are checked separately
    checked++;
    const res = resolveTarget(target.pathname);
    if (!res.ok) {
      problems.push(`${relative(root, f)}: ${ref} (${res.why})`);
      continue;
    }
    if (target.hash && res.file.endsWith('.html')) {
      const id = decodeURIComponent(target.hash.slice(1));
      if (id && !idsByFile.get(res.file)?.has(id)) problems.push(`${relative(root, f)}: ${ref} (missing #${id})`);
    }
  }
}

if (problems.length) {
  console.error(`Internal link check FAILED: ${problems.length} problem(s) in ${checked} internal references`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Internal link check passed: ${checked} internal references across ${files.length} files resolve.`);
