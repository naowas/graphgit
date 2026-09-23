import React, { useState, useEffect } from 'react';
import {
  Plus,
  X,
  FolderGit2,
  Home,
  GitBranch,
  Minus,
  Square,
  Copy
} from 'lucide-react';
import { useApp } from '../../store';
import { api } from '../../lib/api';

export function TabBar() {
  const { tabs, activeTab, setActiveTab, closeTab, openRepoDialog } = useApp();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    void api.isWindowMaximized?.().then((max) => {
      if (typeof max === 'boolean') setIsMaximized(max);
    });

    const unsubscribe = api.onMaximizeChange?.((max) => {
      setIsMaximized(max);
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <div
      className="relative flex items-center bg-[#13151a] border-b border-[#22262e] select-none h-10 px-2 shrink-0 z-30"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={() => void api.maximizeWindow?.()}
    >
      {/* 1. App Branding & Logo */}
      <div
        className="flex items-center gap-2 pr-2.5 py-1 shrink-0 cursor-default"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="w-5 h-5 rounded-[5px] bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
          <GitBranch size={13} className="text-white stroke-[2.5]" />
        </div>
        <span className="text-[11px] font-bold tracking-widest text-slate-200/90 uppercase font-mono">
          GraphGit
        </span>
      </div>

      {/* Subtle divider */}
      <div className="w-[1px] h-4 bg-edge/70 mx-1 shrink-0" />

      {/* 2. Tabs Section */}
      <div
        className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 py-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Launchpad Tab */}
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === null || activeTab === ''
              ? 'bg-[#1e232d] text-cyan-300 shadow-sm border border-cyan-500/30'
              : 'text-dim hover:text-fg hover:bg-panel2/60'
          }`}
          onClick={() => useApp.getState().setActiveTab('')}
          title="Launchpad"
        >
          <Home size={12} className={activeTab === null || activeTab === '' ? 'text-cyan-400' : 'text-dim'} />
          <span>Launchpad</span>
        </button>

        {/* Repository Tabs */}
        {tabs.map((t) => {
          const isActive = activeTab === t.path;
          return (
            <div
              key={t.path}
              className={`group relative flex items-center gap-2 pl-3 pr-2 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-all max-w-[210px] ${
                isActive
                  ? 'bg-[#1e232d] text-white shadow-sm border border-edge/90'
                  : 'text-dim hover:text-fg hover:bg-panel2/60'
              }`}
              onClick={() => setActiveTab(t.path)}
              title={t.path}
            >
              <FolderGit2
                size={12}
                className={isActive ? 'text-cyan-400 shrink-0' : 'text-dim shrink-0'}
              />
              <span className="truncate">{t.name}</span>
              <button
                className={`rounded p-0.5 ml-1 transition-opacity ${
                  isActive
                    ? 'opacity-60 hover:opacity-100 hover:bg-white/10 text-white'
                    : 'opacity-0 group-hover:opacity-100 hover:bg-panel3 text-dim hover:text-fg'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.path);
                }}
                title="Close tab"
              >
                <X size={11} />
              </button>
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-cyan-400 rounded-full" />
              )}
            </div>
          );
        })}

        {/* New Tab / Open Repo Button */}
        <button
          className="flex items-center justify-center w-7 h-7 rounded-md text-dim hover:text-fg hover:bg-panel2 transition-colors ml-0.5"
          onClick={() => void openRepoDialog()}
          title="Open repository (new tab)"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* 3. Center Draggable Space */}
      <div
        className="flex-1 min-w-[30px] h-full cursor-default"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        onDoubleClick={() => void api.maximizeWindow?.()}
      />

      {/* 4. Window Controls (Minimize, Maximize/Restore, Close) */}
      <div
        className="flex items-center h-full ml-auto shrink-0 -mr-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          className="w-11 h-10 flex items-center justify-center text-dim hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => void api.minimizeWindow?.()}
          title="Minimize"
        >
          <Minus size={14} />
        </button>

        <button
          className="w-11 h-10 flex items-center justify-center text-dim hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => void api.maximizeWindow?.()}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy size={12} className="rotate-90 stroke-[1.8]" />
          ) : (
            <Square size={12} strokeWidth={1.8} />
          )}
        </button>

        <button
          className="w-11 h-10 flex items-center justify-center text-dim hover:text-white hover:bg-[#e81123] transition-colors"
          onClick={() => void api.closeWindow?.()}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
