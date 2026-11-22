// Deterministic source for the figures in "Log-based change data capture into an analytical warehouse".
// Run `node src/visuals/log-based-cdc/draw.mjs` to regenerate figure-1.svg and figure-2.svg.
// Every label traces to spec.md and sources.md in this folder. Edit the spec first, then this file.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const C = {
  ink: '#1c1b19',
  graphite: '#4f4a44',
  navy: '#1e3a5f',
  navySoft: '#e7ecf2',
  teal: '#2f6b66',
  tealSoft: '#e3efec',
  copper: '#9a4a1f',
  copperText: '#7a3915',
  copperSoft: '#f4e6da',
  surface: '#fffdf8',
  rule: '#b9ab94',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- primitives ----------
function text(x, y, s, { cls = 's', size = 13, anchor = 'start', fill, weight, italic } = {}) {
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `class="${cls}"`,
    `font-size="${size}"`,
    anchor !== 'start' ? `text-anchor="${anchor}"` : '',
    fill ? `fill="${fill}"` : '',
    weight ? `font-weight="${weight}"` : '',
    italic ? 'font-style="italic"' : '',
  ].filter(Boolean);
  return `<text ${attrs.join(' ')}>${esc(s)}</text>`;
}

// Kicker (type word), name lines, sublabel lines, left-aligned inside a component.
function labels(x, y, { kicker, name = [], sub = [] }) {
  const out = [];
  let cy = y + 20;
  if (kicker) {
    out.push(text(x + 12, cy, kicker, { cls: 'k', size: 12 }));
    cy += 20;
  }
  for (const n of name) {
    out.push(text(x + 12, cy, n, { cls: 'n', size: 15 }));
    cy += 19;
  }
  if (sub.length) cy += 1;
  for (const s of sub) {
    out.push(text(x + 12, cy, s, { cls: 's', size: 13 }));
    cy += 17;
  }
  return out.join('\n');
}

const shape = {
  // Process or job: rounded rectangle, navy tint.
  compute: (x, y, w, h) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.navySoft}" stroke="${C.navy}" stroke-width="1.5"/>`,
  // External source: rectangle with a double left edge ("outside our ownership").
  source: (x, y, w, h) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${C.surface}" stroke="${C.navy}" stroke-width="1.5"/>` +
    `<line x1="${x + 5}" y1="${y}" x2="${x + 5}" y2="${y + h}" stroke="${C.navy}" stroke-width="1.5"/>`,
  // Log or stream: segmented bar, open right end (append direction).
  log: (x, y, w, h) => {
    const segs = [];
    for (let sx = x + 18; sx < x + w - 30; sx += 18) {
      segs.push(`<line x1="${sx}" y1="${y + h - 14}" x2="${sx}" y2="${y + h}" stroke="${C.navy}" stroke-width="1"/>`);
    }
    return (
      `<path d="M${x + w} ${y} H${x} V${y + h} H${x + w}" fill="${C.navySoft}" stroke="${C.navy}" stroke-width="1.5"/>` +
      `<line x1="${x}" y1="${y + h - 14}" x2="${x + w}" y2="${y + h - 14}" stroke="${C.navy}" stroke-width="1"/>` +
      segs.join('')
    );
  },
  // Files in object storage: stacked sheets.
  files: (x, y, w, h) =>
    `<rect x="${x + 6}" y="${y - 6}" width="${w}" height="${h}" rx="2" fill="${C.surface}" stroke="${C.navy}" stroke-width="1"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${C.surface}" stroke="${C.navy}" stroke-width="1.5"/>`,
  // Table: cylinder, teal.
  table: (x, y, w, h) => {
    const ry = 9;
    return (
      `<path d="M${x} ${y + ry} V${y + h - ry} A${w / 2} ${ry} 0 0 0 ${x + w} ${y + h - ry} V${y + ry}" fill="${C.tealSoft}" stroke="${C.teal}" stroke-width="1.5"/>` +
      `<ellipse cx="${x + w / 2}" cy="${y + ry}" rx="${w / 2}" ry="${ry}" fill="${C.tealSoft}" stroke="${C.teal}" stroke-width="1.5"/>`
    );
  },
  // Control plane: chamfered rectangle, no fill.
  control: (x, y, w, h) => {
    const c = 10;
    return `<path d="M${x + c} ${y} H${x + w - c} L${x + w} ${y + c} V${y + h - c} L${x + w - c} ${y + h} H${x + c} L${x} ${y + h - c} V${y + c} Z" fill="${C.surface}" stroke="${C.graphite}" stroke-width="1.5"/>`;
  },
  // Monitoring or observability: plain rectangle with a teal top rule.
  monitor: (x, y, w, h) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${C.surface}" stroke="${C.teal}" stroke-width="1.5"/>` +
    `<line x1="${x}" y1="${y + 1.5}" x2="${x + w}" y2="${y + 1.5}" stroke="${C.teal}" stroke-width="3"/>`,
  // Consumer: rectangle with a top rule.
  consumer: (x, y, w, h) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${C.surface}" stroke="${C.graphite}" stroke-width="1.5"/>` +
    `<line x1="${x}" y1="${y + 1.5}" x2="${x + w}" y2="${y + 1.5}" stroke="${C.graphite}" stroke-width="3"/>`,
};

