// Probe the exact DOM mermaid produces for a commit bullet, a merge marker and
// the labels, using the same config the app uses. Dev tool.
// Usage: node scripts/probe-gitgraph-dom.mjs <source.mmd>
import { readFileSync } from 'node:fs';
import { installDomShims } from './mermaid-dom-shim.mjs';

installDomShims();
const mermaid = (await import('mermaid')).default;
const { buildGitGraphConfig } = await import('../src/renderer/components/CommitGraph/mermaidConfig.ts');
mermaid.initialize(buildGitGraphConfig('main'));

const src = readFileSync(process.argv[2], 'utf8');
const { svg } = await mermaid.render('gg-probe', src);
for (const m of svg.matchAll(/<circle[^>]*>/g)) console.log('CIRCLE', m[0].slice(0, 200));
for (const m of svg.matchAll(/<(g|rect|text)[^>]*class="[^"]*(label|Label)[^"]*"[^>]*>/g)) {
  console.log('LABEL', m[0].slice(0, 200));
}
console.log('commit-label count:', [...svg.matchAll(/commit-label/g)].length);
console.log('tag-label-bkg count:', [...svg.matchAll(/tag-label-bkg/g)].length);
