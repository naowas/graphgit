import React, { useMemo, useState, useEffect } from 'react';
import {
  Pencil,
  Plus,
  Minus,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  FileText,
  List,
  GitBranch,
  Loader2,
  MessageSquarePlus,
  Check,
  Undo2,
  RotateCcw,
  Copy,
  X
} from 'lucide-react';
import { FileChange, FileStatusKind } from '../../../shared/types';
import { useApp, WIP_HASH } from '../../store';
import { Avatar } from '../ui/Avatar';
import { Dropdown, MenuItem } from '../ui/Dropdown';
import { api } from '../../lib/api';

export function StatusIcon({ status }: { status: FileStatusKind }) {
  const map: Record<FileStatusKind, { icon: React.ReactNode; color: string; title: string }> = {
    modified: { icon: <Pencil size={11} />, color: 'text-warn', title: 'Modified' },
    added: { icon: <Plus size={12} className="stroke-[2.5]" />, color: 'text-add', title: 'Added' },
    deleted: { icon: <Minus size={12} className="stroke-[2.5]" />, color: 'text-del', title: 'Deleted' },
    renamed: { icon: <ArrowRight size={11} />, color: 'text-accent', title: 'Renamed' },
    untracked: { icon: <Plus size={12} className="stroke-[2.5]" />, color: 'text-add', title: 'Untracked / New file' },
    conflicted: { icon: <Pencil size={11} />, color: 'text-del', title: 'Conflicted' }
  };
  const { icon, color, title } = map[status] || map.modified;
  return (
    <span className={`${color} shrink-0 flex items-center justify-center w-3.5 h-3.5`} title={title}>
      {icon}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' @ ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return iso;
  }
}

