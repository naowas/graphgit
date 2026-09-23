import type { Commit } from '../../../shared/types';

export interface MermaidConversion {
  /** Full diagram source ready for mermaid.render(). */
  source: string;
  /** Short hashes in emission order (oldest -> newest): SVG commit node i is order[i]. */
  order: string[];
  /** Branch the diagram uses as its built-in branch (mermaid's mainBranchName). */
  mainBranch: string;
  /** True when the DAG needed a lossy approximation; `reasons` explains each one. */
  limited: boolean;
  reasons: string[];
}

/** Past this many lanes a gitGraph diagram stops being readable. */
export const MERMAID_MAX_BRANCHES = 8;

/** Branch names: strip origin/ and anything Mermaid cannot parse. */
export function sanitizeBranchName(name: string): string {
  const clean = name
    .trim()
    .replace(/^origin\//, '')
    .replace(/[^A-Za-z0-9_/\-.]/g, '-')
    .replace(/^[^A-Za-z0-9]+/, '');
  return clean || 'branch';
}

/** First local branch ref on a commit, sanitized; '' when the commit owns none. */
function primaryBranch(c: Commit): string {
  const local = c.refs.find((r) => !r.isRemote && r.kind !== 'tag' && r.label !== 'HEAD');
  return local ? sanitizeBranchName(local.label) : '';
}

/** True when a commit owns a local branch (or HEAD) decoration. */
function isBranchOwner(c: Commit | undefined): boolean {
  return !!c && c.refs.some((r) => !r.isRemote && r.kind !== 'tag');
}

/** Every commit reachable from `start` (inclusive), following all parents. */
function reachable(start: string, byHash: Map<string, Commit>): Set<string> {
  const out = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const h = stack.pop()!;
    if (out.has(h)) continue;
    out.add(h);
    const row = byHash.get(h);
    if (row) for (const p of row.parents) stack.push(p);
  }
  return out;
}

/**
 * Claim a commit and its first-parent chain for `branch`, stopping at rows a
 * different lane already owns.
 */
function claimChain(
  start: string,
  branch: string,
  byHash: Map<string, Commit>,
  assigned: Map<string, string>
): void {
  let cur: string | undefined = start;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    if (assigned.has(cur)) break;
    assigned.set(cur, branch);
    const row = byHash.get(cur);
    cur = row && row.parents.length > 0 ? row.parents[0] : undefined;
  }
}

/**
 * Assign every commit to a display branch:
 *  1. branch tips walk their first-parent chains (trunk-like tips first, so
 *     `main` keeps the shared history);
 *  2. second parents of merges that no branch owns are materialized as
 *     `merge-<short>` lanes (gitGraph cannot merge an unnamed branch);
 *  3. anything left continues its first parent's lane, or opens a fresh lane.
 *
 * Lane sets must stay first-parent chains: a Mermaid branch line is implied by
 * statement order, so a lane that forked internally would draw false edges.
 */
function assignBranches(
  newestFirst: Commit[],
  currentBranch: string,
  oldestFirst: Commit[]
): Map<string, string> {
  const byHash = new Map(newestFirst.map((c) => [c.hash, c]));
  const assigned = new Map<string, string>();
  const indexOf = (hash: string) => newestFirst.findIndex((c) => c.hash === hash);

  const tips: { branch: string; hash: string }[] = [];
  const used = new Set<string>();
  for (const c of newestFirst) {
    for (const r of c.refs) {
      if (r.isRemote || r.kind === 'tag' || r.label === 'HEAD') continue;
      const name = sanitizeBranchName(r.label);
      if (used.has(name)) continue;
      used.add(name);
      tips.push({ branch: name, hash: c.hash });
    }
  }
  const head = sanitizeBranchName(currentBranch);
  if (currentBranch && !used.has(head) && newestFirst[0]) {
    used.add(head);
    tips.push({ branch: head, hash: newestFirst[0].hash });
  }

  const trunkRank = (b: string) => (b === head || b === 'main' || b === 'master' || b === 'develop' ? 0 : 1);
  // Long-lived trunks claim the shared history first, then older tips.
  tips.sort((a, b) => trunkRank(a.branch) - trunkRank(b.branch) || indexOf(b.hash) - indexOf(a.hash));

  const uniqueName = (base: string): string => {
    let name = base;
    for (let i = 2; used.has(name); i++) name = sanitizeBranchName(`${base}-${i}`);
    used.add(name);
    return name;
  };
  for (const tip of tips) claimChain(tip.hash, tip.branch, byHash, assigned);

  // Merged-and-deleted side branches: the fork from the second parent has no
  // ref of its own, so name it after the merge that absorbed it.
  for (const c of oldestFirst) {
    for (let i = 1; i < c.parents.length; i++) {
      const second = c.parents[i];
      if (!byHash.has(second) || assigned.has(second)) continue;
      claimChain(second, uniqueName(sanitizeBranchName(`merge-${c.shortHash || 'x'}`)), byHash, assigned);
    }
  }

  // Rows nobody owns (detached work, commits only reachable through a second
  // parent's own merges) continue their first parent's lane, unless that lane
  // already continues through another child.
  const childTaken = new Set<string>();
  for (const c of newestFirst) {
    const p = c.parents[0];
    // Only rows a lane already owns count as "this lane continues here".
    if (p && assigned.has(c.hash) && assigned.get(c.hash) === assigned.get(p)) childTaken.add(p);
  }
  for (const c of oldestFirst) {
    if (assigned.has(c.hash)) continue;
    const p = c.parents[0];
    if (p && assigned.has(p) && !childTaken.has(p)) {
      assigned.set(c.hash, assigned.get(p)!);
      childTaken.add(p);
      continue;
    }
    const base = primaryBranch(c) || `detached-${c.shortHash || 'x'}`;
    assigned.set(c.hash, uniqueName(sanitizeBranchName(base)));
  }
  return assigned;
}

