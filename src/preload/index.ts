import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const call = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args) as Promise<T>;

export type Api = {
  openRepo(path: string): Promise<{ ok: boolean; repo?: { path: string; name: string }; error?: string }>;
  openRepoDialog(): Promise<{ ok: boolean; repo?: { path: string; name: string }; error?: string }>;
  recentRepos(): Promise<string[]>;
  removeRecentRepo(path: string): Promise<void>;
  getStatus(): Promise<import('../shared/types').GitStatus>;
  getLog(limit?: number): Promise<import('../shared/types').GraphResult>;
  getBranches(): Promise<{ local: import('../shared/types').BranchInfo[]; remote: import('../shared/types').BranchInfo[] }>;
  getStashes(): Promise<import('../shared/types').StashInfo[]>;
  getCommitDetail(hash: string): Promise<import('../shared/types').CommitDetail | null>;
  getFileDiff(
    hash: string,
    filePath: string,
    opts?: { staged?: boolean; worktree?: boolean }
  ): Promise<import('../shared/types').FileDiff | null>;
  stageFiles(paths: string[]): Promise<unknown>;
  unstageFiles(paths: string[]): Promise<unknown>;
  stageAll(): Promise<unknown>;
  unstageAll(): Promise<unknown>;
  discardFile(path: string): Promise<unknown>;
  commit(message: string): Promise<{ ok: boolean }>;
  pull(): Promise<{ ok: boolean }>;
  push(): Promise<{ ok: boolean }>;
  fetch(): Promise<{ ok: boolean }>;
  checkoutBranch(name: string): Promise<{ ok: boolean }>;
  createBranch(name: string, atHash?: string): Promise<{ ok: boolean }>;
  deleteBranch(name: string, opts?: { local?: boolean; remote?: boolean; force?: boolean }): Promise<{ ok: boolean }>;
  renameBranch(name: string, newName: string): Promise<{ ok: boolean }>;
  checkoutCommit(hash: string): Promise<{ ok: boolean }>;
  createWorktree(hash: string, worktreePath: string): Promise<{ ok: boolean }>;
  resetBranchTo(hash: string, mode: 'soft' | 'mixed' | 'hard'): Promise<{ ok: boolean }>;
  editCommitMessage(hash: string, message: string): Promise<{ ok: boolean }>;
  revertCommit(hash: string): Promise<{ ok: boolean }>;
  dropCommit(hash: string): Promise<{ ok: boolean }>;
  applyPatchCommit(hash: string): Promise<{ ok: boolean }>;
  moveCommitDown(hash: string): Promise<{ ok: boolean }>;
  setUpstream(branch: string, upstream: string): Promise<{ ok: boolean }>;
  pushSetUpstream(branch: string): Promise<{ ok: boolean }>;
  stash(message?: string): Promise<{ ok: boolean }>;
  stashPop(index?: number): Promise<{ ok: boolean }>;
  stashApply(index?: number): Promise<{ ok: boolean }>;
  stashDrop(index?: number): Promise<{ ok: boolean }>;
  revertHunk(hash: string, filePath: string, hunkIndex: number): Promise<{ ok: boolean }>;
  blame(filePath: string): Promise<string>;
  openTerminal(): Promise<{ ok: boolean; error?: string }>;
  openInEditor(filePath: string): Promise<{ ok: boolean; error?: string }>;
  setActiveRepo(path: string): void;
  minimizeWindow(): Promise<boolean>;
  maximizeWindow(): Promise<boolean>;
  closeWindow(): Promise<boolean>;
  isWindowMaximized(): Promise<boolean>;
  onMaximizeChange(cb: (isMax: boolean) => void): () => void;
  restartApp(): Promise<boolean>;
};

const api: Api = {
  openRepo: (path) => call('repo:open-path', path),
  openRepoDialog: () => call('repo:open-dialog'),
  recentRepos: () => call('repo:recent'),
  removeRecentRepo: (path) => call('repo:remove-recent', path),
  getStatus: () => call('git:status'),
  getLog: (limit) => call('git:log', limit),
  getBranches: () => call('git:branches'),
  getStashes: () => call('git:stashes'),
  getCommitDetail: (hash) => call('git:commit-detail', hash),
  getFileDiff: (hash, filePath, opts) => call('git:file-diff', hash, filePath, opts),
  stageFiles: (paths) => call('git:stage', paths),
  unstageFiles: (paths) => call('git:unstage', paths),
  stageAll: () => call('git:stage-all'),
  unstageAll: () => call('git:unstage-all'),
  discardFile: (path) => call('git:discard', path),
  commit: (message) => call('git:commit', message),
  pull: () => call('git:pull'),
  push: () => call('git:push'),
  fetch: () => call('git:fetch'),
  checkoutBranch: (name) => call('git:checkout', name),
  createBranch: (name, atHash) => call('git:branch-create', name, atHash),
  deleteBranch: (name, opts) => call('git:branch-delete', name, opts),
  renameBranch: (name, newName) => call('git:branch-rename', name, newName),
  checkoutCommit: (hash) => call('git:checkout-commit', hash),
  createWorktree: (hash, worktreePath) => call('git:worktree-create', hash, worktreePath),
  resetBranchTo: (hash, mode) => call('git:reset-branch', hash, mode),
  editCommitMessage: (hash, message) => call('git:edit-commit-message', hash, message),
  revertCommit: (hash) => call('git:revert-commit', hash),
  dropCommit: (hash) => call('git:drop-commit', hash),
  applyPatchCommit: (hash) => call('git:apply-patch', hash),
  moveCommitDown: (hash) => call('git:move-commit-down', hash),
  setUpstream: (branch, upstream) => call('git:set-upstream', branch, upstream),
  pushSetUpstream: (branch) => call('git:push-set-upstream', branch),
  stash: (message) => call('git:stash', message),
  stashPop: (index) => call('git:stash-pop', index),
  stashApply: (index) => call('git:stash-apply', index),
  stashDrop: (index) => call('git:stash-drop', index),
  revertHunk: (hash, filePath, hunkIndex) => call('git:revert-hunk', hash, filePath, hunkIndex),
  blame: (filePath) => call('git:blame', filePath),
  openTerminal: () => call('app:open-terminal'),
  openInEditor: (filePath) => call('app:open-in-editor', filePath),
  setActiveRepo: (path: string) => ipcRenderer.send('repo:set-active', path),
  minimizeWindow: () => call('window:minimize'),
  maximizeWindow: () => call('window:maximize'),
  closeWindow: () => call('window:close'),
  isWindowMaximized: () => call('window:is-maximized'),
  onMaximizeChange: (cb: (isMax: boolean) => void) => {
    const handler = (_e: IpcRendererEvent, isMax: boolean) => cb(isMax);
    ipcRenderer.on('window:maximize-change', handler);
    return () => {
      ipcRenderer.removeListener('window:maximize-change', handler);
    };
  },
  restartApp: () => call('app:restart')
};

contextBridge.exposeInMainWorld('api', api);