// System or ownership boundary: solid, with a tab label.
function boundary(x, y, w, h, label) {
  const tw = label.length * 7.6 + 20;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="${C.graphite}" stroke-width="1"/>` +
    `<rect x="${x + 12}" y="${y - 11}" width="${tw}" height="22" rx="3" fill="${C.surface}" stroke="${C.graphite}" stroke-width="1"/>` +
    text(x + 22, y + 4, label, { cls: 'k', size: 12 })
  );
}

const MARKERS = `
<defs>
  <marker id="__M__-head-data" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${C.navy}"/></marker>
  <marker id="__M__-head-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${C.copper}"/></marker>
  <marker id="__M__-head-ctl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="${C.graphite}" stroke-width="1.5"/></marker>
  <marker id="__M__-dot-meta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6"><circle cx="5" cy="5" r="4" fill="${C.teal}"/></marker>
</defs>`;

function path(points, kind) {
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  switch (kind) {
    case 'data':
      return `<path d="${d}" fill="none" stroke="${C.navy}" stroke-width="2" marker-end="url(#__M__-head-data)"/>`;
    case 'hi':
      return `<path d="${d}" fill="none" stroke="${C.copper}" stroke-width="2.5" marker-end="url(#__M__-head-hi)"/>`;
    case 'ctl':
      return `<path d="${d}" fill="none" stroke="${C.graphite}" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#__M__-head-ctl)"/>`;
    case 'meta':
      return `<path d="${d}" fill="none" stroke="${C.teal}" stroke-width="1.5" stroke-dasharray="1.5 3" stroke-linecap="round" marker-start="url(#__M__-dot-meta)" marker-end="url(#__M__-dot-meta)"/>`;
    default:
      throw new Error(kind);
  }
}

// Numbered step: copper rounded square with an ivory numeral (mirrors the numbered list in the text).
function step(x, y, n) {
  return (
    `<rect x="${x}" y="${y}" width="20" height="20" rx="3" fill="${C.copper}"/>` +
    text(x + 10, y + 14.5, String(n), { cls: 'tnum', size: 12, anchor: 'middle', fill: C.surface, weight: 700 })
  );
}

