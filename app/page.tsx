'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Settings, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Plus, X, MessageSquare, Code2, Bot, History } from 'lucide-react';
// Resizable panels removed from main workspace to keep right panel fixed when toggling sidebar
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { LeftSidebar } from '@/components/LeftSidebar';
import { SettingsModal } from '@/components/SettingsModal';
import { WorkspaceFooter } from '@/components/WorkspaceFooter';
import { useWorkspace, ChatMessage } from '@/contexts/WorkspaceContext';
import { AgentManager } from '@/components/AgentManager';
import { FileViewer } from '@/components/FileViewer';
import { AgentConsoleInput } from '@/components/AgentConsoleInput';
import { useAgentProcess } from '@/hooks/useAgentProcess';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ansiToHtml } from '@/lib/ansi';
import { invoke } from '@tauri-apps/api/core';

interface Problem {
  file: string;
  line: number;
  message: string;
  severity: string;
}

function AnsiMessage({ content, role }: { content: string; role: 'user' | 'agent' | 'system' }) {
  const html = role === 'agent' ? ansiToHtml(content) : content;
  return (
    <div
      className={cn(
        "text-sm whitespace-pre-wrap leading-relaxed",
        role === 'user' ? "text-[#A3E635]" : role === 'agent' ? "text-[#FAFAFA]" : "text-zinc-500 italic"
      )}
      dangerouslySetInnerHTML={role === 'agent' ? { __html: html } : undefined}
    >
      {role !== 'agent' ? html : null}
    </div>
  );
}

const AGENT_SESSION_ID = 'agent';

