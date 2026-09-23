import { CommitDetail, FileChange, FileDiff } from '../../shared/types';
import { withGit, errorMessage } from './core';
import { parseUnifiedDiff } from './status-diff';
import { gravatarHash } from './history';

/** Number stats per changed file for a commit. */
export async function getCommitDetail(repoPath: string, hash: string): Promise<CommitDetail | null> {
  try {
    return await withGit(repoPath, async (git) => {
      const meta = await git.raw([
        'show',
        '-s',
        '--pretty=format:%H%n%h%n%an%n%ae%n%cI%n%s%n%b%n%P',
        hash
      ]);
      const lines = meta.split('\n');
      const hashFull = lines[0];
      const short = lines[1];
      const name = lines[2];
      const email = lines[3];
      const date = lines[4];
      const subject = lines[5];
      const parentsLine = lines[lines.length - 1] || '';
      const body = lines.slice(6, lines.length - 1).join('\n').replace(/\n$/, '');

      const parents = parentsLine.trim() ? parentsLine.trim().split(' ') : [];
      const isRoot = parents.length === 0;
      const range = isRoot ? [hash, '--'] : [`${hash}~1`, hash, '--'];
      const numstat = await git.raw(['diff', '--numstat', ...range]);
      const files: FileChange[] = [];
      let insertions = 0;
      let deletions = 0;
      for (const line of numstat.split('\n')) {
        if (!line.trim()) continue;
        const [ins, del, ...rest] = line.split('\t');
        const file = rest.join('\t');
        if (!file) continue;
        files.push({
          path: file,
          status: 'modified',
          insertions: ins === '-' ? undefined : parseInt(ins, 10),
          deletions: del === '-' ? undefined : parseInt(del, 10)
        });
        if (ins !== '-') insertions += parseInt(ins, 10);
        if (del !== '-') deletions += parseInt(del, 10);
      }

      // file status (A/M/D) via --name-status
      const nameStatus = await git.raw(['diff', '--name-status', ...range]);
      for (const line of nameStatus.split('\n')) {
        if (!line.trim()) continue;
        const [st, from, to] = line.split('\t');
        const target = to || from;
        const f = files.find((x) => x.path === target);
        if (!f) continue;
        if (st === 'A') f.status = 'added';
        else if (st === 'D') f.status = 'deleted';
        else if (st === 'R') {
          f.status = 'renamed';
          f.renamedFrom = from;
        }
      }

      return {
        hash: hashFull,
        shortHash: short,
        parents,
        message: subject,
        body,
        authorName: name,
        authorEmail: email,
        avatarHash: email ? gravatarHash(email) : undefined,
        date,
        files,
        insertions,
        deletions
      };
    });
  } catch (err) {
    console.error('getCommitDetail failed:', errorMessage(err));
    return null;
  }
}

/** Unified diff of one file at a commit (vs first parent) or worktree modes. */
export async function getFileDiff(
  repoPath: string,
  hash: string,
  filePath: string,
  opts?: { staged?: boolean; worktree?: boolean }
): Promise<FileDiff | null> {
  try {
    return await withGit(repoPath, async (git) => {
      let diffText: string;
      if (opts?.staged) {
        diffText = await git.diff(['--cached', '--', filePath]);
      } else if (opts?.worktree) {
        diffText = await git.diff(['--', filePath]);
      } else {
        const parents = (await git.raw(['rev-list', '--parents', '-n', '1', hash])).trim().split(' ').slice(1);
        if (parents.length === 0) {
          const emptyTree = (await git.raw(['hash-object', '-t', 'tree', '/dev/null'])).trim();
          diffText = await git.diff([`${emptyTree}..${hash}`, '--', filePath]);
        } else {
          diffText = await git.diff([`${parents[0]}..${hash}`, '--', filePath]);
        }
      }
      return parseUnifiedDiff(diffText, filePath);
    });
  } catch (err) {
    console.error('getFileDiff failed:', errorMessage(err));
    return null;
  }
}

/** Full diff text for a commit — used by revert-hunk to regenerate patches. */
export async function getCommitDiffText(repoPath: string, hash: string, filePath: string): Promise<string> {
  return withGit(repoPath, async (git) => {
    const parents = (await git.raw(['rev-list', '--parents', '-n', '1', hash])).trim().split(' ').slice(1);
    if (parents.length === 0) {
      const emptyTree = (await git.raw(['hash-object', '-t', 'tree', '/dev/null'])).trim();
      return git.diff([`${emptyTree}..${hash}`, '--', filePath]);
    }
    return git.diff([`${parents[0]}..${hash}`, '--', filePath]);
  });
}
