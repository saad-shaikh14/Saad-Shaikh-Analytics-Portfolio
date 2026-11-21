// Publication safety scan over the built site and the repository's public source.
// Fails if a private name, internal identifier, placeholder or draft marker reaches public files or file names.
//
// The list of private names is deliberately NOT in this repository. It is read from:
//   - the CONTENT_DENYLIST environment variable (one regular expression per line), set from a
//     repository secret in CI, or
//   - a local, gitignored file `.content-denylist` (same format).
// Failures report the rule number only, never the pattern, so logs stay safe to publish. A file whose path matches a
// private-name rule is reported without its path.
// With REQUIRE_DENYLIST=true (set in CI wherever the secret is readable) a missing list fails the scan.
// Every file is checked: its path against the private list, and, unless it is binary, its contents too.
// Usage: node scripts/check-content.mjs [paths...]   (default: the whole repository, dependencies excluded)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['.'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.astro', 'test-results', 'playwright-report', 'dist-qa']);
const SKIP_FILES = new Set(['package-lock.json', '.content-denylist']);
// This file's own generic patterns would match themselves, so its contents are checked against the private list only.
const SELF = 'scripts/check-content.mjs';

const raw = process.env.CONTENT_DENYLIST || (existsSync('.content-denylist') ? readFileSync('.content-denylist', 'utf8') : '');
const PRIVATE = [];
const invalid = [];
raw
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .forEach((l, i) => {
    try {
      PRIVATE.push({ n: i + 1, re: new RegExp(l, 'i') });
    } catch {
      invalid.push(i + 1); // never print the pattern or the parser's message, which quotes it
    }
  });
if (invalid.length) {
  console.error(`Content safety scan FAILED: private-name rule(s) #${invalid.join(', #')} are not valid regular expressions.`);
  process.exit(1);
}
if (PRIVATE.length === 0 && process.env.REQUIRE_DENYLIST === 'true') {
  console.error('Content safety scan FAILED: REQUIRE_DENYLIST is set but no private-name list was provided (CONTENT_DENYLIST).');
  process.exit(1);
}

const FORBIDDEN = [
  { re: /\[(PROVISIONAL|APPROVAL|NUMBER\?|TODO|TBD)[^\]]*\]/i, why: 'placeholder marker' },
  { re: /lorem ipsum/i, why: 'filler text' },
  { re: /coming soon/i, why: 'announcement of unpublished content' }, // the label avoids the phrase, so saved logs pass
  { re: /\b\d{12}\b/, why: '12-digit identifier (looks like a cloud account id)' },
  { re: /arn:aws:/i, why: 'AWS ARN' },
  { re: /s3:\/\/[a-z0-9.-]+/i, why: 'bucket URL' },
  { re: /@[a-z0-9-]+\.(inc|internal)\b/i, why: 'internal email domain' },
  { re: /Draft: not published/, why: 'draft page in production output', buildOnly: true },
];

function walk(p) {
  const s = statSync(p);
  if (s.isFile()) return [p];
  return readdirSync(p)
    .filter((n) => !SKIP_DIRS.has(n) && !SKIP_FILES.has(n))
    .flatMap((n) => walk(join(p, n)));
}

// A file is treated as binary if its first 8 KB contain a NUL byte (images, fonts).
const isBinary = (buf) => buf.subarray(0, 8192).includes(0);

const problems = [];
let scanned = 0;
let binary = 0;
for (const t of targets) {
  for (const f of walk(t)) {
    scanned++;
    const rel = relative('.', f);
    const pathRules = PRIVATE.filter(({ re }) => re.test(rel)).map(({ n }) => n);
    const shown = pathRules.length ? '[path withheld]' : rel;
    for (const n of pathRules) problems.push(`a file path matches private-name rule #${n}`);

    const buf = readFileSync(f);
    if (isBinary(buf)) {
      binary++;
      continue;
    }
    const text = buf.toString('utf8');
    for (const { n, re } of PRIVATE) if (re.test(text)) problems.push(`${shown}: private-name rule #${n}`);
    if (rel === SELF) continue;
    const isBuild = /^dist(-qa)?\//.test(rel);
    for (const { re, why, buildOnly } of FORBIDDEN) {
      if (buildOnly && !isBuild) continue;
      if (re.test(text)) problems.push(`${shown}: ${why}`);
    }
  }
}

if (PRIVATE.length === 0) {
  console.warn('Note: no private-name list available (CONTENT_DENYLIST or .content-denylist); only generic checks ran.');
}
if (problems.length) {
  console.error(`Content safety scan FAILED: ${problems.length} problem(s) in ${scanned} files`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  `Content safety scan passed: ${scanned} files (${binary} binary, checked by path only), ${PRIVATE.length} private-name rules, no placeholders or draft markers.`,
);