export default function Page() {
  const {
    currentWorkspace,
    tabs,
    activeTabId,
    openTab,
    closeTab,
    setActiveTabId,
    agents,
    activeAgentId,
    agentMessages,
    setAgentMessages,
    clearAgentMessages,
    markTabDirty,
  } = useWorkspace();



  const [showSettings, setShowSettings] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(260);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'logs' | 'problems'>('terminal');

  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);

  const [shellOutputs, setShellOutputs] = useState<Record<string, string[]>>({});
  const [activeShellId, setActiveShellId] = useState<string | null>(null);
  const [shellIds, setShellIds] = useState<string[]>(['shell-1']);

  const [agentInput, setAgentInput] = useState('');
  const [showAgentHistory, setShowAgentHistory] = useState(false);
  const [agentMode, setAgentMode] = useState<'Plan' | 'Edit' | 'Chat'>('Edit');

  const [gitBranch, setGitBranch] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [activeFileLanguage, setActiveFileLanguage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Auto-scroll agent console
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  const handleOutput = useCallback((sessionId: string, chunk: string) => {
    if (sessionId === AGENT_SESSION_ID) {
      setAgentMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'agent') {
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
        }
        return [...prev, { role: 'agent', content: chunk }];
      });
      setLogs(prev => {
        const line = `[${new Date().toISOString()}] ${chunk.trim()}`;
        return [...prev, line];
      });
    } else if (sessionId.startsWith('shell-')) {
      setShellOutputs(prev => {
        const existing = prev[sessionId] ?? [];
        return { ...prev, [sessionId]: [...existing, chunk] };
      });
    } else if (sessionId.startsWith('terminal-')) {
      setTerminalOutput(prev => [...prev, chunk]);
      setLogs(prev => {
        const line = `[${new Date().toISOString()}] [terminal] ${chunk.trim()}`;
        return [...prev, line];
      });
    }
  }, []);

  const { spawn, spawnShell, send, kill, killAll, isRunning } = useAgentProcess(handleOutput);

  const refreshGitBranch = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const branch = await invoke<string>('git_branch', { cwd: currentWorkspace });
      setGitBranch(branch);
    } catch {
      setGitBranch('');
    }
  }, [currentWorkspace]);

  const refreshProblems = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const probs = await invoke<Problem[]>('check_problems', { cwd: currentWorkspace });
      setProblems(probs);
    } catch {
      setProblems([]);
    }
  }, [currentWorkspace]);

  const refreshLanguage = useCallback(async () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab?.type === 'file' && activeTab.data) {
      try {
        const lang = await invoke<string>('get_language_for_file', { path: activeTab.data });
        setActiveFileLanguage(lang);
      } catch {
        setActiveFileLanguage('Plain Text');
      }
    } else {
      setActiveFileLanguage('');
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    refreshGitBranch().catch(() => {});
    refreshProblems().catch(() => {});
  }, [currentWorkspace, refreshGitBranch, refreshProblems]);

  useEffect(() => {
    refreshLanguage().catch(() => {});
  }, [activeTabId, tabs, refreshLanguage]);

  const handleAgentSubmit = async () => {
    if (!agentInput.trim()) return;
    const rawInput = agentInput.trim();
    let input = rawInput;
    setAgentInput('');

    // Prepend mode instruction if this is the first user message
    const userMessages = agentMessages.filter(m => m.role === 'user');
    if (userMessages.length === 0) {
      const modeInstructions: Record<string, string> = {
        Plan: 'You are in PLAN mode. Do not write code. Only describe the approach.\n\n',
        Edit: 'You are in EDIT mode. You may read and modify files.\n\n',
        Chat: 'You are in CHAT mode. Answer questions only.\n\n',
      };
      input = (modeInstructions[agentMode] || '') + input;
    }

    // Prepend system prompt if agent has one and this is first message
    const agent = agents.find(a => a.id === activeAgentId);
    if (agent?.systemPrompt && userMessages.length === 0) {
      input = agent.systemPrompt + '\n\n' + input;
    }

    setAgentMessages(prev => [...prev, { role: 'user', content: rawInput }]);

    if (!isRunning) {
      if (agent && currentWorkspace) {
        try {
          await spawn(AGENT_SESSION_ID, agent.command, agent.args, currentWorkspace);
          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          setAgentMessages(prev => [...prev, { role: 'system', content: `Failed to start agent: ${err}` }]);
          return;
        }
      } else if (!agent) {
        setAgentMessages(prev => [...prev, { role: 'system', content: 'No agent selected. Please configure an agent first.' }]);
        return;
      } else if (!currentWorkspace) {
        setAgentMessages(prev => [...prev, { role: 'system', content: 'No workspace open. Please open a folder first.' }]);
        return;
      }
    }

    try {
      await send(AGENT_SESSION_ID, input);
    } catch (err) {
      setAgentMessages(prev => [...prev, { role: 'system', content: `Error: ${err}` }]);
    }
  };

  const handleAgentStop = async () => {
    try {
      await kill(AGENT_SESSION_ID);
      setAgentMessages(prev => [...prev, { role: 'system', content: 'Agent process stopped.' }]);
    } catch (err) {
      setAgentMessages(prev => [...prev, { role: 'system', content: `Failed to stop: ${err}` }]);
    }
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim() || !currentWorkspace) return;
    const cmd = terminalInput.trim();
    setTerminalInput('');

    if (!terminalSessionId) {
      const sessionId = 'terminal-1';
      setTerminalSessionId(sessionId);
      try {
        await spawnShell(sessionId, currentWorkspace);
      } catch (err) {
        setTerminalOutput(prev => [...prev, `Failed to start terminal: ${err}`]);
        return;
      }
      // Wait a moment for shell to spawn
      await new Promise(r => setTimeout(r, 300));
    }

    try {
      if (terminalSessionId) {
        await send(terminalSessionId, cmd);
      }
    } catch (err) {
      setTerminalOutput(prev => [...prev, `Error: ${err}`]);
    }
  };

  const handleNewShell = async () => {
    if (!currentWorkspace) return;
    const newId = `shell-${Date.now()}`;
    setShellIds(prev => [...prev, newId]);
    setActiveShellId(newId);
    setShellOutputs(prev => ({ ...prev, [newId]: [`Shell started in ${currentWorkspace}`] }));
    try {
      await spawnShell(newId, currentWorkspace);
    } catch (err) {
      setShellOutputs(prev => ({ ...prev, [newId]: [...(prev[newId] ?? []), `Failed to start shell: ${err}`] }));
    }
  };

  const handleShellInput = async (shellId: string, input: string) => {
    if (!input.trim()) return;
    try {
      await send(shellId, input);
    } catch (err) {
      setShellOutputs(prev => ({ ...prev, [shellId]: [...(prev[shellId] ?? []), `Error: ${err}`] }));
    }
  };

  const handleCloseShell = (shellId: string) => {
    setShellIds(prev => {
      const next = prev.filter(id => id !== shellId);
      if (activeShellId === shellId) {
        setActiveShellId(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
    setShellOutputs(prev => {
      const next = { ...prev };
      delete next[shellId];
      return next;
    });
    kill(shellId).catch(() => {});
  };

  const handleRestoreHistory = (content: string) => {
    setAgentInput(content);
    setShowAgentHistory(false);
  };

  const handleNewSession = () => {
    clearAgentMessages();
    if (isRunning) {
      kill(AGENT_SESSION_ID).catch(() => {});
    }
    setShowAgentHistory(false);
  };

  const startResizingLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPanelWidth;
    const panel = leftPanelRef.current;
    if (!panel) return;

    panel.style.transition = 'none';

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(400, startWidth + e.clientX - startX));
      panel.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      panel.style.transition = '';
      const finalWidth = parseInt(panel.style.width || `${leftPanelWidth}`);
      setLeftPanelWidth(finalWidth);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [leftPanelWidth]);

  const startResizingRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;
    const panel = rightPanelRef.current;
    if (!panel) return;

    panel.style.transition = 'none';

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(600, startWidth + startX - e.clientX));
      panel.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      panel.style.transition = '';
      const finalWidth = parseInt(panel.style.width || `${rightPanelWidth}`);
      setRightPanelWidth(finalWidth);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [rightPanelWidth]);

  if (!currentWorkspace) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#09090B] overflow-hidden font-mono text-[#FAFAFA]">

      {/* Top Navbar */}
      <header className="h-12 border-b border-[#27272A] bg-[#09090B] flex items-center justify-between px-4 shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <img src="/logo/logo.svg" alt="Maestro" className="w-6 h-6 shrink-0" />
          <button
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            className="text-zinc-500 hover:text-[#FAFAFA] transition-colors flex items-center justify-center p-1.5 rounded-none hover:bg-[#161618]"
          >
            {isLeftSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-400">
            <Terminal className="w-4 h-4 text-[#A3E635]" />
            <span className="max-w-[200px] truncate">{currentWorkspace.split(/[/\\]/).pop()}</span>
          </div>

          <button
             onClick={() => openTab({ id: 'agent-manager', type: 'agent-manager', title: 'Agent Manager' })}
             className="group flex items-center gap-1.5 text-xs font-bold text-black ml-4 px-3 py-1.5 rounded-none border-2 border-black bg-[#A3E635] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0"
             style={{ boxShadow: '3px 3px 0px #000000' }}
             onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '5px 5px 0px #000000'; }}
             onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '3px 3px 0px #000000'; }}
             onMouseDown={(e) => { e.currentTarget.style.boxShadow = '1px 1px 0px #000000'; }}
             onMouseUp={(e) => { e.currentTarget.style.boxShadow = '5px 5px 0px #000000'; }}
          >
             <Bot className="w-3.5 h-3.5 mr-1.5" />
             Agents & Skills
          </button>

          <button
             onClick={() => openTab({ id: 'cli-terminal', type: 'terminal', title: 'CLI Output' })}
             className="group flex items-center gap-1.5 text-xs font-bold text-[#FAFAFA] hover:text-[#FAFAFA] ml-2 border-2 border-black bg-[#111113] px-3 py-1.5 rounded-none transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0"
             style={{ boxShadow: '3px 3px 0px #000000' }}
             onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '5px 5px 0px #000000'; }}
             onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '3px 3px 0px #000000'; }}
             onMouseDown={(e) => { e.currentTarget.style.boxShadow = '1px 1px 0px #000000'; }}
             onMouseUp={(e) => { e.currentTarget.style.boxShadow = '5px 5px 0px #000000'; }}
          >
             <Terminal className="w-3.5 h-3.5 mr-1.5" />
             Open CLI
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-none bg-[#A3E635]/10 border border-[#A3E635]/20 text-xs font-bold tracking-wider",
            isRunning ? "text-[#A3E635]" : "text-zinc-500"
          )}>
             <div className={cn("w-1.5 h-1.5 rounded-none animate-pulse", isRunning ? "bg-[#A3E635]" : "bg-zinc-600")} />
             {isRunning ? 'Agent Running' : 'Core Online'}
          </div>
          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className="text-zinc-500 hover:text-[#FAFAFA] transition-colors flex items-center justify-center p-1.5 rounded-none hover:bg-[#161618]"
          >
            {isRightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-zinc-500 hover:text-[#FAFAFA] transition-colors p-1.5 rounded-none hover:bg-[#161618]"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-[#09090B] relative">
        {/* Grid background - same as splash */}
        <div
          className="absolute inset-0 pointer-events-none animate-[gridPulse_4s_ease-in-out_infinite]"
          style={{
            backgroundImage: 'linear-gradient(to right, #27272A 1px, transparent 1px), linear-gradient(to bottom, #27272A 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            opacity: 0.4,
          }}
        />
        <div className="flex-1 flex w-full h-full overflow-hidden relative z-10">
          {/* LEFT PANE: Directory/File Tree (Collapsible) */}
          <div
            ref={leftPanelRef}
            className="overflow-hidden shrink-0 flex flex-col bg-[#09090B] border-r border-zinc-800"
            style={{
              width: isLeftSidebarOpen ? leftPanelWidth : 0,
              opacity: isLeftSidebarOpen ? 1 : 0,
              transition: 'width 0.3s ease-in-out, opacity 0.3s ease-in-out',
            }}
          >
            <LeftSidebar />
          </div>
          <div
            className="overflow-hidden shrink-0"
            style={{
              width: isLeftSidebarOpen ? 3 : 0,
              opacity: isLeftSidebarOpen ? 1 : 0,
              transition: 'width 0.3s ease-in-out, opacity 0.3s ease-in-out',
            }}
          >
            <div
              onMouseDown={startResizingLeft}
              className="w-[3px] h-full cursor-col-resize hover:bg-[#A3E635]/50 bg-zinc-800 transition-colors z-10"
            />
          </div>

          {/* MAIN WORKSPACE: Center + Right */}
          <div className="flex-1 flex w-full h-full">
          <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] overflow-hidden relative border-r border-zinc-800">
             {/* Center Tabs Header */}
             <div className="flex bg-[#09090B] border-b border-zinc-800/80 overflow-x-auto custom-scrollbar shrink-0">
               {tabs.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTabId(tab.id)}
                   className={cn(
                     "px-4 py-2.5 text-xs font-medium border-r border-zinc-800/50 flex items-center min-w-[140px] max-w-[200px] group transition-colors relative",
                     activeTabId === tab.id ? "bg-[#111113] text-[#FAFAFA]" : "bg-[#09090B] text-zinc-500 hover:bg-[#161618]"
                   )}
                 >
                   {activeTabId === tab.id && <div className="absolute top-0 left-0 w-full h-0.5 bg-[#A3E635]" />}
                   {tab.type === 'file' && <Code2 className="w-3.5 h-3.5 mr-2 shrink-0" />}
                   {tab.type === 'agent-manager' && <Bot className="w-3.5 h-3.5 mr-2 shrink-0" />}
                   {tab.type === 'terminal' && <Terminal className="w-3.5 h-3.5 mr-2 shrink-0" />}
                   <span className="truncate flex-1 text-left">{tab.title}{tab.isDirty ? ' ●' : ''}</span>
                   <X
                     className="w-3.5 h-3.5 ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity shrink-0"
                     onClick={(e) => {
                       e.stopPropagation();
                       if (tab.isDirty) {
                         const confirmed = window.confirm(`"${tab.title}" has unsaved changes. Close anyway?`);
                         if (!confirmed) return;
                       }
                       closeTab(tab.id);
                     }}
                   />
                 </button>
               ))}
             </div>

             {/* Dynamic Center Pane Content */}
             <div className="flex-1 w-full h-full overflow-hidden relative">
               {tabs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-sm font-mono">
                    <Code2 className="w-12 h-12 text-[#27272A] mb-4" />
                    <span className="text-[#FAFAFA]">Select a file to start editing or manage agents.</span>
                  </div>
               ) : tabs.map(tab => (
                 <div
                   key={tab.id}
                   className={cn("absolute inset-0 z-0 bg-[#09090B]", activeTabId === tab.id && "z-10")}
                   style={{ display: activeTabId === tab.id ? 'flex' : 'none', flexDirection: 'column' }}
                 >
                   {tab.type === 'agent-manager' && <AgentManager />}
                   {tab.type === 'file' && (
                     <FileViewer
                       filePath={tab.data || tab.title}
                       onDirtyChange={(dirty) => markTabDirty(tab.id, dirty)}
                     />
                   )}
                   {tab.type === 'terminal' && (
                     <div className="flex flex-col h-full bg-[#09090B] text-[#FAFAFA] font-mono text-sm p-4">
                       <div className="flex-1 overflow-y-auto space-y-1 pb-4">
                         {terminalOutput.map((line, i) => (
                           <div key={i} className="whitespace-pre-wrap">{line}</div>
                         ))}
                       </div>
                       <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 border-t border-zinc-800 pt-4 mt-auto shrink-0">
                         <span className="text-[#A3E635] font-bold">$</span>
                         <input
                           type="text"
                           value={terminalInput}
                           onChange={(e) => setTerminalInput(e.target.value)}
                           className="flex-1 bg-transparent border-none outline-none text-[#FAFAFA] placeholder:text-zinc-700"
                           autoFocus
                           placeholder="Type command..."
                         />
                       </form>
                     </div>
                   )}
                   {tab.type === 'diff' && (
                     <div className="flex flex-col h-full bg-[#09090B] text-[#FAFAFA] p-4">
                       <div className="text-sm text-zinc-500 mb-2">Diff View</div>
                       <div className="flex-1 border border-zinc-800 rounded-sm p-4 font-mono text-sm whitespace-pre-wrap">
                         {tab.data ? tab.data : 'No diff content available.'}
                       </div>
                     </div>
                   )}
                 </div>
               ))}
             </div>
          </div>

           <div
             className="overflow-hidden shrink-0"
             style={{
               width: isRightPanelOpen ? 3 : 0,
               opacity: isRightPanelOpen ? 1 : 0,
               transition: 'width 0.3s ease-in-out, opacity 0.3s ease-in-out',
             }}
           >
             <div
               onMouseDown={startResizingRight}
               className="w-[3px] h-full cursor-col-resize hover:bg-[#A3E635]/50 bg-zinc-800 transition-colors z-10"
             />
           </div>

           <div
             ref={rightPanelRef}
             className="overflow-hidden shrink-0 flex flex-col bg-[#09090B] relative border-l border-zinc-800"
             style={{
               width: isRightPanelOpen ? rightPanelWidth : 0,
               opacity: isRightPanelOpen ? 1 : 0,
               transition: 'width 0.3s ease-in-out, opacity 0.3s ease-in-out',
             }}
           >
             <div className="h-12 border-b border-zinc-800/80 shrink-0 flex items-center justify-between px-4 bg-[#09090B] z-30 relative">
               <div className="flex items-center">
                 <Terminal className="w-4 h-4 text-[#A3E635] mr-2" />
                 <span className="text-xs font-bold text-[#FAFAFA]">Agent Console</span>
                 <span className="inline-block w-[8px] h-[14px] bg-[#A3E635] ml-1.5 animate-[blink_1s_step-end_infinite]" />
               </div>
               <button
                 onClick={() => setShowAgentHistory(!showAgentHistory)}
                 className="text-xs font-bold text-zinc-400 hover:text-[#FAFAFA] flex items-center transition-colors px-2 py-1 rounded-none hover:bg-[#161618]"
               >
                 <History className="w-3.5 h-3.5 mr-1.5" />
                 History
               </button>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#09090B] relative">
               <AnimatePresence>
                 {showAgentHistory && (
                   <>
                     <motion.div
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       onClick={() => setShowAgentHistory(false)}
                       className="absolute inset-0 bg-[#09090B]/40 z-10 backdrop-blur-sm"
                     />
                     <motion.div
                         initial={{ y: "-100%" }}
                         animate={{ y: 0 }}
                         exit={{ y: "-100%" }}
                         transition={{ type: "spring", stiffness: 300, damping: 30 }}
                         className="absolute top-0 left-0 right-0 z-20 bg-[#111113] border-b border-zinc-800/80 shadow-2xl overflow-hidden rounded-b-sm"
                     >
                       <div className="p-3">
                         <button
                           onClick={handleNewSession}
                           className="w-full flex items-center justify-center gap-2 py-2 mb-3 bg-[#A3E635]/10 text-[#A3E635] hover:bg-[#A3E635]/20 border border-[#A3E635]/20 rounded-md text-sm font-medium transition-colors"
                         >
                           <Plus className="w-4 h-4" />
                           New Session
                         </button>

                         <div className="space-y-1">
                           {agentMessages.filter(m => m.role === 'user').map((msg, idx) => (
                             <div
                               key={idx}
                               onClick={() => handleRestoreHistory(msg.content)}
                               className="group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors text-zinc-400 hover:bg-zinc-800/50 hover:text-[#FAFAFA]"
                             >
                               <div className="flex items-center truncate mr-2">
                                  <MessageSquare className="w-3.5 h-3.5 mr-2 shrink-0 text-zinc-500" />
                                  <span className="text-sm truncate">{msg.content.slice(0, 40)}{msg.content.length > 40 ? '...' : ''}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     </motion.div>
                   </>
                 )}
               </AnimatePresence>

                {agentMessages.map((msg, i) => (
                  <div key={i} className="text-sm">
                    {msg.role === 'user' ? <div className="font-semibold text-xs mb-1 text-[#A3E635]">User</div> : msg.role === 'agent' ? <div className="font-semibold text-xs mb-1 text-[#A3E635]">Agent</div> : null}
                    <AnsiMessage content={msg.content} role={msg.role} />
                  </div>
                ))}
                <div ref={messagesEndRef} />
             </div>

             <div className="p-4 border-t border-zinc-800/80 bg-[#09090B] shrink-0 min-h-0">
               <AgentConsoleInput
                 value={agentInput}
                 onChange={setAgentInput}
                 onSubmit={handleAgentSubmit}
                 onStop={handleAgentStop}
                 isRunning={isRunning}
                 mode={agentMode}
                 onModeChange={setAgentMode}
                 onOpenSettings={() => setShowSettings(true)}
               />
             </div>
           </div>
        </div>
        </div>

        {/* BOTTOM PANEL & STATUS BAR */}
        <WorkspaceFooter
          isOpen={isBottomPanelOpen}
          setIsOpen={setIsBottomPanelOpen}
          activeTab={activeBottomTab}
          setActiveTab={setActiveBottomTab}
          shellIds={shellIds}
          activeShellId={activeShellId}
          setActiveShellId={setActiveShellId}
          shellOutputs={shellOutputs}
          onNewShell={handleNewShell}
          onShellInput={handleShellInput}
          onCloseShell={handleCloseShell}
          logs={logs}
          problems={problems}
          gitBranch={gitBranch}
          language={activeFileLanguage}
          onRefreshGit={refreshGitBranch}
          onRefreshProblems={refreshProblems}
        />
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
