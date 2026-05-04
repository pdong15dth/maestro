'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useFileSystem, FileNode } from '@/hooks/useFileSystem';
import { useAgentStore, Agent, Skill } from '@/hooks/useAgentStore';

export type TabType = 'chat' | 'file' | 'agent-manager' | 'diff' | 'terminal';

export interface WorkspaceTab {
  id: string;
  type: TabType;
  title: string;
  data?: any;
  isDirty?: boolean;
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
  markTabDirty: (tabId: string, dirty: boolean) => void;
  // File system
  fileTree: FileNode[];
  isLoadingWorkspace: boolean;
  loadWorkspace: (path: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  readFileBinary: (path: string) => Promise<Uint8Array>;
  writeFile: (path: string, content: string) => Promise<void>;
  createFile: (path: string, content?: string) => Promise<void>;
  createDir: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  // Agents & Skills
  agents: Agent[];
  skills: Skill[];
  agentStoreReady: boolean;
  saveAgentOverrides: (command: string, overrides: { args?: string[]; systemPrompt?: string; inputTemplate?: string }) => Promise<void>;
  saveCustomAgents: (agents: Agent[]) => Promise<void>;
  saveCustomSkills: (skills: Skill[]) => Promise<void>;
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
  // Agent messages
  agentMessages: ChatMessage[];
  setAgentMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  clearAgentMessages: () => void;
}

export interface ChatMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  thinking?: string;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY = 'maestro-recent-workspaces';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [agentMessages, setAgentMessages] = useState<ChatMessage[]>([]);

  const {
    fileTree,
    isLoading: isLoadingWorkspace,
    loadWorkspace,
    readFile,
    readFileBinary,
    writeFile,
    createFile,
    createDir,
    deleteFile,
    renameFile,
  } = useFileSystem();
  const { agents, skills, ready: agentStoreReady, refreshSkills, saveAgentOverrides, saveCustomAgents, saveCustomSkills } = useAgentStore();

  // Refresh skills when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      refreshSkills(currentWorkspace);
    }
  }, [currentWorkspace, refreshSkills]);

  // Auto-select first agent when store loads and none is selected
  useEffect(() => {
    if (agentStoreReady && !activeAgentId && agents.length > 0) {
      setActiveAgentId(agents[0].id);
    }
  }, [agentStoreReady, activeAgentId, agents]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentWorkspaces));
    }
  }, [recentWorkspaces]);

  const addRecentWorkspace = useCallback((workspace: string) => {
    setRecentWorkspaces((prev) => {
      const newRecent = prev.filter((w) => w !== workspace);
      return [workspace, ...newRecent].slice(0, 5);
    });
  }, []);

  const openTab = useCallback((newTab: WorkspaceTab) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.id === newTab.id);
      if (exists) return prev;
      return [...prev, newTab];
    });
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
      }
      return newTabs;
    });
  }, [activeTabId]);

  const markTabDirty = useCallback((tabId: string, dirty: boolean) => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === tabId);
      if (!tab || tab.isDirty === dirty) return prev;
      return prev.map((t) => (t.id === tabId ? { ...t, isDirty: dirty } : t));
    });
  }, []);

  const clearAgentMessages = useCallback(() => {
    setAgentMessages([]);
  }, []);

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
        markTabDirty,
        fileTree,
        isLoadingWorkspace,
        loadWorkspace,
        readFile,
        readFileBinary,
        writeFile,
        createFile,
        createDir,
        deleteFile,
        renameFile,
        agents,
        skills,
        agentStoreReady,
        saveAgentOverrides,
        saveCustomAgents,
        saveCustomSkills,
        activeAgentId,
        setActiveAgentId,
        agentMessages,
        setAgentMessages,
        clearAgentMessages,
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
