/**
 * Scale check: build a synthetic 400-commit history (long trunk, short-lived
 * feature branches, merges, a tag), convert it with the real converter and time
 * a real mermaid render of the result.
 *
 * Usage: npx tsx scripts/test-mermaid-scale.ts
 * Writes /tmp/gg-scale.mmd (+ .json sidecar) — render with:
 *   time node scripts/mermaid-render-check.mjs /tmp/gg-scale.mmd
 */
import { writeFileSync } from 'node:fs';
import type { Commit, CommitRef } from '../src/shared/types';
import { commitsToMermaidGitGraph } from '../src/renderer/components/CommitGraph/gitgraph';

const hex = (n: number): string => n.toString(16).padStart(7, '0');

/** oldest-first construction, then reversed (the app hands the graph newest-first) */
const oldestFirst: Commit[] = [];
let counter = 0;
const push = (message: string, parents: string[], refs: CommitRef[] = []): Commit => {
  const hash = `${hex(++counter)}`.padEnd(40, '0');
  const c: Commit = {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    message,
    body: '',
    authorName: 'Scale Bot',
    authorEmail: 'scale@example.com',
    date: new Date(Date.UTC(2024, 0, 1, 0, 0, counter)).toISOString(),
    refs,
    lane: 0,
    lanes: []
  };
  oldestFirst.push(c);
  return c;
};

let trunk = push('initial commit', [], [{ kind: 'branch', label: 'main' }]);
for (let i = 0; i < 360; i++) {
  trunk = push(`trunk commit ${i}`, [trunk.hash]);
  // every 20 commits a short-lived feature branch merges back in
  if (i > 0 && i % 20 === 0) {
    let tip = push(`feature start ${i}`, [trunk.hash], [{ kind: 'branch', label: `feature/${i}` }]);
    tip = push(`feature work ${i}`, [tip.hash]);
    trunk = push(`Merge branch feature/${i}`, [trunk.hash, tip.hash]);
  }
}
trunk = push('release', [trunk.hash], [{ kind: 'tag', label: 'v1.0' }]);
trunk = push('head commit', [trunk.hash], [{ kind: 'head', label: 'HEAD' }]);

const newestFirst = [...oldestFirst].reverse();
const { source, order, mainBranch, reasons } = commitsToMermaidGitGraph(newestFirst, 'main');
writeFileSync('/tmp/gg-scale.mmd', source);
writeFileSync('/tmp/gg-scale.mmd.json', JSON.stringify({ mainBranch, order, reasons }, null, 2));
console.log(`commits=${newestFirst.length} lines=${source.split('\n').length} branches=${new Set(source.match(/^  branch .*/gm) || []).length}`);
console.log(`limited=${reasons.length > 0} reasons=${reasons.length} → /tmp/gg-scale.mmd`);
