import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  Upload,
  GitBranch,
  Archive,
  ArrowUpFromLine,
  SquareTerminal,
  MoreHorizontal,
  Search,
  ChevronDown,
  FolderOpen,
  GitMerge,
  History
} from 'lucide-react';
import { useApp, WIP_HASH } from '../../store';
import { Dropdown, MenuItem, MenuDivider } from '../ui/Dropdown';
import { api } from '../../lib/api';

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  title
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      className="flex flex-col items-center gap-0.5 px-2 py-1 rounded text-dim hover:text-fg hover:bg-panel2 disabled:opacity-35 disabled:pointer-events-none"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
    >
      <span className="text-fg/90">{icon}</span>
      <span className="text-[10px] leading-none">{label}</span>
    </button>
  );
}

export function Toolbar() {
  const { activeTab, status, log, runAndRefresh, notify, openRepoDialog } = useApp();
  const [branchQuery, setBranchQuery] = useState('');
  const branch = status?.currentBranch ?? '';
  const ahead = status?.ahead ?? 0;
  const behind = status?.behind ?? 0;
  const hasRepo = !!activeTab;
  const tabName = useApp.getState().tabs.find((t) => t.path === activeTab)?.name || 'No repo';

  const act = (fn: () => Promise<unknown>, msg?: string) => () => void runAndRefresh(fn, msg);

  return (
    <div className="flex items-center bg-panel border-b border-edge px-2 py-1 gap-2 shrink-0">
      {/* Repository dropdown */}
      <Dropdown
        trigger={
          <button className="btn gap-2 max-w-52" title="Switch repository">
            <FolderOpen size={13} className="text-accent shrink-0" />
            <span className="truncate">{tabName}</span>
            <ChevronDown size={12} className="text-dim" />
          </button>
        }
        width={280}
      >
        {(close) => (
          <>
            <MenuItem
              icon={<FolderOpen size={14} />}
              label="Open Repository…"
              onClick={() => {
                close();
                void openRepoDialog();
              }}
            />
            <MenuDivider />
            {useApp.getState().recentRepos.map((r) => (
              <MenuItem
                key={r}
                label={r.split('/').pop() || r}
                trailing={r}
                onClick={() => {
                  close();
                  void useApp.getState().openRepo(r);
                }}
              />
            ))}
          </>
        )}
      </Dropdown>

      {/* Branch dropdown */}
      <Dropdown
        trigger={
          <button className="btn gap-2 max-w-48" title="Switch branch" disabled={!hasRepo}>
            <GitBranch size={13} className="text-accent shrink-0" />
            <span className="truncate">{branch || '—'}</span>
            {ahead > 0 && <span className="text-xs text-dim">↑{ahead}</span>}
            {behind > 0 && <span className="text-xs text-dim">↓{behind}</span>}
            <ChevronDown size={12} className="text-dim" />
          </button>
        }
        width={280}
      >
        {(close) => {
          const { branches } = useApp.getState();
          const q = branchQuery.toLowerCase();
          return (
            <>
              <div className="px-3 pb-1.5">
                <input
                  placeholder="Filter branches…"
                  value={branchQuery}
                  onChange={(e) => setBranchQuery(e.target.value)}
                  className="w-full text-xs"
                  autoFocus
                />
              </div>
              {branches.local
                .filter((b) => b.name.toLowerCase().includes(q))
                .map((b) => (
                  <MenuItem
                    key={b.fullName}
                    icon={<GitBranch size={13} className={b.isCurrent ? 'text-accent' : 'text-dim'} />}
                    label={
                      <span className={b.isCurrent ? 'text-accent font-medium' : ''}>
                        {b.name}
                        {b.tracking ? <span className="text-faint text-xs"> · {b.tracking}</span> : null}
                      </span>
                    }
                    onClick={() => {
                      close();
                      if (!b.isCurrent) void runAndRefresh(() => api.checkoutBranch(b.fullName), `Checked out ${b.name}`);
                    }}
                    trailing={b.isCurrent ? '✓' : undefined}
                  />
                ))}
            </>
          );
        }}
      </Dropdown>

      <div className="w-px h-7 bg-edge mx-1" />
      <div className="flex-1 flex items-center justify-center gap-1">
        <ActionButton
          icon={<Download size={15} />}
          label="Pull"
          disabled={!hasRepo || behind === 0}
          onClick={act(() => api.pull(), 'Pulled from remote')}
          title={behind === 0 ? 'Nothing to pull' : 'Pull'}
        />
        <ActionButton
          icon={<Upload size={15} />}
          label="Push"
          disabled={!hasRepo || ahead === 0}
          onClick={act(() => api.push(), 'Pushed to remote')}
          title={ahead === 0 ? 'Nothing to push' : `Push (${ahead})`}
        />
        <BranchMenu />
        <ActionButton
          icon={<Archive size={15} />}
          label="Stash"
          disabled={!hasRepo}
          onClick={act(() => api.stash(), 'Changes stashed')}
          title="Stash changes"
        />
        <ActionButton
          icon={<ArrowUpFromLine size={15} />}
          label="Pop"
          disabled={!hasRepo || useApp.getState().stashes.length === 0}
          onClick={act(() => api.stashPop(), 'Stash popped')}
          title="Pop stash"
        />
        <ActionButton
          icon={<SquareTerminal size={15} />}
          label="Terminal"
          disabled={!hasRepo}
          onClick={() => void api.openTerminal()}
          title="Open terminal at repo root"
        />
      </div>

      <div className="flex-1" />

      {/* Actions menu */}
      <Dropdown
        align="right"
        trigger={
          <button className="btn-icon" title="Actions">
            <MoreHorizontal size={16} />
          </button>
        }
        width={230}
      >
        {(close) => (
          <>
            <MenuItem
              icon={<Download size={14} />}
              label="Fetch"
              onClick={() => {
                close();
                void runAndRefresh(() => api.fetch(), 'Fetched');
              }}
            />
            <MenuItem
              icon={<GitMerge size={14} />}
              label="Merge into current branch…"
              onClick={() => {
                close();
                notify('info', 'Use a branch context menu to merge into the current branch');
              }}
            />
            <MenuItem
              icon={<History size={14} />}
              label="Refresh"
              onClick={() => {
                close();
                void useApp.getState().refresh();
              }}
            />
          </>
        )}
      </Dropdown>

      <SearchBox />
    </div>
  );
}

function BranchMenu() {
  const { runAndRefresh } = useApp();
  const [name, setName] = useState('');
  return (
    <Dropdown
      trigger={
        <button className="flex flex-col items-center gap-0.5 px-2 py-1 rounded text-dim hover:text-fg hover:bg-panel2" title="Create branch">
          <span className="text-fg/90">
            <GitBranch size={15} />
          </span>
          <span className="text-[10px] leading-none">Branch</span>
        </button>
      }
      width={280}
    >
      {(close) => (
        <form
          className="px-3 py-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            close();
            void runAndRefresh(() => api.createBranch(name.trim()), `Created ${name.trim()}`);
            setName('');
          }}
        >
          <div className="text-xs text-dim mb-1.5">
            Create new branch from {useApp.getState().status?.currentBranch || 'HEAD'}
          </div>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Branch name" className="w-full text-xs" />
        </form>
      )}
    </Dropdown>
  );
}

function SearchBox() {
  const filter = useApp((s) => s.filter);
  const setFilter = useApp((s) => s.setFilter);
  return (
    <div className="relative">
      <Search size={13} className="absolute left-2 top-1.5 text-faint" />
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search commits…"
        className="w-44 text-xs pl-7"
      />
    </div>
  );
}
