import React, { useState } from 'react';
import { TerminalSquare, AlertCircle, List, X, Plus, GitBranch, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WorkspaceFooterProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: 'terminal' | 'logs' | 'problems';
  setActiveTab: (tab: 'terminal' | 'logs' | 'problems') => void;
}

export function WorkspaceFooter({ isOpen, setIsOpen, activeTab, setActiveTab }: WorkspaceFooterProps) {
  const [tabs, setTabs] = useState([{ id: '1', title: 'Agent Raw Logs' }, { id: '2', title: 'Local Shell 1' }]);
  const [activeTerminalId, setActiveTerminalId] = useState('1');

  const togglePanel = (tab: 'terminal' | 'logs' | 'problems') => {
    if (isOpen && activeTab === tab) {
      setIsOpen(false);
    } else {
      setActiveTab(tab);
      setIsOpen(true);
    }
  };

  return (
    <div className="flex flex-col shrink-0 border-t border-zinc-800 bg-[#0c0c0e] relative z-20">
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
                {tabs.map(tab => (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTerminalId(tab.id)}
                    className={`group flex items-center pr-2 pl-3 py-1 cursor-pointer border-r border-zinc-800 text-xs font-medium transition-colors ${
                      activeTerminalId === tab.id ? 'bg-[#18181b] text-zinc-200' : 'text-zinc-500 hover:bg-[#18181b] hover:text-zinc-300'
                    }`}
                  >
                    <span className="mr-2">{tab.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTabs(tabs.filter(t => t.id !== tab.id));
                      }}
                      className={`p-0.5 rounded-sm hover:bg-zinc-700 ${activeTerminalId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const newId = Date.now().toString();
                  setTabs([...tabs, { id: newId, title: 'New Shell' }]);
                  setActiveTerminalId(newId);
                }}
                className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-300 ml-1 rounded-sm hover:bg-zinc-800"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-[#0c0c0d] font-mono text-[13px] text-zinc-300 p-2 overflow-y-auto w-full leading-relaxed custom-scrollbar">
              {activeTab === 'terminal' && activeTerminalId === '1' && (
                <div>
                  <div className="text-zinc-500">Welcome to AI Studio Local Terminal</div>
                  <div className="flex"><span className="text-emerald-400 mr-2">$</span> cargo check --workspace</div>
                  <div className="text-zinc-400">&gt; Checking auth v0.1.0</div>
                  <div className="text-zinc-400">&gt; Checking queue_manager v0.2.1</div>
                  <div className="text-emerald-400 font-bold">&gt; Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.42s</div>
                  <div className="flex"><span className="text-emerald-400 mr-2">$</span> <span className="animate-pulse">_</span></div>
                </div>
              )}
              {activeTab === 'terminal' && activeTerminalId !== '1' && (
                <div>
                  <div className="flex"><span className="text-emerald-400 mr-2">$</span> <span className="animate-pulse">_</span></div>
                </div>
              )}
              {activeTab === 'logs' && (
                <div className="text-zinc-400">
                  <div>[2026-05-03T03:45:50Z INFO ] Agent connected to workspace.</div>
                  <div>[2026-05-03T03:45:52Z DEBUG] Watcher detected changes in src/main.rs.</div>
                  <div>[2026-05-03T03:45:55Z INFO ] Attempting to parse modified AST...</div>
                </div>
              )}
              {activeTab === 'problems' && (
                <div className="text-zinc-400">
                  <div className="flex font-sans items-center gap-2 mb-2 p-2 bg-zinc-900 border border-zinc-800 rounded">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                     <span className="text-sm">No problems have been detected in the workspace.</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* StatusBar */}
      <div className="h-6 flex items-center justify-between px-2 bg-zinc-950 border-t border-zinc-800 text-zinc-400 text-[11px] font-medium select-none transition-colors">
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-1 cursor-pointer hover:bg-zinc-800 hover:text-zinc-200 px-1.5 py-0.5 rounded transition-colors">
            <GitBranch className="w-3 h-3" />
            <span>main</span>
          </div>
          <div className="flex items-center gap-1 cursor-pointer hover:bg-zinc-800 hover:text-zinc-200 px-1.5 py-0.5 rounded transition-colors">
            <RefreshCw className="w-3 h-3" />
          </div>
          
          <div className="flex items-center ml-2 border-l border-zinc-700/50 pl-3 space-x-1">
            <button 
              onClick={() => togglePanel('problems')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${isOpen && activeTab === 'problems' ? 'bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>0</span>
            </button>
            <button 
              onClick={() => togglePanel('terminal')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${isOpen && activeTab === 'terminal' ? 'bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            >
              <TerminalSquare className="w-3 h-3" />
              <span>Terminal</span>
            </button>
            <button 
              onClick={() => togglePanel('logs')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${isOpen && activeTab === 'logs' ? 'bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            >
              <List className="w-3 h-3" />
              <span>Logs</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center px-2 space-x-3">
          <div className="cursor-pointer hover:text-gray-200 transition-colors">UTF-8</div>
          <div className="cursor-pointer hover:text-gray-200 transition-colors">Rust</div>
        </div>
      </div>
    </div>
  );
}
