import React from 'react';
import { RotateCcw, X, Loader2, FileText } from 'lucide-react';
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
      <div className="flex items-center gap-2 bg-panel2/60 px-2 py-1 text-xs text-dim font-mono">
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
            <span className="whitespace-pre-wrap break-all pr-3 flex-1">{l.content}</span>
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

  if (!openDiff) return null;

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-base">
      {/* Diff header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-panel border-b border-edge shrink-0">
        <StatusIcon status={openDiff.staged ? 'added' : 'modified'} />
        <span className="font-mono text-sm text-fg truncate">{openDiff.filePath}</span>
        {openDiff.commitHash === null && (
          <span className="text-[10px] rounded bg-panel3 px-1.5 py-px text-warn">WORKING DIR</span>
        )}
        {fileDiff && (
          <span className="text-xs text-dim shrink-0">
            <span className="text-add">+{fileDiff.insertions}</span> <span className="text-del">-{fileDiff.deletions}</span>
          </span>
        )}
        <span className="flex-1" />
        <button className="btn-icon" title="Close diff" onClick={closeDiff}>
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-dim">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : !fileDiff || fileDiff.hunks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-dim text-sm">
            <FileText size={22} className="opacity-50" />
            {openDiff.commitHash === null ? 'No textual changes' : 'No diff available (binary file or empty diff)'}
          </div>
        ) : (
          fileDiff.hunks.map((h, i) => <Hunk key={i} hunk={h} hunkIndex={i} canRevert={openDiff.commitHash !== null} />)
        )}
      </div>
    </div>
  );
}
