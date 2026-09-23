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
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../store';
import { api } from '../../lib/api';

function Section({
  title,
  count,
  children,
  defaultOpen = true
}: {
  title: string;
  count: number;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-edge/60">
      <button
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wide text-dim hover:text-fg"
        onClick={() => setOpen((o) => !o)}
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
  onClick
}: {
  name: string;
  current?: boolean;
  tracking?: string;
  remote?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`group flex w-full items-center gap-2 px-3 py-1 text-sm text-left hover:bg-panel2 ${
        current ? 'text-accent' : 'text-fg/90'
      }`}
      onClick={onClick}
      title={tracking ? `${name} → ${tracking}` : name}
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

function StashRow({ index, message }: { index: number; message: string }) {
  const { runAndRefresh } = useApp();
  return (
    <div className="group flex items-center gap-2 px-3 py-1 text-sm text-fg/90 hover:bg-panel2" title={message}>
      <Archive size={12} className="text-faint shrink-0" />
      <span className="truncate flex-1">
        #{index} {message}
      </span>
      <span className="hidden group-hover:flex gap-0.5">
        <button
          className="btn-icon !w-5 !h-5"
          title="Pop stash"
          onClick={() => void runAndRefresh(() => api.stashPop(index), `Popped stash #${index}`)}
        >
          <Play size={11} />
        </button>
        <button
          className="btn-icon !w-5 !h-5"
          title="Apply stash (keep entry)"
          onClick={() => void runAndRefresh(() => api.stashApply(index), `Applied stash #${index}`)}
        >
          <UploadCloud size={11} />
        </button>
        <button
          className="btn-icon !w-5 !h-5 hover:!text-del"
          title="Drop stash"
          onClick={() => void runAndRefresh(() => api.stashDrop(index), `Dropped stash #${index}`)}
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
      <div className="w-10 bg-panel border-r border-edge flex flex-col items-center py-2">
        <button className="btn-icon" title="Show sidebar" onClick={() => useApp.setState({ sidebarVisible: true })}>
          <ListIcon size={15} />
        </button>
      </div>
    );
  }

  return <SidebarFull width={width} branches={branches} stashes={stashes} filter={filter} status={status} activeTab={activeTab} />;
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
  const locals = branches.local.filter((b) => b.name.toLowerCase().includes(q));
  const remotes = branches.remote.filter((b) => b.fullName.toLowerCase().includes(q));
  const runAndRefresh = useApp((s) => s.runAndRefresh);
  const notify = useApp((s) => s.notify);
  const setFilter = useApp((s) => s.setFilter);
  const setSidebarWidth = useApp((s) => s.setSidebarWidth);

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

  return (
    <div className="relative flex flex-col bg-panel border-r border-edge shrink-0 min-h-0" style={{ width }}>
      {/* List / Agents toggle */}
      <div className="flex items-center gap-1 p-1.5 border-b border-edge">
        <div className="flex rounded bg-panel2 p-0.5 flex-1">
          <button className="flex-1 flex items-center justify-center gap-1 rounded bg-panel3 px-2 py-1 text-xs text-fg">
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
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter branches, stashes…" className="w-full text-xs" />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <Section title="LOCAL" count={locals.length}>
          {locals.map((b) => (
            <BranchRow
              key={b.fullName}
              name={b.name}
              current={b.isCurrent}
              tracking={b.tracking}
              onClick={() => {
                if (!b.isCurrent && activeTab) {
                  void runAndRefresh(() => api.checkoutBranch(b.fullName), `Checked out ${b.name}`);
                }
              }}
            />
          ))}
        </Section>
        <Section title="REMOTE" count={remotes.length}>
          {remotes.map((b) => (
            <BranchRow
              key={b.fullName}
              name={b.fullName}
              remote
              onClick={() => notify('info', `Remote branch: ${b.fullName}`)}
            />
          ))}
        </Section>
        <Section title="STASHES" count={stashes.length}>
          {stashes.map((s) => (
            <StashRow key={s.index} index={s.index} message={s.message} />
          ))}
          {stashes.length === 0 && <div className="px-3 py-1 text-xs text-faint">No stashes</div>}
        </Section>
        {STUB_SECTIONS.map((s) => (
          <Section key={s.title} title={s.title} count={0}>
            <div className="px-3 py-1 text-xs text-faint flex items-center gap-1.5">{s.icon} Coming soon</div>
          </Section>
        ))}
      </div>

      {/* resize handle */}
      <div
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-accent/40"
        onMouseDown={startResize}
        style={{ position: 'absolute' }}
      />
    </div>
  );
}