/** Working-copy commit form: stage/unstage/discard + commit message box. */
function WorkdirPanel() {
  const status = useApp((s) => s.status);
  const openDiff = useApp((s) => s.openDiff);
  const runAndRefresh = useApp((s) => s.runAndRefresh);
  const [msg, setMsg] = useState('');

  const stagedCounts = useMemo(() => {
    if (!status) return { modified: 0, added: 0, deleted: 0 };
    const modified = status.staged.filter((f) => f.status === 'modified' || f.status === 'renamed').length;
    const added = status.staged.filter((f) => f.status === 'added' || f.status === 'untracked').length;
    const deleted = status.staged.filter((f) => f.status === 'deleted').length;
    return { modified, added, deleted };
  }, [status]);

  const unstagedCounts = useMemo(() => {
    if (!status) return { modified: 0, added: 0, deleted: 0 };
    const modified = status.unstaged.filter((f) => f.status === 'modified' || f.status === 'renamed').length;
    const added = status.unstaged.filter((f) => f.status === 'added' || f.status === 'untracked').length;
    const deleted = status.unstaged.filter((f) => f.status === 'deleted').length;
    return { modified, added, deleted };
  }, [status]);

  const doCommit = async () => {
    if (!msg.trim()) return;
    const ok = await runAndRefresh(() => api.commit(msg.trim()), 'Commit created');
    if (ok) setMsg('');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
      {status && status.staged.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-dim bg-panel2/40 border-b border-edge/30">
            <span className="font-semibold text-fg/80">STAGED FILES ({status.staged.length})</span>
            <div className="flex items-center gap-2 ml-1 text-xs font-mono">
              {stagedCounts.modified > 0 && (
                <span className="flex items-center gap-0.5 text-warn text-[11px]" title={`${stagedCounts.modified} modified`}>
                  <Pencil size={10} className="text-warn shrink-0" />
                  <span>{stagedCounts.modified}</span>
                </span>
              )}
              {stagedCounts.added > 0 && (
                <span className="flex items-center gap-0.5 text-add text-[11px]" title={`${stagedCounts.added} new`}>
                  <Plus size={11} className="text-add shrink-0 stroke-[2.5]" />
                  <span>{stagedCounts.added}</span>
                </span>
              )}
              {stagedCounts.deleted > 0 && (
                <span className="flex items-center gap-0.5 text-del text-[11px]" title={`${stagedCounts.deleted} deleted`}>
                  <Minus size={11} className="text-del shrink-0 stroke-[2.5]" />
                  <span>{stagedCounts.deleted}</span>
                </span>
              )}
            </div>
            <span className="flex-1" />
            <button className="hover:text-fg hover:bg-panel3 p-1 rounded" title="Unstage all" onClick={() => void runAndRefresh(() => api.unstageAll())}>
              <Undo2 size={12} />
            </button>
          </div>
          {status.staged.map((f) => {
            const active = openDiff?.filePath === f.path && openDiff?.commitHash === null && openDiff?.staged === true;
            return (
              <div
                key={f.path}
                className={`group flex items-center gap-2 px-3 py-1 text-sm select-none ${
                  active ? 'bg-accent/15' : 'hover:bg-panel2'
                }`}
              >
                <StatusIcon status={f.status} />
                <span
                  className={`truncate font-mono text-xs flex-1 cursor-pointer hover:underline ${
                    f.status === 'untracked' || f.status === 'added'
                      ? 'text-add hover:text-add'
                      : f.status === 'deleted'
                        ? 'text-del line-through hover:text-del'
                        : 'text-fg/90 hover:text-accent'
                  }`}
                  title={f.path}
                  onClick={() => void useApp.getState().openFileDiff({ commitHash: null, filePath: f.path, staged: true, status: f.status })}
                >
                  {f.path}
                </span>
                <button
                  className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded text-dim hover:text-fg hover:bg-panel3"
                  title="Unstage"
                  onClick={() => void runAndRefresh(() => api.unstageFiles([f.path]))}
                >
                  <Undo2 size={11} />
                </button>
              </div>
            );
          })}
        </>
      )}

      {status && status.unstaged.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-dim bg-panel2/40 border-b border-edge/30">
            <span className="font-semibold text-fg/80">UNSTAGED FILES ({status.unstaged.length})</span>
            <div className="flex items-center gap-2 ml-1 text-xs font-mono">
              {unstagedCounts.modified > 0 && (
                <span className="flex items-center gap-0.5 text-warn text-[11px]" title={`${unstagedCounts.modified} modified`}>
                  <Pencil size={10} className="text-warn shrink-0" />
                  <span>{unstagedCounts.modified}</span>
                </span>
              )}
              {unstagedCounts.added > 0 && (
                <span className="flex items-center gap-0.5 text-add text-[11px]" title={`${unstagedCounts.added} new/untracked`}>
                  <Plus size={11} className="text-add shrink-0 stroke-[2.5]" />
                  <span>{unstagedCounts.added}</span>
                </span>
              )}
              {unstagedCounts.deleted > 0 && (
                <span className="flex items-center gap-0.5 text-del text-[11px]" title={`${unstagedCounts.deleted} deleted`}>
                  <Minus size={11} className="text-del shrink-0 stroke-[2.5]" />
                  <span>{unstagedCounts.deleted}</span>
                </span>
              )}
            </div>
            <span className="flex-1" />
            <button className="hover:text-fg hover:bg-panel3 p-1 rounded" title="Stage all" onClick={() => void runAndRefresh(() => api.stageAll())}>
              <Plus size={12} />
            </button>
          </div>
          {status.unstaged.map((f) => {
            const active = openDiff?.filePath === f.path && openDiff?.commitHash === null && openDiff?.staged === false;
            return (
              <div
                key={f.path}
                className={`group flex items-center gap-2 px-3 py-1 text-sm select-none ${
                  active ? 'bg-accent/15' : 'hover:bg-panel2'
                }`}
              >
                <StatusIcon status={f.status} />
                <span
                  className={`truncate font-mono text-xs flex-1 cursor-pointer hover:underline ${
                    f.status === 'untracked' || f.status === 'added'
                      ? 'text-add hover:text-add'
                      : f.status === 'deleted'
                        ? 'text-del line-through hover:text-del'
                        : 'text-fg/90 hover:text-accent'
                  }`}
                  title={f.path}
                  onClick={() => void useApp.getState().openFileDiff({ commitHash: null, filePath: f.path, staged: false, status: f.status })}
                >
                  {f.path}
                </span>
                {f.status === 'untracked' && (
                  <span className="text-[9px] uppercase font-mono px-1 rounded bg-add/10 text-add border border-add/25 shrink-0">
                    new
                  </span>
                )}
                <button
                  className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded text-dim hover:text-fg hover:bg-panel3"
                  title="Stage file"
                  onClick={() => void runAndRefresh(() => api.stageFiles([f.path]))}
                >
                  <Plus size={11} />
                </button>
                {f.status !== 'untracked' && (
                  <button
                    className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded text-dim hover:text-del hover:bg-del/10"
                    title="Discard changes"
                    onClick={() => void runAndRefresh(() => api.discardFile(f.path), 'Changes discarded')}
                  >
                    <RotateCcw size={11} />
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Commit box */}
      <div className="p-3 border-t border-edge mt-auto">
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void doCommit();
          }}
          placeholder="Commit message"
          rows={3}
          className="w-full text-sm resize-none"
        />
        <button
          className="mt-2 w-full flex items-center justify-center gap-2 rounded bg-accent hover:bg-accent-hover text-white py-1.5 text-sm font-medium disabled:opacity-40"
          disabled={!msg.trim() || (status?.staged.length ?? 0) === 0}
          onClick={() => void doCommit()}
          title="Commit staged changes (Ctrl+Enter)"
        >
          <MessageSquarePlus size={14} />
          Commit {status?.staged.length ? `${status.staged.length} file${status.staged.length === 1 ? '' : 's'}` : ''}
        </button>
      </div>
    </div>
  );
}

function FileRow({ file, commitHash }: { file: FileChange; commitHash: string | null }) {
  const openFileDiff = useApp((s) => s.openFileDiff);
  const openDiff = useApp((s) => s.openDiff);
  const active = openDiff?.filePath === file.path && openDiff?.commitHash === commitHash;
  return (
    <button
      className={`flex w-full items-center gap-2 px-3 py-1 text-sm text-left hover:bg-panel2 ${
        active ? 'bg-accent/10 text-accent' : 'text-fg/90'
      }`}
      onClick={() => void openFileDiff({ commitHash, filePath: file.path, status: file.status })}
      title={file.path}
    >
      <StatusIcon status={file.status} />
      <span className="truncate font-mono text-xs flex-1">{file.path}</span>
      {file.insertions !== undefined && file.insertions > 0 && <span className="text-add text-xs">+{file.insertions}</span>}
      {file.deletions !== undefined && file.deletions > 0 && <span className="text-del text-xs">-{file.deletions}</span>}
    </button>
  );
}

function FileList({ files, commitHash }: { files: FileChange[]; commitHash: string | null }) {
  const [mode, setMode] = useState<'path' | 'tree'>('path');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const tree = useMemo(() => {
    const root: { name: string; path: string; children: Map<string, never[]> } & { files: FileChange[] } = Object.assign(
      { name: '', path: '', children: new Map(), files: [] as FileChange[] },
      {}
    );
    const folders = new Map<string, { name: string; files: FileChange[]; sub: Map<string, unknown> }>();
    folders.set('', { name: '', files: [], sub: new Map() });
    for (const f of files) {
      const parts = f.path.split('/');
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      if (!folders.has(dir)) folders.set(dir, { name: dir, files: [], sub: new Map() });
      folders.get(dir)!.files.push(f);
    }
    return folders;
  }, [files]);

  const rootFiles = tree.get('')?.files ?? [];
  const dirs = [...tree.keys()].filter((k) => k !== '').sort();

  const toggleDir = (d: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });

  const dirCount = (d: string) =>
    files.filter((f) => f.path.startsWith(d + '/')).length;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-edge/60 text-xs text-dim">
        <span className="flex-1">{files.length} changed file{files.length === 1 ? '' : 's'}</span>
        <button
          className={`btn-icon !w-5 !h-5 ${mode === 'path' ? '!text-accent' : ''}`}
          title="Path view"
          onClick={() => setMode('path')}
        >
          <List size={12} />
        </button>
        <button
          className={`btn-icon !w-5 !h-5 ${mode === 'tree' ? '!text-accent' : ''}`}
          title="Tree view"
          onClick={() => setMode('tree')}
        >
          <FileText size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {mode === 'path' ? (
          files.map((f) => <FileRow key={f.path} file={f} commitHash={commitHash} />)
        ) : (
          <>
            {dirs.map((d) => (
              <div key={d}>
                <button
                  className="flex w-full items-center gap-1.5 px-3 py-1 text-sm text-left hover:bg-panel2 text-fg/90"
                  onClick={() => toggleDir(d)}
                >
                  {collapsed.has(d) ? <ChevronRight size={12} className="text-faint" /> : <ChevronDown size={12} className="text-faint" />}
                  <span className="truncate flex-1 font-mono text-xs">{d}/</span>
                  <span className="text-[10px] text-faint">{dirCount(d)}</span>
                </button>
                {!collapsed.has(d) && tree.get(d)!.files.map((f) => <FileRow key={f.path} file={f} commitHash={commitHash} />)}
              </div>
            ))}
            {rootFiles.map((f) => (
              <FileRow key={f.path} file={f} commitHash={commitHash} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function CommitDetailPanel() {
  const detail = useApp((s) => s.commitDetail);
  const loading = useApp((s) => s.detailLoading);
  const selectedCommit = useApp((s) => s.selectedCommit);
  const selectCommit = useApp((s) => s.selectCommit);
  const notify = useApp((s) => s.notify);
  const runAndRefresh = useApp((s) => s.runAndRefresh);
  const isWip = selectedCommit === WIP_HASH;
  const [panelWidth, setPanelWidth] = useState(360);

  // Close panel on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void selectCommit(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectCommit]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelWidth;
    const onMove = (ev: MouseEvent) => {
      setPanelWidth(Math.max(260, Math.min(640, startW - (ev.clientX - startX))));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // If no commit is selected and not loading, keep panel completely hidden so CommitGraph has full width
  if (!selectedCommit && !loading) {
    return null;
  }

  if (loading) {
    return (
      <div
        className="relative shrink-0 border-l border-edge bg-panel flex items-center justify-center min-h-0"
        style={{ width: panelWidth }}
      >
        <div
          className="absolute top-0 left-0 h-full w-1 cursor-col-resize hover:bg-accent/40 z-10"
          onMouseDown={startResize}
        />
        <Loader2 size={18} className="animate-spin text-dim" />
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <div
      className="relative shrink-0 border-l border-edge bg-panel flex flex-col min-h-0"
      style={{ width: panelWidth }}
    >
      {/* Draggable resize handle */}
      <div
        className="absolute top-0 left-0 h-full w-1.5 -ml-0.5 cursor-col-resize hover:bg-accent/40 z-10 transition-colors"
        title="Drag to resize panel"
        onMouseDown={startResize}
      />

      {/* Header */}
      <div className="p-3 border-b border-edge">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-accent">{isWip ? 'WIP' : detail.shortHash}</span>
          {!isWip && (
            <button
              className="btn-icon !w-5 !h-5"
              title="Copy hash"
              onClick={() => {
                void navigator.clipboard.writeText(detail.hash);
                notify('success', 'Hash copied');
              }}
            >
              <Copy size={11} />
            </button>
          )}
          <span className="flex-1" />
          <Dropdown
            align="right"
            trigger={
              <button className="btn text-xs">
                Commit Actions <ChevronDown size={11} />
              </button>
            }
            width={220}
          >
            {(close) =>
              isWip ? (
                <MenuItem label="Working directory changes" onClick={close} />
              ) : (
                <>
                  <MenuItem
                    icon={<Copy size={13} />}
                    label="Copy full hash"
                    onClick={() => {
                      close();
                      void navigator.clipboard.writeText(detail.files ? detail.hash : detail.hash);
                      notify('success', 'Hash copied');
                    }}
                  />
                  <MenuItem
                    icon={<RotateCcw size={13} />}
                    label="Revert commit"
                    onClick={() => {
                      close();
                      void runAndRefresh(() => api.revertCommit(detail.hash), `Reverted ${detail.shortHash}`);
                    }}
                  />
                </>
              )
            }
          </Dropdown>
          {/* Close button */}
          <button
            className="btn-icon !w-6 !h-6 hover:text-fg text-dim ml-0.5"
            title="Close details (Esc)"
            onClick={() => void selectCommit(null)}
          >
            <X size={13} />
          </button>
        </div>
        <h3 className="mt-2 text-sm font-medium text-fg selectable">{detail.message}</h3>
        {detail.body && <pre className="mt-1 text-xs text-dim whitespace-pre-wrap font-sans selectable">{detail.body}</pre>}
      </div>

      {/* Author row */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-edge text-xs text-dim">
        {detail.authorName ? (
          <>
            <Avatar name={detail.authorName} email={detail.authorEmail} avatarHash={detail.avatarHash} size={20} />
            <span className="text-fg">{detail.authorName}</span>
            <span>·</span>
            <span>{formatDate(detail.date)}</span>
          </>
        ) : (
          <span>Working directory</span>
        )}
        <span className="flex-1" />
        {detail.parents.map((p) => (
          <button
            key={p}
            className="font-mono text-accent hover:underline"
            title={`Go to parent ${p.slice(0, 7)}`}
            onClick={() => void selectCommit(p)}
          >
            parent: {p.slice(0, 7)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-edge text-xs">
        <span className="text-dim">{detail.files.length} changed</span>
        <span className="text-add">+{detail.insertions} added</span>
        <span className="text-del">-{detail.deletions} deleted</span>
      </div>

      {isWip ? <WorkdirPanel /> : <FileList files={detail.files} commitHash={detail.hash} />}
    </div>
  );
}


