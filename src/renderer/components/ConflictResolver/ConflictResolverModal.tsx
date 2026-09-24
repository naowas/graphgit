import React, { useEffect, useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Save,
  RotateCcw,
  Loader2,
  FileText,
  GitMerge,
  Split,
  Layers
} from 'lucide-react';
import { ConflictFileParsed, ConflictSection } from '../../../shared/types';
import { api } from '../../lib/api';
import { useApp } from '../../store';

export function ConflictResolverModal() {
  const conflictedFile = useApp((s) => s.conflictedFileToResolve);
  const close = useApp((s) => s.closeConflictResolver);
  const operationState = useApp((s) => s.operationState);
  const runAndRefresh = useApp((s) => s.runAndRefresh);
  const notify = useApp((s) => s.notify);
  const openConflictResolver = useApp((s) => s.openConflictResolver);
  const abortRepoOperation = useApp((s) => s.abortRepoOperation);
  const continueRepoOperation = useApp((s) => s.continueRepoOperation);

  const [data, setData] = useState<ConflictFileParsed | null>(null);
  const [loading, setLoading] = useState(true);
  // Map of conflict.id -> resolved lines (or null if unresolved)
  const [resolutions, setResolutions] = useState<Record<string, { choice: 'current' | 'incoming' | 'both'; lines: string[] }>>({});

  useEffect(() => {
    if (!conflictedFile) return;
    setLoading(true);
    setResolutions({});
    api
      .getConflictFile(conflictedFile)
      .then((parsed) => {
        setData(parsed);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load conflict file:', err);
        notify('error', `Failed to read conflict markers: ${String(err)}`);
        setLoading(false);
      });
  }, [conflictedFile]);

  if (!conflictedFile) return null;

  const conflictSections = data
    ? data.sections
        .filter((s): s is { type: 'conflict'; conflict: ConflictSection } => s.type === 'conflict')
        .map((s) => s.conflict)
    : [];

  const resolvedCount = Object.keys(resolutions).length;
  const totalCount = conflictSections.length;
  const allResolved = totalCount > 0 && resolvedCount === totalCount;

  const handleChoose = (
    conflict: ConflictSection,
    choice: 'current' | 'incoming' | 'both'
  ) => {
    let lines: string[] = [];
    if (choice === 'current') {
      lines = conflict.currentLines;
    } else if (choice === 'incoming') {
      lines = conflict.incomingLines;
    } else {
      lines = [...conflict.currentLines, ...conflict.incomingLines];
    }
    setResolutions((prev) => ({
      ...prev,
      [conflict.id]: { choice, lines }
    }));
  };

  const handleResetConflict = (conflictId: string) => {
    setResolutions((prev) => {
      const next = { ...prev };
      delete next[conflictId];
      return next;
    });
  };

  const handleSaveAndResolve = async () => {
    if (!data) return;

    // Assemble final file content
    const finalLines: string[] = [];
    for (const section of data.sections) {
      if (section.type === 'text') {
        finalLines.push(...section.lines);
      } else {
        const res = resolutions[section.conflict.id];
        if (res) {
          finalLines.push(...res.lines);
        } else {
          notify('error', 'Please resolve all conflict blocks before saving.');
          return;
        }
      }
    }

    const content = finalLines.join('\n');
    await runAndRefresh(async () => {
      await api.resolveConflictFile(conflictedFile, content);
      close();
    }, `${conflictedFile} marked as resolved`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-panel border border-edge rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-panel2 border-b border-edge shrink-0 select-none">
          <div className="w-8 h-8 rounded-lg bg-del/15 flex items-center justify-center text-del shrink-0">
            <GitMerge size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-fg">Merge Conflict Resolver</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-panel3 text-warn border border-warn/30">
                {conflictedFile}
              </span>
            </div>
            <p className="text-xs text-dim">
              {totalCount > 0
                ? `${resolvedCount} of ${totalCount} conflict${totalCount > 1 ? 's' : ''} resolved`
                : 'Inspecting conflict markers...'}
            </p>
          </div>

          {/* Quick file switcher if multiple conflicted files exist */}
          {operationState && operationState.conflictedFiles.length > 1 && (
            <div className="flex items-center gap-1 bg-panel3 px-2 py-1 rounded-md border border-edge text-xs">
              <span className="text-dim text-[11px]">Other files:</span>
              {operationState.conflictedFiles
                .filter((f) => f !== conflictedFile)
                .map((f) => (
                  <button
                    key={f}
                    onClick={() => openConflictResolver(f)}
                    className="text-accent hover:underline text-[11px] font-mono truncate max-w-[120px]"
                    title={f}
                  >
                    {f.split('/').pop()}
                  </button>
                ))}
            </div>
          )}

          <button
            className="btn-icon !w-7 !h-7 text-dim hover:text-fg ml-2"
            onClick={close}
            title="Close conflict resolver"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-base p-4 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-dim text-xs py-20">
              <Loader2 size={24} className="animate-spin text-accent" />
              <span>Parsing conflict markers...</span>
            </div>
          ) : conflictSections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-dim text-sm py-20">
              <CheckCircle2 size={32} className="text-add" />
              <span className="text-fg font-medium">No conflict markers found in this file</span>
              <span className="text-xs text-dim">
                This file may have already been resolved or does not contain standard git conflict delimiters.
              </span>
            </div>
          ) : (
            conflictSections.map((conflict, idx) => {
              const res = resolutions[conflict.id];
              const isResolved = !!res;

              return (
                <div
                  key={conflict.id}
                  className={`rounded-lg border transition-all ${
                    isResolved
                      ? 'border-add/50 bg-panel/40'
                      : 'border-warn/60 bg-panel shadow-sm ring-1 ring-warn/20'
                  }`}
                >
                  {/* Conflict Header & Actions Bar */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-panel2/90 border-b border-edge/60 text-xs flex-wrap">
                    <span className="font-semibold text-fg flex items-center gap-1.5">
                      <AlertTriangle size={13} className={isResolved ? 'text-add' : 'text-warn'} />
                      Conflict #{idx + 1}
                      <span className="text-faint text-[11px] font-normal">
                        (lines {conflict.startLine}–{conflict.endLine})
                      </span>
                    </span>

                    <span className="flex-1" />

                    {isResolved ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-add flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Resolved ({res.choice.toUpperCase()})
                        </span>
                        <button
                          className="px-2 py-0.5 rounded text-[11px] bg-panel3 hover:bg-panel text-dim hover:text-fg border border-edge transition-colors"
                          onClick={() => handleResetConflict(conflict.id)}
                        >
                          Change Choice
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-[11px] font-medium transition-colors"
                          title="Accept current changes (HEAD)"
                          onClick={() => handleChoose(conflict, 'current')}
                        >
                          <span>Accept Current (Ours)</span>
                        </button>

                        <button
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 text-[11px] font-medium transition-colors"
                          title="Accept incoming changes (Theirs)"
                          onClick={() => handleChoose(conflict, 'incoming')}
                        >
                          <span>Accept Incoming (Theirs)</span>
                        </button>

                        <button
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-panel3 hover:bg-panel text-fg border border-edge text-[11px] font-medium transition-colors"
                          title="Keep both changes"
                          onClick={() => handleChoose(conflict, 'both')}
                        >
                          <Layers size={11} />
                          <span>Accept Both</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Conflict Content Comparison */}
                  {isResolved ? (
                    <div className="p-3 bg-panel3/30 font-mono text-xs leading-5">
                      <div className="text-[10px] text-faint uppercase font-sans mb-1">
                        Resolved Code Output:
                      </div>
                      <div className="rounded border border-edge/40 bg-base p-2 select-text">
                        {res.lines.map((l, i) => (
                          <div key={i} className="text-fg whitespace-pre-wrap">
                            {l || <span className="opacity-0">.</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-edge font-mono text-xs leading-5">
                      {/* Left: Current Change */}
                      <div className="flex flex-col bg-sky-950/10">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-sky-900/20 text-sky-300 font-sans text-xs border-b border-edge/30">
                          <span className="font-medium truncate">{conflict.currentLabel}</span>
                          <span className="text-[10px] opacity-80 shrink-0">Current / HEAD</span>
                        </div>
                        <div className="p-2 select-text overflow-x-auto">
                          {conflict.currentLines.map((l, i) => (
                            <div key={i} className="text-sky-200 whitespace-pre-wrap">
                              {l || <span className="opacity-0">.</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Incoming Change */}
                      <div className="flex flex-col bg-purple-950/10">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-purple-900/20 text-purple-300 font-sans text-xs border-b border-edge/30">
                          <span className="font-medium truncate">{conflict.incomingLabel}</span>
                          <span className="text-[10px] opacity-80 shrink-0">Incoming</span>
                        </div>
                        <div className="p-2 select-text overflow-x-auto">
                          {conflict.incomingLines.map((l, i) => (
                            <div key={i} className="text-purple-200 whitespace-pre-wrap">
                              {l || <span className="opacity-0">.</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center gap-3 px-4 py-3 bg-panel2 border-t border-edge shrink-0 select-none">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-del hover:bg-del/10 border border-del/30 transition-colors"
            title="Abort this merge or rebase operation completely"
            onClick={async () => {
              if (
                window.confirm(
                  'Abort the current merge/rebase? All in-progress conflict resolution will be rolled back.'
                )
              ) {
                await abortRepoOperation();
                close();
              }
            }}
          >
            <RotateCcw size={13} />
            <span>Abort Operation</span>
          </button>

          <span className="flex-1" />

          <button
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-dim hover:text-fg hover:bg-panel3 transition-colors"
            onClick={close}
          >
            Cancel
          </button>

          <button
            disabled={!allResolved}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              allResolved
                ? 'bg-accent text-white hover:brightness-110 shadow-sm'
                : 'bg-panel3 text-faint border border-edge/40 cursor-not-allowed'
            }`}
            onClick={handleSaveAndResolve}
          >
            <Save size={13} />
            <span>Save &amp; Mark Resolved</span>
          </button>
        </div>
      </div>
    </div>
  );
}
