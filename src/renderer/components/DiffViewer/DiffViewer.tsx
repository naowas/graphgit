import React from 'react';
import { RotateCcw, X, Loader2, FileText, Maximize2, Rows2 } from 'lucide-react';
import { DiffHunk, DiffLineKind } from '../../../shared/types';
import { useApp } from '../../store';
import { api } from '../../lib/api';
import { StatusIcon } from '../CommitDetailPanel/CommitDetailPanel';

const LINE_NO_W = 46;

function lineClass(kind: DiffLineKind): string {
  switch (kind) {
    case 'add':
      return 'bg-add-bg text-add/90';
    case 'del':
      return 'bg-del-bg text-del/90';
    default:
      return '';
  }
}

function Hunk({ hunk, hunkIndex, canRevert }: { hunk: DiffHunk; hunkIndex: number; canRevert: boolean }) {
  const openDiff = useApp((s) => s.openDiff);
  const runAndRefresh = useApp((s) => s.runAndRefresh);

  const revertHunk = async () => {
    if (!openDiff || openDiff.commitHash === null) return;
    await runAndRefresh(
      () => api.revertHunk(openDiff.commitHash ?? '', openDiff.filePath, hunkIndex),
      'Hunk reverted'
    );
  };

  return (
    <div className="border-b border-edge/50">
      <div className="flex items-center gap-2 bg-panel2/80 px-2 py-1 text-xs text-dim font-mono sticky top-0 z-[1] backdrop-blur-sm border-b border-edge/30">
        <span className="flex-1 truncate">{hunk.header}</span>
        {canRevert && (
          <button className="btn-icon !w-5 !h-5 hover:!text-del" title="Revert this hunk" onClick={() => void revertHunk()}>
            <RotateCcw size={11} />
          </button>
        )}
      </div>
      <div className="font-mono text-xs leading-5 selectable">
        {hunk.lines.map((l, i) => (
          <div key={i} className={`flex ${lineClass(l.kind)}`}>
            <span className="w-[46px] shrink-0 text-right pr-1 text-faint/70 select-none border-r border-edge/30">
              {l.oldNo ?? ''}
            </span>
            <span className="w-[46px] shrink-0 text-right pr-1 text-faint/70 select-none border-r border-edge/30">
              {l.newNo ?? ''}
            </span>
            <span className="w-4 shrink-0 text-center select-none opacity-60">
              {l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ''}
            </span>
            <span className="whitespace-pre-wrap break-all pr-3 flex-1 min-w-0">{l.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiffViewer() {
  const openDiff = useApp((s) => s.openDiff);
  const fileDiff = useApp((s) => s.fileDiff);
  const loading = useApp((s) => s.diffLoading);
  const closeDiff = useApp((s) => s.closeDiff);
  const diffHeight = useApp((s) => s.diffHeight);
  const diffMaximized = useApp((s) => s.diffMaximized);
  const setDiffHeight = useApp((s) => s.setDiffHeight);
  const toggleDiffMaximized = useApp((s) => s.toggleDiffMaximized);

  if (!openDiff) return null;

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = diffHeight;
    const onMouseMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY; // dragging upwards increases height
      setDiffHeight(startH + delta);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      className={`relative min-w-0 min-h-0 flex flex-col bg-base overflow-hidden border-t border-edge ${
        diffMaximized ? 'flex-1 h-full' : 'shrink-0'
      }`}
      style={diffMaximized ? undefined : { height: `${diffHeight}px` }}
    >
      {/* Draggable resize handle */}
      {!diffMaximized && (
        <div
          className="absolute top-0 left-0 right-0 h-1.5 -mt-0.5 cursor-row-resize hover:bg-accent/50 z-20 transition-colors"
          title="Drag to resize diff view"
          onMouseDown={startResize}
        />
      )}

      {/* Diff header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-panel border-b border-edge shrink-0 select-none z-10">
        <StatusIcon status={openDiff.status ?? (openDiff.staged ? 'added' : 'modified')} />
        <span className="font-mono text-sm text-fg truncate">{openDiff.filePath}</span>
        {openDiff.commitHash === null && (
          <span className="text-[10px] rounded bg-panel3 px-1.5 py-px text-warn">
            {openDiff.staged ? 'STAGED' : 'WORKING DIR'}
          </span>
        )}
        {fileDiff && (fileDiff.insertions > 0 || fileDiff.deletions > 0) && (
          <span className="text-xs text-dim shrink-0">
            <span className="text-add">+{fileDiff.insertions}</span> <span className="text-del">-{fileDiff.deletions}</span>
          </span>
        )}
        <span className="flex-1" />
        <button
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-dim hover:text-fg hover:bg-panel3 border border-edge/40 transition-colors"
          title={diffMaximized ? 'Switch to split view (show commit graph)' : 'Switch to full diff view (hide graph)'}
          onClick={toggleDiffMaximized}
        >
          {diffMaximized ? (
            <>
              <Rows2 size={12} className="text-dim" />
              <span className="text-[11px] font-medium hidden sm:inline">Split View</span>
            </>
          ) : (
            <>
              <Maximize2 size={12} className="text-accent" />
              <span className="text-[11px] font-medium text-accent hidden sm:inline">Full Diff</span>
            </>
          )}
        </button>
        <button className="btn-icon !w-6 !h-6" title="Close diff (Esc)" onClick={closeDiff}>
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 bg-base">
        {loading ? (
          <div className="flex items-center justify-center h-full text-dim">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : fileDiff?.isBinary ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-dim text-sm">
            <FileText size={22} className="opacity-50" />
            Binary file cannot be displayed
          </div>
        ) : !fileDiff || fileDiff.hunks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-dim text-sm">
            <FileText size={22} className="opacity-50" />
            {openDiff.commitHash === null ? 'No textual changes (empty file)' : 'No diff available (empty file or identical)'}
          </div>
        ) : (
          fileDiff.hunks.map((h, i) => <Hunk key={i} hunk={h} hunkIndex={i} canRevert={openDiff.commitHash !== null} />)
        )}
      </div>
    </div>
  );
}
