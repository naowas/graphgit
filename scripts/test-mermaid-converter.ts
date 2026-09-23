import { writeFileSync } from 'node:fs';
import { commitsToMermaidGitGraph } from '../src/renderer/components/CommitGraph/gitgraph';
import type { Commit } from '../src/shared/types';
import { getLog } from '../src/main/git/log';
import { getStatus } from '../src/main/git/status-diff';

let n = 0;
function mk(
  short: string,
  parents: string[],
  message: string,
  refs: Commit['refs'] = []
): Commit {
  const hash = short.padEnd(40, '0');
  return {
    hash,
    shortHash: short,
    parents: parents.map((p) => p.padEnd(40, '0')),
    message,
    body: '',
    authorName: 'Tester',
    authorEmail: 't@e.com',
    date: '',
    refs,
    lanes: [],
    lane: 0
  };
}
const B = (label: string, extra?: Partial<Commit['refs'][number]>): Commit['refs'] => [
  { kind: 'branch', label, ...extra }
];
const TAG = (label: string): Commit['refs'] => [{ kind: 'tag', label }];

function show(title: string, commits: Commit[], currentBranch = 'main') {
  n += 1;
  console.log('='.repeat(60));
  console.log(title);
  const r = commitsToMermaidGitGraph(commits, { currentBranch });
  console.log(r.source);
  console.log('order:', r.order.join(' '));
  console.log('mainBranch:', r.mainBranch);
  console.log('limited:', r.limited, '| reasons:', JSON.stringify(r.reasons));
  const file = `/tmp/gg-scenario-${String(n).padStart(2, '0')}.mmd`;
  writeFileSync(file, r.source, 'utf8');
  writeFileSync(`${file}.json`, JSON.stringify({ mainBranch: r.mainBranch, order: r.order, reasons: r.reasons }, null, 2));
  console.log('wrote', file);
}

async function main() {
  // 1. Linear history on main
  const c1 = mk('aaaaaaa', [], 'initial', B('main'));
  const c2 = mk('bbbbbbb', ['aaaaaaa'], 'second');
  const c3 = mk('ccccccc', ['bbbbbbb'], 'third');
  show('1. linear main', [c3, c2, c1]);

  // 2. Feature branch merged into main
  const f1 = mk('f111111', ['bbbbbbb'], 'feature work');
  const m1 = mk('m222222', ['ccccccc', 'f111111'], 'merge feature', B('main'));
  show('2. feature + merge', [m1, f1, c3, c2, c1]);

  // 3. Two parallel branches, one merged, one still open with tip ref
  const g1 = mk('g111111', ['bbbbbbb'], 'other work', B('feature/y'));
  show('3. open branch + merge', [m1, g1, f1, c3, c2, c1]);

  // 4. Octopus merge
  const o1 = mk('o333333', ['ccccccc', 'f111111', 'g111111'], 'octopus', B('main'));
  show('4. octopus (expect limited)', [o1, g1, f1, c3, c2, c1]);

  // 5. Detached HEAD commit (no refs)
  const d1 = mk('d444444', ['ccccccc'], 'detached experiment');
  show('5. detached HEAD (currentBranch=main)', [d1, m1, f1, c3, c2, c1]);

  // 6. Tag on a commit
  const t1 = mk('ccccccc', ['bbbbbbb'], 'third', [
    ...B('main'),
    { kind: 'tag', label: 'v1.0' }
  ]);
  show('6. tag', [mk('ddddddd', ['ccccccc'], 'fourth'), t1, c2, c1]);

  // 7. Two side branches merged and deleted (both need synthetic lanes)
  const p1 = mk('aaaaaaa', [], 'initial', B('main'));
  const p2 = mk('b111111', ['aaaaaaa'], 'side b');
  const p3 = mk('m222222', ['aaaaaaa', 'b111111'], 'merge b', B('main'));
  const p4 = mk('c111111', ['m222222'], 'main continues');
  const p5 = mk('d111111', ['m222222'], 'side d');
  const p6 = mk('m333333', ['c111111', 'd111111'], 'merge d', B('main'));
  show('7. two deleted side branches', [p6, p5, p4, p3, p2, p1]);

  // 8. Second parent outside the loaded range (truncated log)
  show('8. truncated history', [
    mk('m444444', ['aaaaaaa', 'fffffff'], 'merge unknown', B('main')),
    p1
  ]);

  // 9. No-op merge: second parent is already an ancestor of the first parent
  const q1 = mk('bbbbbbb', ['aaaaaaa'], 'second');
  show('9. no-op merge', [mk('m555555', ['bbbbbbb', 'aaaaaaa'], 'noop merge', B('main')), q1, p1]);

  // 10. master trunk (Mermaid's built-in branch must be master)
  const ma = mk('aaaaaaa', [], 'initial', B('master'));
  show('10. master trunk', [mk('bbbbbbb', ['aaaaaaa'], 'second'), ma], 'master');

  // 11. Many branches (over MERMAID_MAX_BRANCHES)
  const many = [mk('aaaaaaa', [], 'initial', B('main'))];
  for (let i = 1; i <= 9; i++) {
    many.push(mk(`b${i}11111`, ['aaaaaaa'], `branch ${i}`, B(`feature/b${i}`)));
  }
  show('11. many branches (expect limited)', many);

  // 12. Tag attached to a merge commit
  show('12. tagged merge', [
    mk('m666666', ['ccccccc', 'f111111'], 'merge release', [...B('main'), ...TAG('v2.0')]),
    f1,
    c3,
    c2,
    c1
  ]);

  // 13. Criss-cross merges (two merges referencing each other's first parents)
  const x1 = mk('x111111', ['aaaaaaa'], 'x work');
  const y1 = mk('y111111', ['aaaaaaa'], 'y work');
  show('13. criss-cross', [
    mk('m222222', ['y111111', 'x111111'], 'merge Y into X', B('main')),
    mk('m111111', ['x111111', 'y111111'], 'merge X into Y', B('X')),
    y1,
    x1,
    p1
  ]);

  // 14./15. Real repositories: a flat merge and a true fork merge
  for (const [label, repo] of [
    ['14', '/tmp/graphgit-test'],
    ['15', '/tmp/gg-mermaid']
  ] as const) {
    try {
      const st = await getStatus(repo);
      const log = await getLog(repo, st, 50);
      show(`${label}. real repo (${repo}, ${log.commits.length} commits)`, log.commits.slice(0, 20), st.currentBranch);
    } catch (e) {
      console.log(`${label}. real repo skipped:`, String(e));
    }
  }
}

void main();
