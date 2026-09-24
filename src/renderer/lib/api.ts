import type { Api } from '../../preload/index';
import type { StrataGitApi } from '../../shared/types';

// In browser preview environments where Electron preload is not injected,
// provide realistic mock data so UI development, testing, and screenshots work seamlessly.
const createMockApi = (): Api & StrataGitApi => {
  const activeRepo = '/var/www/git-gui';
  const recent = ['/var/www/git-gui', '/home/projects/web-platform', '/home/projects/mobile-core'];

  const mockCommits = [
    {
      hash: 'a1b2c3d4e5f67890123456789abcdef012345678',
      shortHash: 'a1b2c3d',
      parents: ['b2c3d4e5f67890123456789abcdef0123456789'],
      message: 'feat: add Command Palette and bottom embedded Terminal drawer (Cat 4)',
      body: 'Implemented Cmd+K launcher and expandable terminal runner.',
      authorName: 'Developer',
      authorEmail: 'dev@stratagit.local',
      date: new Date().toISOString(),
      refs: [
        { label: 'main', kind: 'branch', isCurrent: true, isRemote: false },
        { label: 'origin/main', kind: 'branch', isCurrent: false, isRemote: true },
        { label: 'v1.0.0', kind: 'tag', isCurrent: false, isRemote: false }
      ],
      lanes: [0],
      lane: 0
    },
    {
      hash: 'b2c3d4e5f67890123456789abcdef0123456789',
      shortHash: 'b2c3d4e',
      parents: ['c3d4e5f67890123456789abcdef01234567890'],
      message: 'feat: implement Git Objects management for Tags, Remotes, Submodules (Cat 3)',
      body: '',
      authorName: 'Developer',
      authorEmail: 'dev@stratagit.local',
      date: new Date(Date.now() - 3600000).toISOString(),
      refs: [{ label: 'v0.9.0', kind: 'tag', isCurrent: false, isRemote: false }],
      lanes: [0],
      lane: 0
    },
    {
      hash: 'c3d4e5f67890123456789abcdef01234567890',
      shortHash: 'c3d4e5f',
      parents: ['d4e5f67890123456789abcdef012345678901'],
      message: 'feat: add Visual Merge Conflict Resolver and Interactive Rebase (Cat 2)',
      body: '',
      authorName: 'Developer',
      authorEmail: 'dev@stratagit.local',
      date: new Date(Date.now() - 7200000).toISOString(),
      refs: [{ label: 'feature/conflict-ui', kind: 'branch', isCurrent: false, isRemote: false }],
      lanes: [0, 1],
      lane: 1
    },
    {
      hash: 'd4e5f67890123456789abcdef012345678901',
      shortHash: 'd4e5f67',
      parents: [],
      message: 'feat: side-by-side diff view with line-level staging and blame (Cat 1)',
      body: '',
      authorName: 'Developer',
      authorEmail: 'dev@stratagit.local',
      date: new Date(Date.now() - 86400000).toISOString(),
      refs: [],
      lanes: [0],
      lane: 0
    }
  ];

  const mock: Record<string, unknown> = {
    openRepo: async (p: string) => ({ ok: true, repo: { path: p, name: p.split('/').pop() || p } }),
    openRepoDialog: async () => ({ ok: true, repo: { path: activeRepo, name: 'stratagit' } }),
    recentRepos: async () => recent,
    removeRecentRepo: async () => ({ ok: true }),
    setActiveRepo: () => {},

    getStatus: async () => ({
      staged: [
        { path: 'src/renderer/components/CommandPalette/CommandPalette.tsx', status: 'added', staged: true, unstaged: false }
      ],
      unstaged: [
        { path: 'src/renderer/components/TerminalDrawer/TerminalDrawer.tsx', status: 'modified', staged: false, unstaged: true },
        { path: 'src/shared/types.ts', status: 'modified', staged: false, unstaged: true }
      ],
      currentBranch: 'main',
      ahead: 1,
      behind: 0
    }),

    getLog: async (limit = 300) => ({
      commits: mockCommits.slice(0, limit),
      totalCommits: mockCommits.length,
      hasMore: false,
      hasUncommittedChanges: true
    }),

    getBranches: async () => ({
      local: [
        { name: 'main', fullName: 'main', isCurrent: true, isRemote: false, tracking: 'origin/main' },
        { name: 'feature/conflict-ui', fullName: 'feature/conflict-ui', isCurrent: false, isRemote: false }
      ],
      remote: [
        { name: 'origin/main', fullName: 'origin/main', isCurrent: false, isRemote: true },
        { name: 'origin/feature/conflict-ui', fullName: 'origin/feature/conflict-ui', isCurrent: false, isRemote: true }
      ]
    }),

    getStashes: async () => [
      { index: 0, message: 'WIP on main: preliminary tests', date: new Date().toISOString() }
    ],

    getTags: async () => [
      { name: 'v1.0.0', hash: 'a1b2c3d4e5f67890123456789abcdef012345678', shortHash: 'a1b2c3d', message: 'Release 1.0.0' },
      { name: 'v0.9.0', hash: 'b2c3d4e5f67890123456789abcdef0123456789', shortHash: 'b2c3d4e', message: 'Beta release' }
    ],

    createTag: async () => ({ ok: true }),
    deleteTag: async () => ({ ok: true }),
    pushTag: async () => ({ ok: true }),

    getRemotes: async () => [
      { name: 'origin', fetchUrl: 'https://github.com/stratagit/stratagit.git', pushUrl: 'https://github.com/stratagit/stratagit.git' },
      { name: 'upstream', fetchUrl: 'git@github.com:core/upstream.git', pushUrl: 'git@github.com:core/upstream.git' }
    ],

    addRemote: async () => ({ ok: true }),
    renameRemote: async () => ({ ok: true }),
    setRemoteUrl: async () => ({ ok: true }),
    removeRemote: async () => ({ ok: true }),
    pruneRemote: async () => ({ ok: true }),

    getSubmodules: async () => [
      { name: 'core-engine', path: 'vendor/core-engine', hash: 'd4e5f67890123456789abcdef012345678901', isInitialized: true, isDirty: false, isOutOfSync: false }
    ],

    updateSubmodules: async () => ({ ok: true }),

    getWorktrees: async () => [
      { path: '/var/www/git-gui', hash: 'a1b2c3d', branch: 'main' },
      { path: '/var/www/git-gui-preview', hash: 'c3d4e5f', branch: 'feature/conflict-ui' }
    ],

    removeWorktree: async () => ({ ok: true }),

    getCommitDetail: async (hash: string) => ({
      hash,
      shortHash: hash.slice(0, 7),
      parents: ['b2c3d4e'],
      message: 'feat: add Command Palette and bottom embedded Terminal drawer (Cat 4)',
      body: 'Implemented Cmd+K launcher and expandable terminal runner.',
      authorName: 'Developer',
      authorEmail: 'dev@stratagit.local',
      date: new Date().toISOString(),
      files: [
        { path: 'src/renderer/components/CommandPalette/CommandPalette.tsx', status: 'added', insertions: 280, deletions: 0 },
        { path: 'src/renderer/components/TerminalDrawer/TerminalDrawer.tsx', status: 'added', insertions: 210, deletions: 0 }
      ],
      insertions: 490,
      deletions: 0
    }),

    getFileDiff: async (_hash: string, filePath: string) => ({
      isBinary: false,
      oldPath: filePath,
      newPath: filePath,
      insertions: 5,
      deletions: 2,
      hunks: [
        {
          header: '@@ -1,5 +1,8 @@',
          oldStart: 1,
          oldLines: 5,
          newStart: 1,
          newLines: 8,
          lines: [
            { kind: 'context', oldNo: 1, newNo: 1, content: ' import React from "react";' },
            { kind: 'del', oldNo: 2, newNo: null, content: '-// legacy diff view' },
            { kind: 'add', oldNo: null, newNo: 2, content: '+// advanced split & unified diff engine' },
            { kind: 'add', oldNo: null, newNo: 3, content: '+export const isEnabled = true;' },
            { kind: 'context', oldNo: 3, newNo: 4, content: ' export function DiffView() {' }
          ]
        }
      ]
    }),

    stageFiles: async () => ({}),
    unstageFiles: async () => ({}),
    stageAll: async () => ({}),
    unstageAll: async () => ({}),
    discardFile: async () => ({}),

    stageHunk: async () => ({ ok: true }),
    unstageHunk: async () => ({ ok: true }),
    discardHunk: async () => ({ ok: true }),
    stageLines: async () => ({ ok: true }),
    unstageLines: async () => ({ ok: true }),
    discardLines: async () => ({ ok: true }),
    revertHunk: async () => ({ ok: true }),

    commit: async () => ({ ok: true }),
    pull: async () => ({ ok: true }),
    push: async () => ({ ok: true }),
    fetch: async () => ({ ok: true }),
    mergeBranch: async () => ({ ok: true }),
    rebaseBranch: async () => ({ ok: true }),
    checkoutBranch: async () => ({ ok: true }),
    createBranch: async () => ({ ok: true }),
    deleteBranch: async () => ({ ok: true }),
    renameBranch: async () => ({ ok: true }),
    checkoutCommit: async () => ({ ok: true }),
    createWorktree: async () => ({ ok: true }),
    resetBranchTo: async () => ({ ok: true }),
    editCommitMessage: async () => ({ ok: true }),
    revertCommit: async () => ({ ok: true }),
    dropCommit: async () => ({ ok: true }),
    applyPatchCommit: async () => ({ ok: true }),
    moveCommitDown: async () => ({ ok: true }),
    setUpstream: async () => ({ ok: true }),
    pushSetUpstream: async () => ({ ok: true }),

    stash: async () => ({ ok: true }),
    stashPop: async () => ({ ok: true }),
    stashApply: async () => ({ ok: true }),
    stashDrop: async () => ({ ok: true }),

    blame: async () => 'sample porcelain blame',
    getBlame: async () => [
      { lineNo: 1, commitHash: 'a1b2c3d', shortHash: 'a1b2c3d', author: 'Developer', authorEmail: 'dev@stratagit.local', summary: 'feat', date: '2026-09-24', content: 'import React from "react";' },
      { lineNo: 2, commitHash: 'b2c3d4e', shortHash: 'b2c3d4e', author: 'Developer', authorEmail: 'dev@stratagit.local', summary: 'feat', date: '2026-09-24', content: 'import { useApp } from "../../store";' }
    ],
    getFileHistory: async () => [
      { hash: 'a1b2c3d', shortHash: 'a1b2c3d', authorName: 'Developer', date: new Date().toISOString(), summary: 'Initial commit' }
    ],

    getConflictFile: async (filePath: string) => ({
      filePath,
      hasConflicts: false,
      totalConflicts: 0,
      rawContent: '// sample file',
      sections: [{ type: 'common', lines: ['// resolved code'] }]
    }),
    resolveConflictFile: async () => ({ ok: true }),
    getRepoOperationState: async () => ({
      inProgress: false,
      operationType: 'none',
      conflictedFiles: [],
      currentStep: 0,
      totalSteps: 0
    }),
    abortOperation: async () => ({ ok: true }),
    continueOperation: async () => ({ ok: true }),
    cherryPick: async () => ({ ok: true }),

    getCommitsForRebase: async () => [
      { hash: 'a1b2c3d', shortHash: 'a1b2c3d', action: 'pick', summary: 'feat: add Command Palette' }
    ],
    executeInteractiveRebase: async () => ({ ok: true }),

    openTerminal: async () => ({ ok: true }),
    runCommand: async (cmd: string) => {
      if (cmd.includes('status')) {
        return {
          ok: true,
          stdout: '## main...origin/main [ahead 1]\n M src/renderer/components/TerminalDrawer/TerminalDrawer.tsx\n M src/shared/types.ts\nA  src/renderer/components/CommandPalette/CommandPalette.tsx\n',
          stderr: '',
          exitCode: 0
        };
      }
      if (cmd.includes('log')) {
        return {
          ok: true,
          stdout: 'a1b2c3d feat: add Command Palette and bottom embedded Terminal drawer (Cat 4)\nb2c3d4e feat: implement Git Objects management for Tags, Remotes, Submodules (Cat 3)\nc3d4e5f feat: add Visual Merge Conflict Resolver and Interactive Rebase (Cat 2)\nd4e5f67 feat: side-by-side diff view with line-level staging and blame (Cat 1)\n',
          stderr: '',
          exitCode: 0
        };
      }
      return {
        ok: true,
        stdout: `Executed: ${cmd}\nExit code: 0\n`,
        stderr: '',
        exitCode: 0
      };
    },
    openInEditor: async () => ({ ok: true }),

    minimizeWindow: async () => true,
    maximizeWindow: async () => true,
    closeWindow: async () => true,
    isWindowMaximized: async () => false,
    restartApp: async () => true
  };

  return mock as unknown as Api & StrataGitApi;
};

export const api = (typeof window !== 'undefined' && (window as unknown as { api?: Api & StrataGitApi }).api)
  ? (window as unknown as { api: Api & StrataGitApi }).api
  : createMockApi();

/** Unwrap the {__error} envelope produced by main-process handlers. */
export async function unwrap<T>(p: Promise<T>): Promise<T> {
  const res = await p;
  if (res && typeof res === 'object' && '__error' in (res as Record<string, unknown>)) {
    throw new Error(String((res as Record<string, unknown>)['__error']));
  }
  return res;
}
