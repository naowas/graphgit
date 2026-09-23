// Headless Mermaid gitGraph render smoke-check.
// Usage: node scripts/mermaid-render-check.mjs <gitgraph-source.mmd>
//
// Renders the diagram through the real mermaid pipeline (jsdom shim) and
// compares the commit bullets it produced with the `<file>.json` sidecar the
// converter test writes ({ mainBranch, order, reasons }). That proves every
// commit maps to exactly one SVG node, which is what the click/hover overlay
// relies on. Without a sidecar it only reports what was rendered.
import { existsSync, readFileSync } from 'node:fs';
import { installDomShims } from './mermaid-dom-shim.mjs';

installDomShims();
const mermaid = (await import('mermaid')).default;
mermaid.initialize({ startOnLoad: false, securityLevel: 'antiscript', theme: 'dark' });

const file = process.argv[2];
const meta = existsSync(`${file}.json`) ? JSON.parse(readFileSync(`${file}.json`, 'utf8')) : null;
let src = readFileSync(file, 'utf8');
if (meta?.mainBranch && meta.mainBranch !== 'main') {
  // Same wiring the renderer uses: gitGraph's built-in branch is the repo trunk.
  src = `%%{init: {"gitGraph": {"mainBranchName": "${meta.mainBranch}"}}}%%\n${src}`;
}

try {
  const { svg } = await mermaid.render('gg-check', src);
  // Commit bullets are `<circle class="commit <id> commitN">`; merge rows add a
  // second, smaller `<circle class="commit commit-merge <id> ...">` marker at
  // the same spot, so only bullet circles are counted as nodes.
  const ids = [...svg.matchAll(/<circle[^>]*class="commit [^"]*"/g)]
    .map((m) => (m[0].match(/class="commit ([^"\s]+) commit\d+/) || [])[1])
    .filter(Boolean);
  console.log(`RENDER_OK svgLen=${svg.length} bullets=${ids.length}`);
  if (process.env.GGD_DUMP) {
    for (const t of svg.matchAll(/<g[^>]*>/g)) console.log(t[0]);
  }
  if (!meta) {
    console.log(`NODES: ${ids.join(' ')}`);
  } else {
    const missing = meta.order.filter((h) => !ids.includes(h));
    const extra = ids.filter((h) => !meta.order.includes(h));
    const dupes = ids.filter((h, i) => ids.indexOf(h) !== i);
    const aligned = ids.every((h, i) => meta.order[i] === h);
    console.log(`order: ${ids.length}/${meta.order.length} nodes, aligned=${aligned}`);
    if (missing.length || extra.length || dupes.length) {
      console.log(`MISMATCH missing=[${missing}] extra=[${extra}] dupes=[${dupes}]`);
      process.exitCode = 1;
    } else {
      console.log(`MATCH ids=[${ids.join(' ')}]`);
    }
  }
} catch (e) {
  const msg = String((e && e.message) || e).split('\n').slice(0, 4).join(' | ');
  console.log(`RENDER_FAIL: ${msg}`);
  process.exitCode = 1;
}
