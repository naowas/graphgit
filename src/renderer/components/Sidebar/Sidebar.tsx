import React, { useState } from 'react';
import {
  List as ListIcon,
  Bot,
  GitBranch,
  Archive,
  Trash2,
  Play,
  UploadCloud,
  Users,
  CircleDot,
  Cloud,
  ChevronDown,
  ChevronRight,
  Copy,
  Pencil,
  GitMerge,
  ArrowUpFromLine,
  ArrowDownToLine,
  ArrowUp,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../store';
import { api } from '../../lib/api';
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu';
import { BranchInfo, StashInfo } from '../../../shared/types';

function Section({
  title,
  count,
  children,
  defaultOpen = true,
  onContextMenu
}: {
  title: string;
  count: number;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-edge/60">
      <button
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wide text-dim hover:text-fg select-none"
        onClick={() => setOpen((o) => !o)}
        onContextMenu={onContextMenu}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="flex-1 text-left">{title}</span>
        <span className="rounded bg-panel3 px-1.5 text-[10px] text-dim">{count}</span>
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  );
}

function BranchRow({
  name,
  current,
  tracking,
  remote,
  onClick,
  onContextMenu
}: {
  name: string;
  current?: boolean;
  tracking?: string;
  remote?: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      className={`group flex w-full items-center gap-2 px-3 py-1 text-sm text-left hover:bg-panel2 select-none ${
        current ? 'text-accent font-medium' : 'text-fg/90'
      }`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={tracking ? `${name} → ${tracking} (Right click for actions)` : `${name} (Right click for actions)`}
    >
      <GitBranch
        size={12}
        className={`shrink-0 ${current ? 'text-accent' : 'text-faint'}`}
        style={{ transform: remote ? 'rotate(90deg)' : undefined }}
      />
      <span className="truncate flex-1">{name}</span>
      {current && <span className="text-accent text-xs">✓</span>}
    </button>
  );
}

function StashRow({
  stash,
  onContextMenu
}: {
  stash: StashInfo;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const { runAndRefresh } = useApp();
  const { index, message } = stash;

  return (
    <div
      className="group flex items-center gap-2 px-3 py-1 text-sm text-fg/90 hover:bg-panel2 select-none cursor-pointer"
      title={`${message} (Right click for options)`}
      onContextMenu={onContextMenu}
    >
      <Archive size={12} className="text-faint shrink-0" />
      <span className="truncate flex-1 text-xs">
        #{index} {message}
      </span>
      <span className="hidden group-hover:flex gap-0.5">
        <button
          className="btn-icon !w-5 !h-5"
          title="Pop stash"
          onClick={(e) => {
            e.stopPropagation();
            void runAndRefresh(() => api.stashPop(index), `Popped stash #${index}`);
          }}
        >
          <Play size={11} />
        </button>
        <button
          className="btn-icon !w-5 !h-5"
          title="Apply stash (keep entry)"
          onClick={(e) => {
            e.stopPropagation();
            void runAndRefresh(() => api.stashApply(index), `Applied stash #${index}`);
          }}
        >
          <UploadCloud size={11} />
        </button>
        <button
          className="btn-icon !w-5 !h-5 hover:!text-del"
          title="Drop stash"
          onClick={(e) => {
            e.stopPropagation();
            void runAndRefresh(() => api.stashDrop(index), `Dropped stash #${index}`);
          }}
        >
          <Trash2 size={11} />
        </button>
      </span>
    </div>
  );
}

const STUB_SECTIONS: { title: string; icon: React.ReactNode }[] = [
  { title: 'CLOUD PATCHES', icon: <Cloud size={12} /> },
  { title: 'PULL REQUESTS', icon: <UploadCloud size={12} /> },
  { title: 'ISSUES', icon: <CircleDot size={12} /> },
  { title: 'TEAMS', icon: <Users size={12} /> }
];

export function Sidebar() {
  const visible = useApp((s) => s.sidebarVisible);
  const width = useApp((s) => s.sidebarWidth);
  const branches = useApp((s) => s.branches);
  const stashes = useApp((s) => s.stashes);
  const filter = useApp((s) => s.filter);
  const status = useApp((s) => s.status);
  const activeTab = useApp((s) => s.activeTab);

  if (!visible) {
    return (
      <div className="w-10 bg-panel border-r border-edge flex flex-col items-center py-2 shrink-0">
        <button className="btn-icon" title="Show sidebar" onClick={() => useApp.setState({ sidebarVisible: true })}>
          <ListIcon size={15} />
        </button>
      </div>
    );
  }

  return (
    <SidebarFull
      width={width}
      branches={branches}
      stashes={stashes}
      filter={filter}
      status={status}
      activeTab={activeTab}
    />
  );
}

function SidebarFull({
  width,
  branches,
  stashes,
  filter,
  status,
  activeTab
}: {
  width: number;
  branches: ReturnType<typeof useApp.getState>['branches'];
  stashes: ReturnType<typeof useApp.getState>['stashes'];
  filter: string;
  status: ReturnType<typeof useApp.getState>['status'];
  activeTab: string | null;
}) {
  const q = filter.toLowerCase();
  const locals = [...new Map(branches.local.map((b) => [b.fullName, b] as const)).values()].filter((b) =>
    b.name.toLowerCase().includes(q)
  );
  const remotes = [...new Map(branches.remote.map((b) => [b.fullName, b] as const)).values()].filter((b) =>
    b.fullName.toLowerCase().includes(q)
  );

  const runAndRefresh = useApp((s) => s.runAndRefresh);
  const notify = useApp((s) => s.notify);
  const setFilter = useApp((s) => s.setFilter);
  const setSidebarWidth = useApp((s) => s.setSidebarWidth);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const currentBranchName = status?.currentBranch || 'HEAD';

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: MouseEvent) => setSidebarWidth(startW + ev.clientX - startX);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Local Branch Context Menu
  const handleLocalBranchContextMenu = (e: React.MouseEvent, b: BranchInfo) => {
    e.preventDefault();
    e.stopPropagation();
    const isCurrent = b.isCurrent;

    const items: ContextMenuItem[] = [
      {
        label: `Checkout "${b.name}"`,
        icon: <GitBranch size={13} />,
        disabled: isCurrent,
        onClick: () => {
          void runAndRefresh(() => api.checkoutBranch(b.fullName), `Checked out ${b.name}`);
        }
      },
      {
        label: `Create Branch from "${b.name}"…`,
        icon: <Plus size={13} />,
        prompt: {
          placeholder: 'New branch name',
          submitLabel: 'Create Branch',
          onSubmit: (newName) => {
            void runAndRefresh(() => api.createBranch(newName, b.fullName), `Created branch ${newName}`);
          }
        }
      },
      {
        label: `Rename "${b.name}"…`,
        icon: <Pencil size={13} />,
        prompt: {
          placeholder: 'New branch name',
          initial: b.name,
          submitLabel: 'Rename',
          onSubmit: (newName) => {
            void runAndRefresh(() => api.renameBranch(b.name, newName), `Renamed branch to ${newName}`);
          }
        }
      },
      {
        label: `Merge "${b.name}" into "${currentBranchName}"`,
        icon: <GitMerge size={13} />,
        disabled: isCurrent,
        onClick: () => {
          void runAndRefresh(() => api.mergeBranch(b.name), `Merged ${b.name} into ${currentBranchName}`);
        }
      },
      {
        label: `Push "${b.name}" to Origin`,
        icon: <ArrowUpFromLine size={13} />,
        onClick: () => {
          void runAndRefresh(() => api.pushSetUpstream(b.name), `Pushed ${b.name} to origin`);
        }
      },
      {
        label: 'Set Upstream…',
        icon: <ArrowUp size={13} />,
        prompt: {
          placeholder: `e.g. origin/${b.name}`,
          initial: b.tracking || `origin/${b.name}`,
          submitLabel: 'Set Upstream',
          onSubmit: (upstream) => {
            void runAndRefresh(() => api.setUpstream(b.name, upstream), `Upstream set to ${upstream}`);
          }
        }
      },
      {
        label: 'Copy Branch Name',
        icon: <Copy size={13} />,
        onClick: () => {
          void navigator.clipboard.writeText(b.name);
          notify('success', `Copied "${b.name}" to clipboard`);
        }
      },
      { label: '', divider: true },
      {
        label: `Delete "${b.name}"`,
        icon: <Trash2 size={13} />,
        danger: true,
        disabled: isCurrent,
        onClick: () => {
          void runAndRefresh(() => api.deleteBranch(b.name, { local: true }), `Deleted branch ${b.name}`);
        }
      },
      {
        label: `Force Delete "${b.name}"`,
        icon: <Trash2 size={13} />,
        danger: true,
        disabled: isCurrent,
        onClick: () => {
          void runAndRefresh(() => api.deleteBranch(b.name, { local: true, force: true }), `Force deleted branch ${b.name}`);
        }
      }
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  // Remote Branch Context Menu
  const handleRemoteBranchContextMenu = (e: React.MouseEvent, b: BranchInfo) => {
    e.preventDefault();
    e.stopPropagation();
    const parts = b.fullName.split('/');
    const remoteName = parts[0] || 'origin';
    const remoteShort = parts.slice(1).join('/');

    const items: ContextMenuItem[] = [
      {
        label: `Checkout "${remoteShort}" as local branch`,
        icon: <GitBranch size={13} />,
        onClick: () => {
          void runAndRefresh(() => api.checkoutBranch(remoteShort), `Checked out ${remoteShort}`);
        }
      },
      {
        label: `Pull "${b.fullName}" into "${currentBranchName}"`,
        icon: <ArrowDownToLine size={13} />,
        onClick: () => {
          void runAndRefresh(() => api.pull(), `Pulled from remote`);
        }
      },
      {
        label: `Merge "${b.fullName}" into "${currentBranchName}"`,
        icon: <GitMerge size={13} />,
        onClick: () => {
          void runAndRefresh(() => api.mergeBranch(b.fullName), `Merged ${b.fullName} into ${currentBranchName}`);
        }
      },
      {
        label: 'Copy Remote Branch Ref',
        icon: <Copy size={13} />,
        onClick: () => {
          void navigator.clipboard.writeText(b.fullName);
          notify('success', `Copied "${b.fullName}" to clipboard`);
        }
      },
      { label: '', divider: true },
      {
        label: `Delete Remote Branch "${b.fullName}"`,
        icon: <Trash2 size={13} />,
        danger: true,
        onClick: () => {
          void runAndRefresh(
            () => api.deleteBranch(remoteShort, { remote: true, remoteName }),
            `Deleted remote branch ${b.fullName}`
          );
        }
      }
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  // Stash Context Menu
  const handleStashContextMenu = (e: React.MouseEvent, s: StashInfo) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        label: `Pop Stash #${s.index} (Apply & Delete)`,
        icon: <Play size={13} />,
        onClick: () => {
          void runAndRefresh(() => api.stashPop(s.index), `Popped stash #${s.index}`);
        }
      },
      {
        label: `Apply Stash #${s.index} (Keep Entry)`,
        icon: <UploadCloud size={13} />,
        onClick: () => {
          void runAndRefresh(() => api.stashApply(s.index), `Applied stash #${s.index}`);
        }
      },
      {
        label: 'Copy Stash Message',
        icon: <Copy size={13} />,
        onClick: () => {
          void navigator.clipboard.writeText(s.message);
          notify('success', 'Copied stash message');
        }
      },
      { label: '', divider: true },
      {
        label: `Drop Stash #${s.index} (Delete)`,
        icon: <Trash2 size={13} />,
        danger: true,
        onClick: () => {
          void runAndRefresh(() => api.stashDrop(s.index), `Dropped stash #${s.index}`);
        }
      }
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  // Section Header Context Menus
  const handleLocalSectionContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        label: 'Create New Branch…',
        icon: <Plus size={13} />,
        prompt: {
          placeholder: 'Branch name',
          submitLabel: 'Create',
          onSubmit: (name) => {
            void runAndRefresh(() => api.createBranch(name), `Created branch ${name}`);
          }
        }
      },
      {
        label: 'Fetch All Remotes',
        icon: <RefreshCw size={13} />,
        onClick: () => {
          void runAndRefresh(() => api.fetch(), 'Fetched from all remotes');
        }
      }
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleStashSectionContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        label: 'Stash Working Changes…',
        icon: <Archive size={13} />,
        prompt: {
          placeholder: 'Optional stash message',
          submitLabel: 'Stash',
          onSubmit: (msg) => {
            void runAndRefresh(() => api.stash(msg || undefined), 'Changes stashed');
          }
        }
      },
      {
        label: 'Pop Latest Stash',
        icon: <Play size={13} />,
        disabled: stashes.length === 0,
        onClick: () => {
          void runAndRefresh(() => api.stashPop(0), 'Popped latest stash');
        }
      }
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  return (
    <div className="relative flex flex-col bg-panel border-r border-edge shrink-0 min-h-0" style={{ width }}>
      {/* List / Agents toggle */}
      <div className="flex items-center gap-1 p-1.5 border-b border-edge">
        <div className="flex rounded bg-panel2 p-0.5 flex-1">
          <button className="flex-1 flex items-center justify-center gap-1 rounded bg-panel3 px-2 py-1 text-xs text-fg font-medium">
            <ListIcon size={12} /> List
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1 text-xs text-dim hover:text-fg"
            onClick={() => notify('info', 'Agents is a placeholder for a future feature')}
          >
            <Bot size={12} /> Agents
          </button>
        </div>
        <button className="btn-icon" title="Hide sidebar" onClick={() => useApp.setState({ sidebarVisible: false })}>
          <ListIcon size={14} />
        </button>
      </div>

      {/* Viewing N + filter */}
      <div className="p-1.5 border-b border-edge">
        <div className="mb-1">
          <span className="text-xs text-dim">Viewing {locals.length + remotes.length + stashes.length}</span>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter branches, stashes…"
          className="w-full text-xs"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <Section
          title="LOCAL"
          count={locals.length}
          onContextMenu={handleLocalSectionContextMenu}
        >
          {locals.map((b, i) => (
            <BranchRow
              key={`local:${b.fullName}:${i}`}
              name={b.name}
              current={b.isCurrent}
              tracking={b.tracking}
              onClick={() => {
                if (!b.isCurrent && activeTab) {
                  void runAndRefresh(() => api.checkoutBranch(b.fullName), `Checked out ${b.name}`);
                }
              }}
              onContextMenu={(e) => handleLocalBranchContextMenu(e, b)}
            />
          ))}
        </Section>

        <Section title="REMOTE" count={remotes.length}>
          {remotes.map((b, i) => (
            <BranchRow
              key={`remote:${b.fullName}:${i}`}
              name={b.fullName}
              remote
              onClick={() => notify('info', `Remote branch: ${b.fullName} (Right click for actions)`)}
              onContextMenu={(e) => handleRemoteBranchContextMenu(e, b)}
            />
          ))}
        </Section>

        <Section
          title="STASHES"
          count={stashes.length}
          defaultOpen={stashes.length > 0}
          onContextMenu={handleStashSectionContextMenu}
        >
          {stashes.map((s) => (
            <StashRow
              key={s.index}
              stash={s}
              onContextMenu={(e) => handleStashContextMenu(e, s)}
            />
          ))}
          {stashes.length === 0 && <div className="px-3 py-1 text-xs text-faint">No stashes</div>}
        </Section>

        {STUB_SECTIONS.map((s) => (
          <Section key={s.title} title={s.title} count={0} defaultOpen={false}>
            <div className="px-3 py-1 text-xs text-faint flex items-center gap-1.5">{s.icon} Coming soon</div>
          </Section>
        ))}
      </div>

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-accent/40 transition-colors"
        onMouseDown={startResize}
      />

      {/* Context Menu Modal */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
