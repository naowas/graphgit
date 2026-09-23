import React from 'react';
import { GitBranch, ArrowUp, ArrowDown, Archive, Check, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import { useApp } from '../../store';
import { api } from '../../lib/api';
import { Dropdown } from '../ui/Dropdown';

const VERSION = '1.0.0';

export function StatusBar() {
  const status = useApp((s) => s.status);
  const stashes = useApp((s) => s.stashes);
  const runAndRefresh = useApp((s) => s.runAndRefresh);
  const ahead = status?.ahead ?? 0;
  const behind = status?.behind ?? 0;
  const branch = status?.currentBranch ?? '—';
  const dirty = (status?.staged.length ?? 0) + (status?.unstaged.length ?? 0);

  return (
    <div className="flex items-center gap-1 bg-panel border-t border-edge px-2 py-0.5 text-xs text-dim shrink-0">
      <Dropdown
        trigger={
          <button className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-panel3 text-fg/90">
            <GitBranch size={11} />
            {branch}
            <ChevronDown size={10} />
          </button>
        }
        width={240}
        align="left"
      >
        {(close) => (
          <>
            {useApp.getState().branches.local.map((b) => (
              <button
                key={b.fullName}
                className="flex w-full items-center gap-2 px-3 py-1 text-sm text-left hover:bg-panel3 text-fg/90"
                onClick={() => {
                  close();
                  if (!b.isCurrent) void runAndRefresh(() => api.checkoutBranch(b.fullName), `Checked out ${b.name}`);
                }}
              >
                <span className="flex-1 truncate">{b.name}</span>
                {b.isCurrent && <Check size={12} className="text-accent" />}
              </button>
            ))}
          </>
        )}
      </Dropdown>

      <button
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-panel3 disabled:opacity-40"
        disabled={ahead === 0}
        title={`Push ${ahead} commit(s)`}
        onClick={() => void runAndRefresh(() => api.push(), 'Pushed')}
      >
        <ArrowUp size={11} /> {ahead}
      </button>
      <button
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-panel3 disabled:opacity-40"
        disabled={behind === 0}
        title={`Pull ${behind} commit(s)`}
        onClick={() => void runAndRefresh(() => api.pull(), 'Pulled')}
      >
        <ArrowDown size={11} /> {behind}
      </button>

      {stashes.length > 0 && (
        <span className="flex items-center gap-1 px-1.5">
          <Archive size={11} /> {stashes.length}
        </span>
      )}

      {dirty > 0 && <span className="px-1.5 text-warn">{dirty} changed</span>}

      <span className="flex-1" />
      <span className="px-1.5">GraphGit v{VERSION}</span>
    </div>
  );
}
