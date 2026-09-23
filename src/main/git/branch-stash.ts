import { BranchInfo, StashInfo } from '../../shared/types';
import { withGit, errorMessage } from './core';

export async function getBranches(repoPath: string): Promise<{ local: BranchInfo[]; remote: BranchInfo[] }> {
  try {
    return await withGit(repoPath, async (git) => {
      const res = await git.branch(['-vv', '-a']);
      const local: BranchInfo[] = [];
      const remote: BranchInfo[] = [];
      const seenLocal = new Set<string>();
      const seenRemote = new Set<string>();
      for (const [name, info] of Object.entries(res.branches)) {
        // simple-git BranchSummary has no `type` field — remote detection must use the `remotes/` prefix.
        const isRemote = name.startsWith('remotes/');
        const cleanName = name.replace(/^remotes\//, '');
        // simple-git can yield duplicate keys for the same tracking branch
        // (e.g. local branch named `origin/feature/lead` + `remotes/origin/feature/lead`,
        // fetch/prune edge-cases, or `origin/HEAD` symbolic ref); de-duplicate by fullName
        if (isRemote) {
          if (cleanName === 'origin/HEAD') continue;
          if (seenRemote.has(cleanName)) continue;
          seenRemote.add(cleanName);
        } else {
          if (seenLocal.has(cleanName)) continue;
          seenLocal.add(cleanName);
        }
        const b: BranchInfo = {
          name: isRemote ? cleanName.split('/').slice(1).join('/') || cleanName : cleanName,
          fullName: cleanName,
          isCurrent: !!(info as { current?: boolean }).current,
          isRemote,
          lastCommitDate: (info as { date?: string }).date,
          tracking: (info as { label?: string }).label?.match(/\[(.+?)\]/)?.[1]
        };
        if (isRemote) remote.push(b);
        else local.push(b);
      }
      local.sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || a.name.localeCompare(b.name));
      remote.sort((a, b) => a.fullName.localeCompare(b.fullName));
      return { local, remote };
    });
  } catch (err) {
    console.error('getBranches failed:', errorMessage(err));
    return { local: [], remote: [] };
  }
}

export async function getStashes(repoPath: string): Promise<StashInfo[]> {
  try {
    return await withGit(repoPath, async (git) => {
      const out = await git.raw(['stash', 'list', '--pretty=format:%gd%x09%gs%x09%cI']);
      const stashes: StashInfo[] = [];
      for (const line of out.split('\n')) {
        if (!line.trim()) continue;
        const [ref, msg, date] = line.split('\t');
        stashes.push({
          index: parseInt((ref || 'stash@{0}').match(/\{(\d+)\}/)?.[1] || '0', 10),
          message: (msg || '').replace(/^WIP on .*: /, ''),
          date: date || ''
        });
      }
      return stashes;
    });
  } catch (err) {
    console.error('getStashes failed:', errorMessage(err));
    return [];
  }
}

export async function checkoutBranch(repoPath: string, name: string): Promise<void> {
  await withGit(repoPath, (git) => git.checkout(name));
}

export async function createBranch(repoPath: string, name: string): Promise<void> {
  await withGit(repoPath, (git) => git.raw(['branch', name]));
}

export async function deleteBranch(repoPath: string, name: string): Promise<void> {
  await withGit(repoPath, (git) => git.deleteLocalBranch(name));
}

export async function renameBranch(repoPath: string, name: string, newName: string): Promise<void> {
  await withGit(repoPath, (git) => git.raw(['branch', '-m', name, newName]));
}

export async function stash(repoPath: string, message?: string): Promise<void> {
  await withGit(repoPath, (git) => git.stash(message ? ['push', '-m', message] : ['push']));
}

export async function stashPop(repoPath: string, index?: number): Promise<void> {
  await withGit(repoPath, (git) => git.stash(['pop', `stash@{${index ?? 0}}`]));
}

export async function stashApply(repoPath: string, index?: number): Promise<void> {
  await withGit(repoPath, (git) => git.stash(['apply', `stash@{${index ?? 0}}`]));
}

export async function stashDrop(repoPath: string, index?: number): Promise<void> {
  await withGit(repoPath, (git) => git.stash(['drop', `stash@{${index ?? 0}}`]));
}

/** Apply the inverse of a single hunk (Revert Hunk) via `git apply -R --cached`-less worktree patch. */
export async function revertHunk(repoPath: string, diffText: string, hunkIndex: number): Promise<void> {
  await withGit(repoPath, async (git) => {
    const lines = diffText.split('\n');
    const headerLines: string[] = [];
    const hunkBlocks: string[][] = [];
    let current: string[] | null = null;
    for (const line of lines) {
      if (line.startsWith('@@')) {
        current = [line];
        hunkBlocks.push(current);
      } else if (current) {
        current.push(line);
      } else {
        headerLines.push(line);
      }
    }
    const block = hunkBlocks[hunkIndex];
    if (!block) throw new Error(`Hunk ${hunkIndex} not found`);
    // Keep only file headers that git apply needs (drop index lines with hashes mismatch tolerance)
    const fileHeader = headerLines.filter(
      (l) => l.startsWith('--- ') || l.startsWith('+++ ') || l.startsWith('diff --git')
    );
    const patch = [...fileHeader, ...block].join('\n') + '\n';
    await git.applyPatch(patch, ['--reverse', '--whitespace=nofix', '--recount']);
  });
}
