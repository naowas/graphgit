// Shared types between main, preload and renderer processes.

export interface RepoSummary {
  path: string;
  name: string;
  currentBranch: string;
  headHash: string;
}

export type FileStatusKind = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted';

export interface GitFileStatus {
  path: string;
  status: FileStatusKind;
  staged: boolean;
  unstaged: boolean;
  renamedFrom?: string;
}

export interface GitStatus {
  currentBranch: string;
  ahead: number;
  behind: number;
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
}

export interface CommitRef {
  kind: 'branch' | 'tag' | 'head';
  label: string;
  isCurrent?: boolean;
  isRemote?: boolean;
  isTracking?: boolean;
}

export interface Commit {
  hash: string;
  shortHash: string;
  parents: string[];
  message: string;
  body: string;
  authorName: string;
  authorEmail: string;
  /** MD5 of the normalized author email — used for Gravatar avatars */
  avatarHash?: string;
  date: string;
  refs: CommitRef[];
  lanes: number[];
  lane: number;
  /** Per-parent lane routing for genuine merges (lane + return source) */
  pl2?: { lane: number; bottom: 'v' | 'curve'; returnFrom?: number }[];
}

export interface BranchInfo {
  name: string;
  fullName: string;
  isCurrent: boolean;
  isRemote: boolean;
  lastCommitDate?: string;
  tracking?: string;
}

export interface StashInfo {
  index: number;
  message: string;
  date: string;
}

export interface FileChange {
  path: string;
  status: FileStatusKind;
  insertions?: number;
  deletions?: number;
  renamedFrom?: string;
}

export interface CommitDetail {
  hash: string;
  shortHash: string;
  parents: string[];
  message: string;
  body: string;
  authorName: string;
  authorEmail: string;
  /** MD5 of the normalized author email — used for Gravatar avatars */
  avatarHash?: string;
  date: string;
  files: FileChange[];
  insertions: number;
  deletions: number;
}

export type DiffLineKind = 'add' | 'del' | 'context' | 'hunk';

export interface DiffLine {
  kind: DiffLineKind;
  oldNo: number | null;
  newNo: number | null;
  content: string;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface FileDiff {
  path: string;
  hunks: DiffHunk[];
  insertions: number;
  deletions: number;
}

export interface GraphResult {
  commits: Commit[];
  hasUncommittedChanges: boolean;
  totalCommits: number;
  hasMore?: boolean;
}

export interface DiffRange {
  hash: string;
  /** null means HEAD for worktree diffs */
  compareWith?: string | null;
  filePath?: string;
  /** diff between commit and its working directory (unstaged) */
  worktree?: boolean;
  staged?: boolean;
}

// IPC API exposed via contextBridge
export interface GraphGitApi {
  openRepo(path: string): Promise<{ ok: boolean; repo?: RepoSummary; error?: string }>;
  recentRepos(): Promise<string[]>;
  removeRecentRepo(path: string): Promise<void>;
  getStatus(): Promise<GitStatus | null>;
  getLog(limit?: number): Promise<GraphResult>;
  getBranches(): Promise<{ local: BranchInfo[]; remote: BranchInfo[] }>;
  getStashes(): Promise<StashInfo[]>;
  getCommitDetail(hash: string): Promise<CommitDetail | null>;
  getFileDiff(hash: string, filePath: string, opts?: { staged?: boolean; worktree?: boolean }): Promise<FileDiff | null>;
  stageFiles(paths: string[]): Promise<GitStatus>;
  unstageFiles(paths: string[]): Promise<GitStatus>;
  stageAll(): Promise<GitStatus>;
  unstageAll(): Promise<GitStatus>;
  discardFile(path: string): Promise<GitStatus>;
  commit(message: string): Promise<{ ok: boolean; error?: string }>;
  pull(): Promise<{ ok: boolean; error?: string }>;
  push(): Promise<{ ok: boolean; error?: string }>;
  fetch(): Promise<{ ok: boolean; error?: string }>;
  checkoutBranch(name: string): Promise<{ ok: boolean; error?: string }>;
  createBranch(name: string, atHash?: string): Promise<{ ok: boolean; error?: string }>;
  deleteBranch(name: string, opts?: { local?: boolean; remote?: boolean; force?: boolean }): Promise<{ ok: boolean; error?: string }>;
  renameBranch(name: string, newName: string): Promise<{ ok: boolean; error?: string }>;
  checkoutCommit(hash: string): Promise<{ ok: boolean; error?: string }>;
  createWorktree(hash: string, worktreePath: string): Promise<{ ok: boolean; error?: string }>;
  resetBranchTo(hash: string, mode: 'soft' | 'mixed' | 'hard'): Promise<{ ok: boolean; error?: string }>;
  editCommitMessage(hash: string, message: string): Promise<{ ok: boolean; error?: string }>;
  revertCommit(hash: string): Promise<{ ok: boolean; error?: string }>;
  dropCommit(hash: string): Promise<{ ok: boolean; error?: string }>;
  applyPatchCommit(hash: string): Promise<{ ok: boolean; error?: string }>;
  moveCommitDown(hash: string): Promise<{ ok: boolean; error?: string }>;
  setUpstream(branch: string, upstream: string): Promise<{ ok: boolean; error?: string }>;
  pushSetUpstream(branch: string): Promise<{ ok: boolean; error?: string }>;
  stash(message?: string): Promise<{ ok: boolean; error?: string }>;
  stashPop(index?: number): Promise<{ ok: boolean; error?: string }>;
  stashApply(index?: number): Promise<{ ok: boolean; error?: string }>;
  stashDrop(index?: number): Promise<{ ok: boolean; error?: string }>;
  revertHunk(hash: string, filePath: string, hunkIndex: number): Promise<{ ok: boolean; error?: string }>;
  blame(filePath: string): Promise<string>;
  openTerminal(): Promise<{ ok: boolean; error?: string }>;
  openInEditor(filePath: string): Promise<{ ok: boolean; error?: string }>;
  minimizeWindow(): Promise<boolean>;
  maximizeWindow(): Promise<boolean>;
  closeWindow(): Promise<boolean>;
  isWindowMaximized(): Promise<boolean>;
  onMaximizeChange?(cb: (isMax: boolean) => void): () => void;
  restartApp?(): Promise<boolean>;
}

export type ApiEvent = 'repo-updated';
