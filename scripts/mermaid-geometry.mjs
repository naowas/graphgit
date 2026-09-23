// Report absolute commit-bullet positions in a rendered gitGraph SVG so the
// list view can be aligned with mermaid's own row/lane spacing.
// Usage: node scripts/mermaid-geometry.mjs <source.mmd>
import { readFileSync } from 'node:fs';
import { installDomShims } from './mermaid-dom-shim.mjs';

const dom = installDomShims();
const mermaid = (await import('mermaid')).default;
mermaid.initialize({ startOnLoad: false, securityLevel: 'antiscript', theme: 'dark' });

const src = readFileSync(process.argv[2], 'utf8');
const { svg } = await mermaid.render('gg-geom', src);
dom.window.document.body.innerHTML = svg;

const tx = (el) => {
  let x = 0;
  let y = 0;
  for (let n = el; n && n.getAttribute; n = n.parentNode) {
    const t = n.getAttribute('transform') || '';
    const m = t.match(/translate\(\s*(-?[\d.]+)[,\s]+(-?[\d.]+)?/);
    if (m) {
      x += Number(m[1]);
      y += Number(m[2] || 0);
    }
  }
  return { x, y };
};

const rows = [];
for (const c of dom.window.document.querySelectorAll('circle.commit')) {
  const cls = c.getAttribute('class').split(/\s+/);
  if (cls.includes('commit-merge')) continue;
  const p = tx(c);
  rows.push({
    id: cls[1],
    x: +(p.x + Number(c.getAttribute('cx'))).toFixed(2),
    y: +(p.y + Number(c.getAttribute('cy'))).toFixed(2)
  });
}
rows.sort((a, b) => a.y - b.y);
console.log('id        laneX     rowY     dy');
rows.forEach((r, i) => console.log(`${r.id.padEnd(9)} ${String(r.x).padStart(7)} ${String(r.y).padStart(8)} ${String(i === 0 ? 0 : +(r.y - rows[i - 1].y).toFixed(2)).padStart(7)}`));
const laneXs = [...new Set(rows.map((r) => r.x))].sort((a, b) => a - b);
console.log('lanes x:', laneXs.join(' '), '| laneSpacing:', laneXs.length > 1 ? +(laneXs[1] - laneXs[0]).toFixed(2) : 'n/a');
const steps = rows.slice(1).map((r, i) => +(r.y - rows[i].y).toFixed(2));
console.log('row steps:', [...new Set(steps)].join(','));

const host = dom.window.document.querySelector('g.commit-bullets')?.ownerSVGElement;
if (host) {
  console.log('root svg: width=%s height=%s viewBox=%s style=%s', host.getAttribute('width'), host.getAttribute('height'), host.getAttribute('viewBox'), host.getAttribute('style'));
  for (const el of host.querySelectorAll('g.branchLabel text, rect.branchLabelBkg')) {
    console.log('  label', el.tagName, 'x=', el.getAttribute('x'), 'y=', el.getAttribute('y'), 'transform=', el.getAttribute('transform'));
  }
  const spines = host.querySelectorAll('line.branch');
  if (spines.length) console.log('  spine0:', spines[0].getAttribute('x1'), spines[0].getAttribute('y1'), spines[0].getAttribute('x2'), spines[0].getAttribute('y2'));
}

const metaPath = `${process.argv[2]}.json`;
if (readFileSync) {
  const { existsSync } = await import('node:fs');
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    const aligned = rows.length === meta.order.length && rows.every((r, i) => meta.order[i] === r.id);
    console.log(`row order vs emitted order: ${aligned ? 'ALIGNED' : 'MISALIGNED'} (${rows.length}/${meta.order.length})`);
    if (!aligned) console.log('rendered:', rows.map((r) => r.id).join(' '), '\nemitted :', meta.order.join(' '));
    process.exitCode = aligned ? 0 : 1;
  }
}