function svg(id, w, h, title, desc, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="${id}-title ${id}-desc" font-family="'Atkinson Hyperlegible Next Variable', system-ui, sans-serif" fill="${C.ink}">
<title id="${id}-title">${esc(title)}</title>
<desc id="${id}-desc">${esc(desc)}</desc>
${MARKERS}
${body}
</svg>
`.replaceAll('__M__', id); // marker ids are prefixed per figure, so two figures on one page never share an id
}

// ---------- Figure 1: reference blueprint ----------
function figure1() {
  const b = [];

  // Reconciliation (metadata) runs across the top: source totals vs current-state totals.
  b.push(path([[124, 98], [124, 30], [1049, 30], [1049, 104]], 'meta'));
  b.push(text(300, 22, 'reconciliation reads row counts and totals from the source and the target', { cls: 'e', size: 12 }));

  // Source system
  b.push(boundary(16, 64, 228, 344, 'SOURCE SYSTEM'));
  b.push(shape.source(32, 98, 196, 92));
  b.push(labels(32, 98, { kicker: 'SOURCE', name: ['Operational database'], sub: ['(e.g. PostgreSQL, MySQL)'] }));
  b.push(path([[124, 190], [124, 218]], 'data'));
  b.push(text(134, 209, 'writes', { cls: 'e', size: 12 }));
  b.push(shape.log(32, 220, 196, 94));
  b.push(labels(32, 220, { kicker: 'LOG', name: ['Transaction log'], sub: ['WAL, or row-based binlog'] }));
  b.push(shape.compute(32, 324, 196, 76));
  b.push(text(44, 344, 'SLOT · POSTGRESQL', { cls: 'k', size: 12 }));
  b.push(text(44, 363, 'Replication slot: keeps', { cls: 's', size: 13 }));
  b.push(text(44, 380, 'WAL capture may still need', { cls: 's', size: 13 }));

  // Capture: snapshot reads the tables, streaming reads the log
  b.push(path([[228, 168], [310, 168]], 'data'));
  b.push(text(250, 160, 'snapshot', { cls: 'e', size: 12 }));
  b.push(path([[228, 266], [310, 266]], 'data'));
  b.push(text(250, 258, 'stream', { cls: 'e', size: 12 }));
  b.push(step(256, 204, 1));
  b.push(shape.compute(312, 150, 176, 152));
  b.push(
    labels(312, 150, {
      kicker: 'JOB',
      name: ['CDC capture'],
      sub: ['(e.g. Debezium, AWS DMS)', 'Snapshots the tables,', 'then streams from the', 'recorded log position;', 'keeps its own offset'],
    }),
  );
  // Capture confirms its position to the PostgreSQL slot
  b.push(path([[228, 372], [340, 372], [340, 304]], 'meta'));
  b.push(text(252, 392, 'confirms', { cls: 'e', size: 12 }));
  b.push(text(252, 406, 'position', { cls: 'e', size: 12 }));

  // Transport: event log OR change files
  b.push(path([[488, 200], [498, 200], [498, 148], [508, 148]], 'data'));
  b.push(path([[488, 252], [498, 252], [498, 292], [508, 292]], 'data'));
  b.push(step(490, 216, 2));
  b.push(shape.log(510, 98, 196, 104));
  b.push(labels(510, 98, { kicker: 'LOG', name: ['Change event log'], sub: ['keyed by primary key', '(e.g. Kafka topic)'] }));
  b.push(text(608, 222, 'or', { cls: 's', size: 13, anchor: 'middle', italic: true }));
  b.push(shape.files(510, 244, 196, 96));
  b.push(labels(510, 244, { kicker: 'FILES', name: ['Change files'], sub: ['in object storage, with an', 'operation column (e.g. DMS)'] }));
  // Delivery guarantee note: the figure must not imply exactly-once.
  b.push(`<rect x="510" y="356" width="4" height="40" fill="${C.copper}"/>`);
  b.push(text(522, 372, 'Duplicates are possible:', { cls: 's', size: 13, fill: C.copperText, weight: 700 }));
  b.push(text(522, 389, 'tolerate them downstream', { cls: 's', size: 13, fill: C.copperText, weight: 700 }));

  // Warehouse
  b.push(boundary(732, 64, 412, 344, 'ANALYTICAL WAREHOUSE'));
  b.push(path([[706, 150], [746, 150]], 'data'));
  b.push(path([[706, 300], [724, 300], [724, 172], [746, 172]], 'data'));
  b.push(step(712, 112, 3));
  b.push(shape.table(748, 98, 182, 112));
  b.push(labels(748, 104, { kicker: 'TABLE', name: ['Landing'], sub: ['append-only: key, op,', 'row image, log', 'position, load time'] }));

  b.push(path([[839, 210], [839, 250]], 'hi'));
  b.push(step(848, 220, 4));
  b.push(shape.compute(748, 252, 182, 104));
  b.push(labels(748, 252, { kicker: 'JOB', name: ['Deduplicate'], sub: ['latest change per key,', 'ordered by log position'] }));

  b.push(path([[930, 304], [948, 304], [948, 240], [962, 240]], 'hi'));
  b.push(step(936, 316, 5));
  b.push(`<path d="M1049 104 L1057 112 L1049 120 L1041 112 Z" fill="${C.surface}" stroke="${C.teal}" stroke-width="1.5"/>`);
  b.push(path([[1049, 121], [1049, 134]], 'meta'));
  b.push(text(1036, 109, 'Reconcile counts,', { cls: 's', size: 12, anchor: 'end' }));
  b.push(text(1036, 123, 'totals', { cls: 's', size: 12, anchor: 'end' }));
  b.push(shape.table(964, 136, 170, 196));
  b.push(
    labels(964, 142, {
      kicker: 'TABLE',
      name: ['Current-state', 'tables'],
      sub: ['one row per key, with', 'its log position;', 'MERGE applies only', 'newer changes;', 'deletes kept as', 'soft deletes'],
    }),
  );

  // Consumers
  b.push(path([[1049, 332], [1049, 436]], 'data'));
  b.push(step(1058, 412, 6));
  b.push(shape.consumer(964, 438, 170, 78));
  b.push(labels(964, 438, { kicker: 'CONSUMER', name: ['Models, BI,', 'services'] }));

  // Control: orchestrator triggers the warehouse steps
  b.push(shape.control(748, 438, 182, 78));
  b.push(labels(748, 438, { kicker: 'CONTROL', name: ['Orchestrator'], sub: ['schedules each run'] }));
  b.push(path([[839, 438], [839, 360]], 'ctl'));
  b.push(text(848, 420, 'triggers', { cls: 'e', size: 12 }));

  // Monitoring: lag and retention on both sides
  b.push(shape.monitor(16, 438, 704, 78));
  b.push(labels(16, 438, { kicker: 'MONITOR', name: ['Capture lag, load lag, retention'], sub: ['slot WAL growth or binlog expiry; topic or file retention'] }));
  b.push(path([[124, 436], [124, 402]], 'meta'));
  b.push(path([[470, 436], [470, 304]], 'meta'));
  b.push(path([[698, 436], [698, 342]], 'meta'));
  b.push(text(380, 424, 'lag metrics', { cls: 'e', size: 12 }));

  return svg(
    'cdc-f1',
    1160,
    536,
    'Reference blueprint: log-based change data capture into an analytical warehouse',
    'An operational database writes changes to its transaction log. A CDC capture process snapshots the tables, then streams changes from the recorded log position and keeps its own offset; on PostgreSQL it also confirms its position to a replication slot, which keeps the WAL capture may still need. Changes go to a change event log or change files, then are loaded append-only into a landing table. The latest change per key by log position is merged into current-state tables, which store each key with its log position, apply only newer changes and keep deletes as soft deletes. Consumers read the current-state tables. An orchestrator triggers each run; monitoring watches capture lag, load lag and retention; reconciliation compares source and target totals. Duplicates are possible, so the warehouse side must tolerate them.',
    b.join('\n'),
  );
}

// ---------- Figure 2: failure, replay and convergence ----------
const CW = 112; // chip width
const CS = 122; // chip step

function chip(x, y, pos, label, { dup = false, del = false } = {}) {
  const stroke = dup ? C.copper : C.navy;
  const dash = dup ? ' stroke-dasharray="5 3"' : '';
  return (
    `<rect x="${x}" y="${y}" width="${CW}" height="52" rx="4" fill="${dup ? C.copperSoft : C.navySoft}" stroke="${stroke}" stroke-width="1.5"${dash}/>` +
    text(x + 10, y + 20, `pos ${pos}`, { cls: 'e', size: 12 }) +
    text(x + 10, y + 40, label, { cls: 's', size: 13, fill: del ? C.copperText : undefined, weight: del ? 700 : undefined })
  );
}

function laneTitle(y, title, sub) {
  return (
    `<line x1="16" y1="${y - 22}" x2="1144" y2="${y - 22}" stroke="${C.rule}" stroke-width="1"/>` +
    text(16, y, title, { cls: 'n', size: 15 }) +
    text(236, y, sub, { cls: 's', size: 13 })
  );
}

function bracket(x1, x2, y) {
  return `<path d="M${x1} ${y - 6} V${y} H${x2} V${y - 6}" fill="none" stroke="${C.graphite}" stroke-width="1"/>`;
}

function box(x, y, w, h, { fill = C.surface, stroke = C.navy } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
}

function figure2() {
  const b = [];
  const B1 = 16; // batch 1 starts
  const B2 = 392; // batch 2 starts
  const B3 = 890; // batch 3 starts

  // Lane A: the source log, the truth to converge to
  b.push(laneTitle(44, 'Source transaction log', 'committed changes, in commit order'));
  const src = [
    [101, 'insert A = v1'],
    [102, 'update A = v2'],
    [103, 'insert B = v1'],
    [104, 'update A = v3'],
    [105, 'delete B'],
  ];
  src.forEach(([p, l], i) => b.push(chip(B1 + i * CS, 56, p, l, { del: l.startsWith('delete') })));
  b.push(text(B1 + 5 * CS + 8, 78, 'pos = ordering key: commit order, and the same', { cls: 's', size: 12 }));
  b.push(text(B1 + 5 * CS + 8, 94, 'value if redelivered (built per source; see text)', { cls: 's', size: 12 }));

  // Lane B: what the capture delivers to landing, in three batches
  b.push(laneTitle(150, 'Delivered to landing', 'append-only, so duplicates are kept'));
  [
    [101, 'insert A = v1'],
    [102, 'update A = v2'],
    [103, 'insert B = v1'],
  ].forEach(([p, l], i) => b.push(chip(B1 + i * CS, 164, p, l)));
  b.push(`<line x1="${B2 - 10}" y1="158" x2="${B2 - 10}" y2="222" stroke="${C.copper}" stroke-width="2.5"/>`);
  b.push(step(B2 - 20, 226, 1));
  [
    [102, 'update A = v2', true],
    [103, 'insert B = v1', true],
    [104, 'update A = v3', false],
    [105, 'delete B', false],
  ].forEach(([p, l, dup], i) => b.push(chip(B2 + i * CS, 164, p, l, { dup, del: l.startsWith('delete') })));
  b.push(`<line x1="${B3 - 10}" y1="158" x2="${B3 - 10}" y2="222" stroke="${C.copper}" stroke-width="2.5"/>`);
  b.push(step(B3 - 20, 226, 5));
  [
    [102, 'update A = v2'],
    [103, 'insert B = v1'],
  ].forEach(([p, l], i) => b.push(chip(B3 + i * CS, 164, p, l, { dup: true })));
  b.push(bracket(B1, B1 + 2 * CS + CW, 226));
  b.push(bracket(B2, B2 + 3 * CS + CW, 226));
  b.push(bracket(B3, B3 + CS + CW, 226));
  b.push(text(B1, 246, 'batch 1', { cls: 'e', size: 12 }));
  b.push(text(B2 + 8, 246, 'batch 2: capture restarted and resumed after its last', { cls: 'e', size: 12, fill: C.copperText }));
  b.push(text(B2 + 8, 262, 'committed offset (pos 101), so 102 and 103 arrive again', { cls: 'e', size: 12, fill: C.copperText }));
  b.push(text(B3 + 8, 246, 'batch 3: a later replay', { cls: 'e', size: 12, fill: C.copperText }));
  b.push(text(B3 + 8, 262, 'of 102 and 103 only', { cls: 'e', size: 12, fill: C.copperText }));

  // Lane C: deduplicate + guarded merge, one run per batch
  b.push(laneTitle(312, 'Deduplicate, then MERGE', 'latest per key by log position; apply only if newer'));
  b.push(path([[B1 + 202, 232], [B1 + 202, 326]], 'data'));
  b.push(box(B1, 328, 2 * CS + CW, 104));
  b.push(text(B1 + 12, 350, 'RUN 1', { cls: 'k', size: 12 }));
  b.push(text(B1 + 12, 370, 'Latest per key: A 102, B 103.', { cls: 's', size: 13 }));
  b.push(text(B1 + 12, 388, 'No stored positions yet, so', { cls: 's', size: 13 }));
  b.push(text(B1 + 12, 406, 'both are applied.', { cls: 's', size: 13 }));

  b.push(path([[B2 + 426, 232], [B2 + 426, 326]], 'data'));
  b.push(box(B2, 328, 3 * CS + CW, 104));
  b.push(text(B2 + 12, 350, 'RUN 2', { cls: 'k', size: 12 }));
  b.push(step(B2 + 3 * CS + CW - 56, 336, 2));
  b.push(step(B2 + 3 * CS + CW - 30, 336, 3));
  b.push(text(B2 + 12, 370, 'Latest per key: A 104, B 105, so the duplicate rows', { cls: 's', size: 13 }));
  b.push(text(B2 + 12, 388, 'for 102 and 103 lose inside the batch. Both are newer', { cls: 's', size: 13 }));
  b.push(text(B2 + 12, 406, 'than the stored 102 and 103, so both are applied.', { cls: 's', size: 13 }));
  b.push(text(B2 + 12, 424, 'Re-running run 2 changes nothing.', { cls: 's', size: 13, weight: 700 }));

  b.push(path([[B3 + 234, 232], [B3 + 234, 326]], 'hi'));
  b.push(box(B3, 328, CS + CW + 20, 104, { fill: C.copperSoft, stroke: C.copper }));
  b.push(text(B3 + 12, 350, 'RUN 3', { cls: 'k', size: 12 }));
  b.push(step(B3 + 60, 336, 6));
  b.push(text(B3 + 12, 370, 'Latest per key: A 102, B 103.', { cls: 's', size: 13 }));
  b.push(text(B3 + 12, 388, 'Both are older than the stored', { cls: 's', size: 13 }));
  b.push(text(B3 + 12, 406, '104 and 105, so both are skipped.', { cls: 's', size: 13 }));
  b.push(text(B3 + 12, 424, 'B stays deleted.', { cls: 's', size: 13, weight: 700 }));

  // Lane D: the current-state table converges and stays converged
  b.push(laneTitle(476, 'Current-state table', 'key, value, stored log position'));
  b.push(path([[B1 + 202, 432], [B1 + 202, 488]], 'data'));
  b.push(box(B1, 490, 2 * CS + CW, 64, { fill: C.tealSoft, stroke: C.teal }));
  b.push(text(B1 + 12, 514, 'After run 1', { cls: 'k', size: 12 }));
  b.push(text(B1 + 12, 536, 'A = v2 (102) · B = v1 (103)', { cls: 's', size: 13 }));
  b.push(path([[B2 + 426, 432], [B2 + 426, 488]], 'data'));
  b.push(box(B2, 490, 3 * CS + CW, 64, { fill: C.tealSoft, stroke: C.teal }));
  b.push(text(B2 + 12, 514, 'After run 2: matches the source log', { cls: 'k', size: 12 }));
  b.push(step(B2 + 3 * CS + CW - 30, 498, 4));
  b.push(text(B2 + 12, 536, 'A = v3 (104) · B deleted, kept as a soft delete (105)', { cls: 's', size: 13 }));
  b.push(path([[B3 + 234, 432], [B3 + 234, 488]], 'hi'));
  b.push(box(B3, 490, CS + CW + 20, 64, { fill: C.tealSoft, stroke: C.teal }));
  b.push(text(B3 + 12, 514, 'After run 3: unchanged', { cls: 'k', size: 12 }));
  b.push(text(B3 + 12, 536, 'A = v3 (104) · B deleted (105)', { cls: 's', size: 13 }));

  // Failure branch
  b.push(`<line x1="16" y1="574" x2="1144" y2="574" stroke="${C.rule}" stroke-width="1"/>`);
  b.push(`<rect x="16" y="588" width="4" height="40" fill="${C.copper}"/>`);
  b.push(text(28, 604, 'If the recorded position is no longer in the log (WAL removed past a slot limit, or binlog expired), capture cannot resume from it.', { cls: 's', size: 13, weight: 700, fill: C.copperText }));
  b.push(text(28, 622, 'Take a new snapshot, then rebuild or reconcile the target against it: a snapshot holds only rows that still exist.', { cls: 's', size: 13, weight: 700, fill: C.copperText }));

  return svg(
    'cdc-f2',
    1160,
    640,
    'Failure and recovery: duplicates after a restart, and convergence through a position-guarded merge',
    'The source log holds five changes at positions 101 to 105 for keys A and B. Batch 1 delivers 101 to 103. The capture restarts and resumes after its last committed offset at 101, so batch 2 delivers 102 and 103 again with 104 and 105. A later replay, batch 3, delivers 102 and 103 only. Run 1 applies A at 102 and B at 103. Run 2 keeps the latest change per key, so the duplicates lose inside the batch, and applies A at 104 and B at 105 because both are newer than the stored positions; re-running it changes nothing. Run 3 keeps A at 102 and B at 103, both older than the stored 104 and 105, so the guard skips them and B stays deleted. The current-state table ends with A equal to v3 and B soft-deleted, matching the source, and stays that way. If the recorded position has left the log, a new snapshot is needed and the target must be rebuilt or reconciled against it.',
    b.join('\n'),
  );
}

writeFileSync(join(here, 'figure-1.svg'), figure1());
writeFileSync(join(here, 'figure-2.svg'), figure2());
console.log('wrote figure-1.svg and figure-2.svg');
