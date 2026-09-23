import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useApp } from './store';
import { TabBar } from './components/TabBar/TabBar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { CommitGraph } from './components/CommitGraph/CommitGraph';
import { CommitDetailPanel } from './components/CommitDetailPanel/CommitDetailPanel';
import { DiffViewer } from './components/DiffViewer/DiffViewer';
import { StatusBar } from './components/StatusBar/StatusBar';
import { Launchpad } from './components/Launchpad/Launchpad';

function Toast() {
  const toast = useApp((s) => s.toast);
  if (!toast) return null;
  const color =
    toast.kind === 'error' ? 'bg-del text-white' : toast.kind === 'success' ? 'bg-add text-white' : 'bg-panel3 text-fg';
  return (
    <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 rounded-md px-4 py-2 text-sm shadow-xl ${color} max-w-[70vw]`}>
      {toast.text}
    </div>
  );
}

export function App() {
  const activeTab = useApp((s) => s.activeTab);
  const init = useApp((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="h-full flex flex-col bg-base overflow-hidden border border-[#22262e]/50">
      <TabBar />
      {activeTab ? (
        <>
          <Toolbar />
          <div className="flex-1 flex min-h-0">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <CommitGraph />
              <DiffViewer />
            </div>
            <CommitDetailPanel />
          </div>
        </>
      ) : (
        <Launchpad />
      )}
      <StatusBar />
      <Toast />
    </div>
  );
}
