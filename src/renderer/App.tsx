import React, { useEffect, useState } from 'react';
import { useApp } from './store';
import { useSettings } from './store/settings';
import { TabBar } from './components/TabBar/TabBar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { CommitGraph } from './components/CommitGraph/CommitGraph';
import { CommitDetailPanel } from './components/CommitDetailPanel/CommitDetailPanel';
import { DiffViewer } from './components/DiffViewer/DiffViewer';
import { StatusBar } from './components/StatusBar/StatusBar';
import { Launchpad } from './components/Launchpad/Launchpad';
import { SettingsModal } from './components/Settings/SettingsModal';
import { AppLoadingScreen } from './components/Loading/AppLoadingScreen';
import { ConflictBanner } from './components/ConflictResolver/ConflictBanner';
import { ConflictResolverModal } from './components/ConflictResolver/ConflictResolverModal';
import { InteractiveRebaseModal } from './components/Rebase/InteractiveRebaseModal';

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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    void init().finally(() => {
      // Ensure the loading animation displays smoothly for at least 700ms
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 700 - elapsed);
      setTimeout(() => {
        setIsReady(true);
      }, remaining);
    });
  }, [init]);

  // Global keyboard shortcut for settings: Ctrl+, or Cmd+,
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        useSettings.getState().openSettings();
      } else if (e.key === 'Escape') {
        if (useApp.getState().openDiff) {
          useApp.getState().closeDiff();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="h-full flex flex-col bg-base overflow-hidden border border-edge/50">
      <TabBar />
      {activeTab ? (
        <>
          <Toolbar />
          <ConflictBanner />
          <div className="flex-1 flex min-h-0">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
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
      <ConflictResolverModal />
      <InteractiveRebaseModal />
      <SettingsModal />
      <AppLoadingScreen isReady={isReady} />
    </div>
  );
}
