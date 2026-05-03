'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TabType = 'chat' | 'file' | 'agent-manager' | 'diff' | 'terminal';

export interface WorkspaceTab {
  id: string;
  type: TabType;
  title: string;
  data?: any;
}

interface WorkspaceContextType {
  currentWorkspace: string | null;
  setCurrentWorkspace: (workspace: string | null) => void;
  recentWorkspaces: string[];
  addRecentWorkspace: (workspace: string) => void;
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  openTab: (tab: WorkspaceTab) => void;
  closeTab: (tabId: string) => void;
  setActiveTabId: (tabId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>([
    '/Users/dev/frontend-app',
    '/Users/dev/backend-api',
  ]);
  
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const addRecentWorkspace = (workspace: string) => {
    setRecentWorkspaces((prev) => {
      const newRecent = prev.filter((w) => w !== workspace);
      return [workspace, ...newRecent].slice(0, 5); // Keep top 5
    });
  };

  const openTab = (newTab: WorkspaceTab) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.id === newTab.id);
      if (exists) return prev;
      return [...prev, newTab];
    });
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
      }
      return newTabs;
    });
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        setCurrentWorkspace,
        recentWorkspaces,
        addRecentWorkspace,
        tabs,
        activeTabId,
        openTab,
        closeTab,
        setActiveTabId,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
