import React from 'react';
import { Terminal, FolderOpen, History, ChevronRight } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { open } from '@tauri-apps/plugin-dialog';

export function WelcomeScreen() {
  const { setCurrentWorkspace, recentWorkspaces, addRecentWorkspace, loadWorkspace } = useWorkspace();

  const handleSelectWorkspace = async () => {
    try {
      const selected = await open({ directory: true });
      if (selected && typeof selected === 'string') {
        setCurrentWorkspace(selected);
        addRecentWorkspace(selected);
        await loadWorkspace(selected);
      }
    } catch (err) {
      console.error('Failed to open dialog:', err);
    }
  };

  const handleSelectRecent = async (path: string) => {
    setCurrentWorkspace(path);
    addRecentWorkspace(path);
    await loadWorkspace(path);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-8 h-screen w-full">
      <div className="max-w-xl w-full bg-[#111113] border border-zinc-800 rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6 mx-auto shadow-inner">
          <Terminal className="w-8 h-8 text-indigo-400" />
        </div>
        
        <h1 className="text-2xl font-medium text-center text-zinc-100 mb-2">AI Agent CLI Shell</h1>
        <p className="text-zinc-400 text-center text-sm mb-10">
          Select a workspace to initialize the AI Agent.
        </p>

        <div className="flex justify-center mb-10">
          <button
            onClick={handleSelectWorkspace}
            className="group flex items-center px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-indigo-500/25"
          >
            <FolderOpen className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
            Open Folder...
          </button>
        </div>

        {recentWorkspaces.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center text-xs font-semibold text-zinc-500 uppercase tracking-widest px-2 mb-3">
              <History className="w-3.5 h-3.5 mr-2" />
              Recent Workspaces
            </div>
            <div className="flex flex-col gap-1">
              {recentWorkspaces.map((path) => (
                <button
                  key={path}
                  onClick={() => handleSelectRecent(path)}
                  className="flex items-center justify-between w-full p-3 text-left bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800/50 hover:border-zinc-700 rounded-xl transition-all group"
                >
                  <div className="flex items-center overflow-hidden">
                    <FolderOpen className="w-4 h-4 text-zinc-500 mr-3 shrink-0" />
                    <span className="text-sm font-mono text-zinc-300 truncate">
                      {path}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