/**
 * Oldest-first display order for the diagram: the log is newest-first, and
 * gitGraph draws in statement order, so we reverse it. Timestamp ties (and
 * clock skew) can put a parent after its child in `git log --all` output,
 * which would make a `merge` reference a branch that has no commits yet, so we
 * repair the order by pulling such parents in front of their children.
 */
function topologicalOldestFirst(newestFirst: Commit[]): Commit[] {
  const order = [...newestFirst].reverse();
  const pos = new Map<string, number>();
  order.forEach((c, i) => pos.set(c.hash, i));
  const reindex = (from: number) => order.forEach((c, i) => {
    if (i >= from) pos.set(c.hash, i);
  });
  for (let pass = 0; pass < order.length; pass++) {
    let moved = false;
    for (let i = 0; i < order.length; i++) {
      for (const p of order[i].parents) {
        const j = pos.get(p);
        if (j === undefined || j < i) continue;
        const [parent] = order.splice(j, 1);
        order.splice(i, 0, parent);
        reindex(i);
        moved = true;
        break;
      }
      if (moved) break;
    }
    if (!moved) break;
  }
  return order;
}

interface MergePlan {
  /** Branch to `merge`; undefined when the row must be drawn as a plain commit. */
  target?: string;
}

/**
 * Decide how each merge row is drawn.
 *
 * gitGraph needs the merged side to exist as a branch, but git gives no name
 * for a branch that was merged and then deleted — and Mermaid rejects
 * `merge <current>` ("Cannot merge branch 'main' into itself"). So whenever the
 * second parent's lane is indistinguishable from the merge's own lane, we
 * materialize the fork as a `merge-<short>` branch.
 */
function planMerges(
  oldestFirst: Commit[],
  byHash: Map<string, Commit>,
  branchOf: Map<string, string>,
  reasons: string[],
  fallbackBranch: string
): Map<string, MergePlan> {
  const plans = new Map<string, MergePlan>();
  const taken = new Set<string>(branchOf.values());
  for (const c of oldestFirst) {
    if (c.parents.length < 2) continue;
    const mine = branchOf.get(c.hash) || fallbackBranch;
    const second = c.parents[1];
    if (c.parents.length > 2) {
      reasons.push(
        `Octopus merge ${c.shortHash}: ${c.parents.length} parents; gitGraph merges one branch at a time.`
      );
    }
    const secondRow = byHash.get(second);
    if (!secondRow) {
      reasons.push(`Merge ${c.shortHash}: second parent is outside the loaded history; drawn as a plain commit.`);
      continue;
    }
    const firstHistory = reachable(c.parents[0], byHash);
    if (firstHistory.has(second)) {
      // Re-merging an ancestor (fast-forward style / `merge -s ours`).
      reasons.push(
        `Merge ${c.shortHash}: second parent is already in the first parent's history; drawn as a plain commit.`
      );
      continue;
    }
    let target = branchOf.get(second) || mine;
    if (target === mine) {
      let name = sanitizeBranchName(`merge-${c.shortHash || 'x'}`);
      for (let i = 2; taken.has(name); i++) name = sanitizeBranchName(`merge-${c.shortHash || 'x'}-${i}`);
      taken.add(name);
      let cur: string | undefined = second;
      const guard = new Set<string>();
      while (cur && !guard.has(cur) && !firstHistory.has(cur)) {
        guard.add(cur);
        const row = byHash.get(cur);
        if (cur !== second && isBranchOwner(row)) break; // belongs to a named branch
        branchOf.set(cur, name);
        cur = row && row.parents.length > 0 ? row.parents[0] : undefined;
      }
      target = branchOf.get(second) || '';
      if (target === '' || target === mine) {
        reasons.push(`Merge ${c.shortHash}: side branch has no commits to draw; falling back to a plain commit.`);
        continue;
      }
    }
    plans.set(c.hash, { target });
  }
  return plans;
}

/**
 * Convert newest-first commits into Mermaid `gitGraph` source.
 *
 * Emitted oldest-first with the `BT` direction: gitGraph then stacks commits one
 * step apart on a vertical axis and gives every branch its own lane, so ascending
 * `y` in the rendered SVG is exactly the newest-first order of the commit list and
 * a single scaled SVG can stand in for the per-row lane drawing. (The default
 * `LR` puts time on the horizontal axis and cannot line up with a list; `TB` would
 * run oldest-to-newest downwards, i.e. upside down for the list.) `order` maps SVG
 * node i back to a commit and merges carry `merge X id: "<short>"` so every node is
 * identifiable.
 */
