import React, { useState, useRef, useEffect } from 'react';
import { TerminalSquare, AlertCircle, List, X, Plus, GitBranch, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Problem {
  file: string;
  line: number;
  message: string;
  severity: string;
}

interface WorkspaceFooterProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: 'terminal' | 'logs' | 'problems';
  setActiveTab: (tab: 'terminal' | 'logs' | 'problems') => void;
  shellIds: string[];
  activeShellId: string | null;
  setActiveShellId: (id: string | null) => void;
  shellOutputs: Record<string, string[]>;
  onNewShell: () => void;
  onShellInput: (shellId: string, input: string) => void;
  onCloseShell: (shellId: string) => void;
  logs: string[];
  problems: Problem[];
  gitBranch: string;
  language: string;
  onRefreshGit: () => void;
  onRefreshProblems: () => void;
}

export function WorkspaceFooter({
  isOpen,
  setIsOpen,
  activeTab,
  setActiveTab,
  shellIds,
  activeShellId,
  setActiveShellId,
  shellOutputs,
  onNewShell,
  onShellInput,
  onCloseShell,
  logs,
  problems,
  gitBranch,
  language,
  onRefreshGit,
  onRefreshProblems,
}: WorkspaceFooterProps) {
  const [shellInput, setShellInput] = useState('');
  const shellScrollRef = useRef<HTMLDivElement>(null);
  const logsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shellScrollRef.current) {
      shellScrollRef.current.scrollTop = shellScrollRef.current.scrollHeight;
    }
  }, [shellOutputs, activeShellId]);

  useEffect(() => {
    if (logsScrollRef.current) {
      logsScrollRef.current.scrollTop = logsScrollRef.current.scrollHeight;
    }
  }, [logs]);

  const togglePanel = (tab: 'terminal' | 'logs' | 'problems') => {
    if (isOpen && activeTab === tab) {
      setIsOpen(false);
    } else {
      setActiveTab(tab);
      setIsOpen(true);
    }
  };

  const handleShellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shellInput.trim() || !activeShellId) return;
    const input = shellInput.trim();
    setShellInput('');
    onShellInput(activeShellId, input);
  };

  return (
    <div className="flex flex-col shrink-0 border-t border-zinc-800 bg-[#09090B] relative z-20">
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 256, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex flex-col border-b border-zinc-800 overflow-hidden"
          >
            {/* Tab Row */}
            <div className="flex items-center h-9 shrink-0 border-b border-zinc-800 bg-[#111113] overflow-x-auto">
              <div className="flex px-2">
                {shellIds.map(shellId => (
                  <div
                    key={shellId}
                    onClick={() => setActiveShellId(shellId)}
                    className={`group flex items-center pr-2 pl-3 py-1 cursor-pointer border-r border-zinc-800 text-xs font-medium transition-colors ${
                      activeShellId === shellId ? 'bg-[#18181b] text-[#FAFAFA]' : 'text-zinc-500 hover:bg-[#18181b] hover:text-[#FAFAFA]'
                    }`}
                  >
                    <span className="mr-2">{shellId.replace('shell-', 'Shell ')}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseShell(shellId);
                      }}
                      className={`p-0.5 rounded-none-none hover:bg-zinc-700 ${activeShellId === shellId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={onNewShell}
                className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-[#FAFAFA] ml-1 rounded-none-none hover:bg-[#161618]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-[#0c0c0d] font-mono text-[13px] text-[#FAFAFA] p-2 overflow-y-auto w-full leading-relaxed custom-scrollbar">
              {activeTab === 'terminal' && activeShellId && (
                <div className="flex flex-col h-full">
                  <div ref={shellScrollRef} className="flex-1 overflow-y-auto">
                    {(shellOutputs[activeShellId] ?? []).map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap">{line}</div>
                    ))}
                  </div>
                  <form onSubmit={handleShellSubmit} className="flex items-center gap-2 mt-2">
                    <span className="text-[#A3E635]">$</span>
                    <input
                      type="text"
                      value={shellInput}
                      onChange={(e) => setShellInput(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-zinc-100 text-[13px] placeholder:text-zinc-700"
                      placeholder="Type command..."
                    />
                  </form>
                </div>
              )}
              {activeTab === 'terminal' && !activeShellId && (
                <div className="text-zinc-500">No active shell. Click + to open a new shell.</div>
              )}
              {activeTab === 'logs' && (
                <div ref={logsScrollRef} className="text-zinc-400 space-y-0.5">
                  {logs.length === 0 ? (
                    <div className="text-zinc-600">No logs yet.</div>
                  ) : (
                    logs.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap">{line}</div>
                    ))
                  )}
                </div>
              )}
              {activeTab === 'problems' && (
                <div className="text-zinc-400">
                  {problems.length === 0 ? (
                    <div className="flex font-mono items-center gap-2 mb-2 p-2 bg-[#111113] border border-zinc-800 rounded-none">
                       <CheckCircle2 className="w-4 h-4 text-[#A3E635]" />
                       <span className="text-sm">No problems have been detected in the workspace.</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {problems.map((p, i) => (
                        <div key={i} className="flex font-mono items-start gap-2 p-2 bg-[#111113] border border-zinc-800 rounded-none">
                          <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${p.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}`} />
                          <div className="text-sm">
                            <div className="text-[#FAFAFA] font-medium">{p.message}</div>
                            <div className="text-zinc-500 text-xs">{p.file}:{p.line}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* StatusBar */}
      <div className="h-6 flex items-center justify-between px-2 bg-[#09090B] border-t border-zinc-800 text-zinc-400 text-[11px] font-medium select-none transition-colors">
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-1 cursor-pointer hover:bg-[#161618] hover:text-[#FAFAFA] px-1.5 py-0.5 rounded-none transition-colors">
            <GitBranch className="w-3 h-3" />
            <span>{gitBranch || '—'}</span>
          </div>
          <button
            onClick={onRefreshGit}
            className="flex items-center gap-1 cursor-pointer hover:bg-[#161618] hover:text-[#FAFAFA] px-1.5 py-0.5 rounded-none transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>

          <div className="flex items-center ml-2 border-l border-zinc-700/50 pl-3 space-x-1">
            <button
              onClick={() => togglePanel('problems')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-none transition-colors ${isOpen && activeTab === 'problems' ? 'bg-zinc-800 text-[#FAFAFA]' : 'hover:bg-[#161618] hover:text-[#FAFAFA]'}`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>{problems.length}</span>
            </button>
            <button
              onClick={() => togglePanel('terminal')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-none transition-colors ${isOpen && activeTab === 'terminal' ? 'bg-zinc-800 text-[#FAFAFA]' : 'hover:bg-[#161618] hover:text-[#FAFAFA]'}`}
            >
              <TerminalSquare className="w-3 h-3" />
              <span>Terminal</span>
            </button>
            <button
              onClick={() => togglePanel('logs')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-none transition-colors ${isOpen && activeTab === 'logs' ? 'bg-zinc-800 text-[#FAFAFA]' : 'hover:bg-[#161618] hover:text-[#FAFAFA]'}`}
            >
              <List className="w-3 h-3" />
              <span>Logs</span>
            </button>
          </div>
        </div>

        <div className="flex items-center px-2 space-x-3">
          <div className="cursor-pointer hover:text-[#FAFAFA] transition-colors">UTF-8</div>
          <div className="cursor-pointer hover:text-[#FAFAFA] transition-colors">{language || '—'}</div>
        </div>
      </div>
    </div>
  );
}
