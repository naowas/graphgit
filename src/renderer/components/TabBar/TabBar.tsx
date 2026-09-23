import React from 'react';
import { Plus, X, FolderGit2, Home } from 'lucide-react';
import { useApp } from '../../store';

export function TabBar() {
  const { tabs, activeTab, setActiveTab, closeTab, openRepoDialog } = useApp();

  return (
    <div className="flex items-end bg-base border-b border-edge px-1 pt-1 gap-0.5 shrink-0">
      <button
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-md ${
          activeTab === null ? 'bg-panel text-fg' : 'text-dim hover:text-fg hover:bg-panel/60'
        }`}
        onClick={() => useApp.getState().setActiveTab('')}
        title="Launchpad"
      >
        <Home size={13} />
        Launchpad
      </button>
      {tabs.map((t) => (
        <div
          key={t.path}
          className={`group flex items-center gap-2 pl-3 pr-1.5 py-1.5 text-sm rounded-t-md cursor-pointer max-w-56 ${
            activeTab === t.path ? 'bg-panel text-fg' : 'text-dim hover:text-fg hover:bg-panel/60'
          }`}
          onClick={() => setActiveTab(t.path)}
        >
          <FolderGit2 size={13} className="shrink-0" />
          <span className="truncate">{t.name}</span>
          <button
            className="opacity-0 group-hover:opacity-100 hover:bg-panel3 rounded p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(t.path);
            }}
            title="Close tab"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        className="btn-icon mb-1 ml-1"
        onClick={() => void openRepoDialog()}
        title="Open repository (new tab)"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