export function commitsToMermaidGitGraph(
  newestFirst: Commit[],
  opts?: { currentBranch?: string }
): MermaidConversion {
  const reasons: string[] = [];
  const commits = newestFirst.filter((c) => c.hash !== 'WIP');
  const order: string[] = [];
  if (commits.length === 0) {
    return { source: 'gitGraph BT:\n', order, mainBranch: 'main', limited: false, reasons };
  }

  const byHash = new Map(commits.map((c) => [c.hash, c]));
  const oldestFirst = topologicalOldestFirst(commits);
  const branchOf = assignBranches(commits, opts?.currentBranch || 'main', oldestFirst);
  // The oldest commit starts the trunk lane; make that branch Mermaid's
  // built-in branch so no empty `main` lane is drawn next to it.
  const mainBranch = branchOf.get(oldestFirst[0].hash) || 'main';
  const plans = planMerges(oldestFirst, byHash, branchOf, reasons, mainBranch);

  const branches = new Set(branchOf.values());
  if (branches.size > MERMAID_MAX_BRANCHES) {
    reasons.push(
      `Too many branches (${branches.size}); gitGraph lanes become unreadable past ${MERMAID_MAX_BRANCHES}.`
    );
  }

  const lines = ['gitGraph BT:'];
  const declared = new Set<string>([mainBranch]);
  let current: string | null = null;
  const goTo = (branch: string): void => {
    const want = sanitizeBranchName(branch);
    if (!declared.has(want)) {
      declared.add(want);
      lines.push(`  branch ${want}`);
    } else if (current !== want) {
      lines.push(`  checkout ${want}`);
    }
    current = want;
  };

  // Fork points: Mermaid forks a new branch at the commit it drew last, so a
  // lane has to be opened right after its fork commit is drawn. Group the
  // commits into lanes (each lane walks first-parent links) and record where
  // every lane starts.
  const laneStart = new Map<string, string>();
  const forks = new Map<string, string[]>();
  for (const c of oldestFirst) {
    const branch = branchOf.get(c.hash) || mainBranch;
    if (laneStart.has(branch)) continue;
    laneStart.set(branch, c.hash);
    if (branch === mainBranch) continue;
    const parent = c.parents[0];
    if (!parent) continue;
    const list = forks.get(parent);
    if (list) list.push(branch);
    else forks.set(parent, [branch]);
  }

  const childrenOnLane = new Map<string, Commit[]>();
  for (const c of oldestFirst) {
    const parent = c.parents[0];
    if (!parent) continue;
    const list = childrenOnLane.get(parent);
    if (list) list.push(c);
    else childrenOnLane.set(parent, [c]);
  }

  const emitted = new Set<string>();
  const emitStatement = (c: Commit): void => {
    const branch = sanitizeBranchName(branchOf.get(c.hash) || mainBranch);
    const tag = c.refs.find((r) => r.kind === 'tag');
    const tagPart = tag ? ` tag: "${tag.label.replace(/"/g, '')}"` : '';
    const plan = plans.get(c.hash);
    goTo(branch);
    if (plan && plan.target && declared.has(plan.target) && current !== plan.target) {
      lines.push(`  merge ${plan.target} id: "${c.shortHash}"${tagPart}`);
    } else {
      if (plan && plan.target && !declared.has(plan.target)) {
        reasons.push(`Merge ${c.shortHash}: side branch was never drawn; shown as a plain commit.`);
      }
      lines.push(`  commit id: "${c.shortHash}"${tagPart}`);
    }
    order.push(c.shortHash);
  };

  // Walk a lane from its oldest commit towards its tip. A fork has to be
  // opened while its fork commit is `current`, so branches are emitted inline
  // (a lane's commits are exactly its first-parent chain).
  const emitUpward = (hash: string, branch: string): void => {
    const c = byHash.get(hash);
    if (!c || emitted.has(hash)) return;
    emitted.add(hash);
    emitStatement(c);
    for (const forked of forks.get(hash) || []) {
      goTo(forked);
      emitUpward(laneStart.get(forked)!, forked);
    }
    goTo(branch);
    for (const child of childrenOnLane.get(hash) || []) {
      if ((branchOf.get(child.hash) || mainBranch) === branch) emitUpward(child.hash, branch);
    }
  };

  goTo(mainBranch);
  emitUpward(laneStart.get(mainBranch)!, mainBranch);

  // Degenerate histories (unrelated roots, rows no lane claimed) still get a
  // statement so the diagram keeps exactly one node per commit.
  for (const c of oldestFirst) {
    if (emitted.has(c.hash)) continue;
    emitted.add(c.hash);
    emitStatement(c);
  }

  const limited = reasons.some((r) => r.startsWith('Octopus') || r.startsWith('Too many'));
  return { source: lines.join('\n') + '\n', order, mainBranch, limited, reasons };
}
