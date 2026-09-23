import {
  GitStatus,
  GitFileStatus,
  FileStatusKind,
  FileDiff,
  DiffHunk,
  DiffLine
} from '../../shared/types';
import { withGit, errorMessage } from './core';

export async function getStatus(repoPath: string): Promise<GitStatus> {
  const git = await withGit(repoPath, (g) => Promise.resolve(g));
  const s = await git.status();
  const mapFile = (p: string, staged: boolean, unstaged: boolean): GitFileStatus => {
    let path = p;
    let status: FileStatusKind = 'modified';
    let renamedFrom: string | undefined;
    if (path.includes(' -> ')) {
      const [from, to] = path.split(' -> ');
      renamedFrom = from;
      path = to;
      status = 'renamed';
    }
    return { path, status, staged, unstaged, renamedFrom };
  };

  const staged: GitFileStatus[] = [];
  const unstaged: GitFileStatus[] = [];
  const seen = new Set<string>();
  const push = (arr: GitFileStatus[], f: string) => {
    const item = mapFile(f, arr === staged, arr !== staged);
    arr.push(item);
    seen.add(item.path);
  };

  for (const f of s.staged) push(staged, f);
  for (const f of s.modified) if (!seen.has(f) && !s.staged.includes(f)) push(unstaged, f);
  for (const f of s.not_added) if (!seen.has(f)) push(unstaged, f);
  for (const f of s.deleted) if (!seen.has(f) && !s.staged.includes(f)) push(unstaged, f);
  for (const f of s.conflicted) {
    if (!seen.has(f)) {
      unstaged.push({ path: f, status: 'conflicted', staged: false, unstaged: true });
      seen.add(f);
    }
  }
  return {
    currentBranch: s.current || 'HEAD (detached)',
    ahead: s.ahead,
    behind: s.behind,
    staged,
    unstaged
  };
}

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/;

export function parseUnifiedDiff(diffText: string, filePath: string): FileDiff {
  const hunks: DiffHunk[] = [];
  let cur: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;
  let insertions = 0;
  let deletions = 0;

  for (const line of diffText.split('\n')) {
    const m = line.match(HUNK_RE);
    if (m) {
      cur = {
        header: line,
        oldStart: parseInt(m[1], 10),
        oldLines: m[2] ? parseInt(m[2], 10) : 1,
        newStart: parseInt(m[3], 10),
        newLines: m[4] ? parseInt(m[4], 10) : 1,
        lines: []
      };
      hunks.push(cur);
      oldNo = cur.oldStart;
      newNo = cur.newStart;
      continue;
    }
    if (!cur) continue;
    if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ') ||
      line.startsWith('old mode') ||
      line.startsWith('new mode') ||
      line.startsWith('similarity index') ||
      line.startsWith('rename ')
    ) {
      continue;
    }
    if (line.startsWith('\\')) continue; // "\ No newline at end of file"
    if (line.startsWith('+')) {
      cur.lines.push({ kind: 'add', oldNo: null, newNo: newNo++, content: line.slice(1) });
      insertions++;
    } else if (line.startsWith('-')) {
      cur.lines.push({ kind: 'del', oldNo: oldNo++, newNo: null, content: line.slice(1) });
      deletions++;
    } else if (line.startsWith(' ') || line === '') {
      cur.lines.push({ kind: 'context', oldNo: oldNo++, newNo: newNo++, content: line.slice(1) });
    }
  }
  return { path: filePath, hunks, insertions, deletions };
}
