import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderGit2, Bot, Trash2, Plus, ChevronDown, FolderOpen, History, Loader2, FileCode, File, Settings } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface LeftSidebarProps {}

export function LeftSidebar({}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<'explorer' | 'agents'>('explorer');
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const { currentWorkspace, setCurrentWorkspace, recentWorkspaces, addRecentWorkspace, openTab } = useWorkspace();

  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);

  // Simulate loading when workspace changes
  React.useEffect(() => {
    if (currentWorkspace) {
      const waitTimer = setTimeout(() => setIsLoadingWorkspace(true), 0);
      const timer = setTimeout(() => {
        setIsLoadingWorkspace(false);
      }, 600);
      return () => { clearTimeout(waitTimer); clearTimeout(timer); };
    }
  }, [currentWorkspace]);

  const handleOpenFolder = () => {
    const dummyPath = '/Users/dev/another-project-' + Math.floor(Math.random() * 100);
    setCurrentWorkspace(dummyPath);
    addRecentWorkspace(dummyPath);
    setIsWorkspaceMenuOpen(false);
  };

  const handleSelectRecent = (path: string) => {
    setCurrentWorkspace(path);
    addRecentWorkspace(path);
    setIsWorkspaceMenuOpen(false);
  };

  return (
    <div className="h-full flex flex-col w-full bg-[#0c0c0e]">
      {/* Workspace Selector */}
      <div className="relative shrink-0 border-b border-zinc-800/80 bg-zinc-950/50 p-2">
        <button
          onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800/50 group"
        >
          <div className="flex items-center overflow-hidden">
            <FolderGit2 className="w-4 h-4 text-indigo-400 mr-2 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-zinc-200 truncate">
              {currentWorkspace ? currentWorkspace.split('/').pop() : 'No Workspace'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isWorkspaceMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isWorkspaceMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/20"
                onClick={() => setIsWorkspaceMenuOpen(false)}
              />
              
              {/* Dropdown Menu */}
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute top-14 left-2 right-2 z-50 bg-[#111113] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="p-1">
                  <button
                    onClick={handleOpenFolder}
                    className="w-full flex items-center px-3 py-2 text-sm text-zinc-200 hover:bg-indigo-500/10 hover:text-indigo-400 rounded-lg transition-colors group"
                  >
                    <FolderOpen className="w-4 h-4 mr-2 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                    Open Another Folder...
                  </button>
                </div>
                
                {recentWorkspaces.filter(w => w !== currentWorkspace).length > 0 && (
                  <>
                    <div className="h-px bg-zinc-800/50 my-1 flex items-center justify-center">
                      <span className="bg-[#111113] px-2 text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Recent</span>
                    </div>
                    <div className="p-1 max-h-48 overflow-y-auto">
                      {recentWorkspaces.filter(w => w !== currentWorkspace).map((path) => (
                        <button
                          key={path}
                          onClick={() => handleSelectRecent(path)}
                          className="w-full flex items-center px-3 py-2 text-left text-sm hover:bg-zinc-800/50 rounded-lg transition-colors group"
                        >
                          <History className="w-3.5 h-3.5 mr-2 text-zinc-500 group-hover:text-zinc-400 shrink-0" />
                          <span className="truncate text-zinc-400 group-hover:text-zinc-200">
                            {path.split('/').pop()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/80 bg-[#0c0c0e] shrink-0 pt-2 px-2 gap-2">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`flex items-center pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'explorer' 
              ? 'border-indigo-500 text-zinc-100' 
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
          Explorer
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`flex items-center pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'agents' 
              ? 'border-indigo-500 text-zinc-100' 
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Bot className="w-3.5 h-3.5 mr-1.5" />
          Agents
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'explorer' && (
          <div className="flex flex-col h-full animate-in fade-in-50 duration-200">
            <div className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50 shrink-0 flex items-center justify-between">
               <span>Working Directory</span>
               {isLoadingWorkspace && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
            </div>
            
            <div className="p-4 text-sm font-mono text-zinc-400">
              {isLoadingWorkspace ? (
                <div className="flex flex-col items-center justify-center text-center text-zinc-500 text-xs py-8 space-y-2 opacity-50">
                   <div className="flex space-x-1">
                     <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                     <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                     <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce"></span>
                   </div>
                   <div>Reading tree...</div>
                </div>
              ) : (
                <>
                  <div className="flex items-center mb-2 hover:text-zinc-300 cursor-pointer transition-colors duration-150">
                    <FolderOpen className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                    src/
                  </div>
                  <div 
                    onClick={() => openTab({ id: 'file-main.rs', type: 'file', title: 'main.rs', data: 'src/main.rs' })}
                    className="flex items-center ml-4 mb-2 hover:text-emerald-400 cursor-pointer transition-colors duration-150"
                  >
                    <FileCode className="w-3.5 h-3.5 mr-2" />
                    main.rs
                  </div>
                  <div 
                    onClick={() => openTab({ id: 'file-lib.rs', type: 'file', title: 'lib.rs', data: 'src/lib.rs' })}
                    className="flex items-center ml-4 mb-2 hover:text-zinc-300 cursor-pointer transition-colors duration-150"
                  >
                    <FileCode className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                    lib.rs
                  </div>
                  <div 
                    onClick={() => openTab({ id: 'file-cargo.toml', type: 'file', title: 'Cargo.toml', data: 'Cargo.toml' })}
                    className="flex items-center mb-2 hover:text-zinc-300 cursor-pointer transition-colors duration-150"
                  >
                    <Settings className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                    Cargo.toml
                  </div>
                  <div 
                    onClick={() => openTab({ id: 'file-env', type: 'file', title: '.env', data: '.env' })}
                    className="flex items-center hover:text-zinc-300 cursor-pointer transition-colors duration-150"
                  >
                    <File className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                    .env
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="flex flex-col h-full animate-in fade-in-50 duration-200 relative">
            <div className="p-3">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 px-1">Configured Agents</div>
              <div className="space-y-1">
                <div
                  className="group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors bg-[#111113] border border-indigo-500/30 hover:border-indigo-500/50"
                  onClick={() => openTab({ id: 'agent-manager', type: 'agent-manager', title: 'Agent Manager' })}
                >
                  <div className="flex items-center min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mr-3 shrink-0" />
                    <div className="truncate text-sm font-medium text-zinc-200">Claude Code</div>
                  </div>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded ml-2 shrink-0">Default</span>
                </div>
                
                <div
                  className="group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors hover:bg-zinc-800/50"
                  onClick={() => openTab({ id: 'agent-manager', type: 'agent-manager', title: 'Agent Manager' })}
                >
                  <div className="flex items-center min-w-0">
                    <div className="w-2 h-2 rounded-full bg-zinc-600 mr-3 shrink-0" />
                    <div className="truncate text-sm font-medium text-zinc-400 group-hover:text-zinc-300">Aider</div>
                  </div>
                </div>

                <div
                  className="group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors hover:bg-zinc-800/50"
                  onClick={() => openTab({ id: 'agent-manager', type: 'agent-manager', title: 'Agent Manager' })}
                >
                  <div className="flex items-center min-w-0">
                    <div className="w-2 h-2 rounded-full bg-zinc-600 mr-3 shrink-0" />
                    <div className="truncate text-sm font-medium text-zinc-400 group-hover:text-zinc-300">Local Ollama</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
