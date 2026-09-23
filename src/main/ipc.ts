import { app, ipcMain, dialog, shell, BrowserWindow } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  GraphGitApi,
  GitStatus,
  GraphResult,
  BranchInfo,
  StashInfo,
  CommitDetail,
  FileDiff
} from '../shared/types';
import { isValidRepo, errorMessage, withGit } from './git/core';
import { getLog, repoDisplayName } from './git/log';
import { getStatus } from './git/status-diff';
import { getCommitDetail, getFileDiff, getCommitDiffText } from './git/commit-detail';
import {
  getBranches,
  getStashes,
  checkoutBranch,
  createBranch,
  deleteBranch,
  renameBranch,
  stash as stashChanges,
  stashPop,
  stashApply,
  stashDrop,
  revertHunk
} from './git/branch-stash';
import {
  checkoutCommit,
  createBranchAt,
  createWorktree,
  resetBranchTo,
  editCommitMessage,
  revertCommit,
  dropCommit,
  applyPatchCommit,
  moveCommitDown,
  setUpstream,
  pushSetUpstream,
  deleteBranchEx
} from './git/history';

/** Recently opened repos persisted in the user config dir. */
const recentFile = () => path.join(os.homedir(), '.config', 'graphgit', 'recent-repos.json');

function readRecent(): string[] {
  try {
    return JSON.parse(fs.readFileSync(recentFile(), 'utf8'));
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  const dir = path.dirname(recentFile());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(recentFile(), JSON.stringify(list, null, 2));
}

export function registerIpc(getWin: () => BrowserWindow | null, getRepo: () => string | null) {
  type Handler = (...args: any[]) => Promise<unknown>;
  const handle = (channel: string, fn: Handler) => {
    ipcMain.handle(channel, async (_e, ...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        return { __error: errorMessage(err) };
      }
    });
  };

  const requireRepo = (): string => {
    const repo = getRepo();
    if (!repo || !isValidRepo(repo)) throw new Error('No repository open');
    return repo;
  };

  handle('repo:open-dialog', async () => {
    const win = getWin();
    if (!win) return { ok: false, error: 'no window' };
    const res = await dialog.showOpenDialog(win, {
      title: 'Open Repository',
      message: 'Select a git repository folder',
      properties: ['openDirectory']
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: false, error: 'canceled' };
    return openRepoPath(res.filePaths[0]);
  });

  handle('repo:open-path', async (p: string) => openRepoPath(p));

  async function openRepoPath(p: string) {
    const abs = path.resolve(p);
    if (!isValidRepo(abs)) return { ok: false, error: `${abs} is not a git repository` };
    const list = readRecent().filter((r) => r !== abs);
    list.unshift(abs);
    writeRecent(list.slice(0, 12));
    return {
      ok: true,
      repo: { path: abs, name: repoDisplayName(abs), currentBranch: '', headHash: '' }
    };
  }

  handle('repo:recent', async () => readRecent());
  handle('repo:remove-recent', async (p: string) => {
    writeRecent(readRecent().filter((r) => r !== p));
  });

  handle('git:status', async (): Promise<GitStatus> => getStatus(requireRepo()));
  handle('git:log', async (limit?: number): Promise<GraphResult> => {
    const repo = requireRepo();
    const st = await getStatus(repo).catch(() => null);
    return getLog(repo, st, limit ?? 300);
  });
  handle('git:branches', async () => getBranches(requireRepo()));
  handle('git:stashes', async (): Promise<StashInfo[]> => getStashes(requireRepo()));
  handle('git:commit-detail', async (hash: string): Promise<CommitDetail | null> =>
    getCommitDetail(requireRepo(), hash)
  );
  handle(
    'git:file-diff',
    async (hash: string, filePath: string, opts?: { staged?: boolean; worktree?: boolean }): Promise<FileDiff | null> =>
      getFileDiff(requireRepo(), hash, filePath, opts)
  );

  const mutate = async (fn: () => Promise<unknown>) => {
    await fn();
    return getStatus(requireRepo());
  };

  handle('git:stage', async (paths: string[]) =>
    mutate(() => withGit(requireRepo(), (g) => g.add(paths)))
  );
  handle('git:unstage', async (paths: string[]) =>
    mutate(() => withGit(requireRepo(), (g) => g.reset(['HEAD', '--', ...paths])))
  );
  handle('git:stage-all', async () => mutate(() => withGit(requireRepo(), (g) => g.add('-A'))));
  handle('git:unstage-all', async () => mutate(() => withGit(requireRepo(), (g) => g.reset(['HEAD']))));
  handle('git:discard', async (p: string) =>
    mutate(() => withGit(requireRepo(), (g) => g.checkout(['--', p])))
  );
  handle('git:commit', async (message: string) => {
    await withGit(requireRepo(), (g) => g.commit(message));
    return { ok: true };
  });

  handle('git:pull', async () => {
    await withGit(requireRepo(), (g) => g.pull());
    return { ok: true };
  });
  handle('git:push', async () => {
    await withGit(requireRepo(), (g) => g.push());
    return { ok: true };
  });
  handle('git:fetch', async () => {
    await withGit(requireRepo(), (g) => g.fetch());
    return { ok: true };
  });

  handle('git:checkout', async (name: string) => {
    await checkoutBranch(requireRepo(), name);
    return { ok: true };
  });
  handle('git:branch-create', async (name: string, atHash?: string) => {
    if (atHash) await createBranchAt(requireRepo(), name, atHash);
    else await createBranch(requireRepo(), name);
    return { ok: true };
  });
  handle('git:branch-delete', async (name: string, opts?: { local?: boolean; remote?: boolean; force?: boolean }) => {
    await deleteBranchEx(requireRepo(), name, { local: true, ...opts });
    return { ok: true };
  });
  handle('git:checkout-commit', async (hash: string) => {
    await checkoutCommit(requireRepo(), hash);
    return { ok: true };
  });
  handle('git:worktree-create', async (hash: string, worktreePath: string) => {
    await createWorktree(requireRepo(), worktreePath, hash);
    return { ok: true };
  });
  handle('git:reset-branch', async (hash: string, mode: 'soft' | 'mixed' | 'hard') => {
    await resetBranchTo(requireRepo(), hash, mode);
    return { ok: true };
  });
  handle('git:edit-commit-message', async (hash: string, message: string) => {
    await editCommitMessage(requireRepo(), hash, message);
    return { ok: true };
  });
  handle('git:revert-commit', async (hash: string) => {
    await revertCommit(requireRepo(), hash);
    return { ok: true };
  });
  handle('git:drop-commit', async (hash: string) => {
    await dropCommit(requireRepo(), hash);
    return { ok: true };
  });
  handle('git:apply-patch', async (hash: string) => {
    await applyPatchCommit(requireRepo(), hash);
    return { ok: true };
  });
  handle('git:move-commit-down', async (hash: string) => {
    await moveCommitDown(requireRepo(), hash);
    return { ok: true };
  });
  handle('git:set-upstream', async (branch: string, upstream: string) => {
    await setUpstream(requireRepo(), branch, upstream);
    return { ok: true };
  });
  handle('git:push-set-upstream', async (branch: string) => {
    await pushSetUpstream(requireRepo(), branch);
    return { ok: true };
  });
  handle('git:branch-rename', async (name: string, newName: string) => {
    await renameBranch(requireRepo(), name, newName);
    return { ok: true };
  });

  handle('git:stash', async (message?: string) => {
    await stashChanges(requireRepo(), message);
    return { ok: true };
  });
  handle('git:stash-pop', async (index?: number) => {
    await stashPop(requireRepo(), index);
    return { ok: true };
  });
  handle('git:stash-apply', async (index?: number) => {
    await stashApply(requireRepo(), index);
    return { ok: true };
  });
  handle('git:stash-drop', async (index?: number) => {
    await stashDrop(requireRepo(), index);
    return { ok: true };
  });

  handle('git:revert-hunk', async (hash: string, filePath: string, hunkIndex: number) => {
    const repo = requireRepo();
    const diffText = await getCommitDiffText(repo, hash, filePath);
    await revertHunk(repo, diffText, hunkIndex);
    return { ok: true };
  });

  handle('git:blame', async (filePath: string) => {
    return withGit(requireRepo(), (g) => g.raw(['blame', '--date=short', '--', filePath]));
  });
  handle('git:file-history', async (filePath: string) => {
    return withGit(requireRepo(), (g) =>
      g.log(['--pretty=format:%h%x09%s%x09%an', '--', filePath])
    );
  });

  handle('app:open-terminal', async () => {
    const repo = requireRepo();
    const plat = process.platform;
    try {
      if (plat === 'darwin') {
        spawn('open', ['-a', 'Terminal', repo], { detached: true, stdio: 'ignore' }).unref();
      } else {
        // Linux: try common terminals in order
        for (const term of [
          { cmd: 'x-terminal-emulator', args: ['--working-directory', repo] },
          { cmd: 'gnome-terminal', args: ['--working-directory', repo] },
          { cmd: 'konsole', args: ['--workdir', repo] },
          { cmd: 'xfce4-terminal', args: ['--working-directory', repo] },
          { cmd: 'xterm', args: ['-e', `cd ${JSON.stringify(repo)} && exec ${process.env.SHELL || 'bash'}`] }
        ]) {
          if (fs.existsSync(`/usr/bin/${term.cmd}`) || fs.existsSync(`/usr/local/bin/${term.cmd}`)) {
            spawn(term.cmd, term.args, { detached: true, stdio: 'ignore' }).unref();
            return { ok: true };
          }
        }
        return { ok: false, error: 'No supported terminal emulator found' };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  });

  handle('app:open-in-editor', async (filePath: string) => {
    const repo = requireRepo();
    const abs = path.isAbsolute(filePath) ? filePath : path.join(repo, filePath);
    if (!fs.existsSync(abs)) return { ok: false, error: 'File not found on disk' };
    await shell.openPath(abs);
    return { ok: true };
  });

  handle('app:reveal-in-folder', async (filePath: string) => {
    const repo = requireRepo();
    const abs = path.isAbsolute(filePath) ? filePath : path.join(repo, filePath);
    shell.showItemInFolder(abs);
    return { ok: true };
  });

  handle('window:minimize', async () => {
    getWin()?.minimize();
    return true;
  });

  handle('window:maximize', async () => {
    const win = getWin();
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    return win.isMaximized();
  });

  handle('window:close', async () => {
    getWin()?.close();
    return true;
  });

  handle('window:is-maximized', async () => {
    return getWin()?.isMaximized() ?? false;
  });

  handle('app:restart', async () => {
    app.relaunch();
    app.exit(0);
    return true;
  });
}
