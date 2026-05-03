'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Settings, PanelLeftClose, PanelLeft, Plus, X, MessageSquare, Code2, Bot, History } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { LeftSidebar } from '@/components/LeftSidebar';
import { SettingsModal } from '@/components/SettingsModal';
import { WorkspaceFooter } from '@/components/WorkspaceFooter';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { AgentManager } from '@/components/AgentManager';
import { CodeEditor } from '@/components/CodeEditor';
import { AgentConsoleInput } from '@/components/AgentConsoleInput';
import { useAgentProcess } from '@/hooks/useAgentProcess';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ansiToHtml } from '@/lib/ansi';

interface ChatMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
}

function AnsiMessage({ content, role }: { content: string; role: 'user' | 'agent' | 'system' }) {
  const html = role === 'agent' ? ansiToHtml(content) : content;
  return (
    <div
      className={cn(
        "text-sm whitespace-pre-wrap leading-relaxed",
        role === 'user' ? "text-indigo-300" : role === 'agent' ? "text-zinc-300" : "text-zinc-500 italic"
      )}
      dangerouslySetInnerHTML={role === 'agent' ? { __html: html } : undefined}
    >
      {role !== 'agent' ? html : null}
    </div>
  );
}

export default function Page() {
  const { currentWorkspace, tabs, activeTabId, openTab, closeTab, setActiveTabId, agents, activeAgentId } = useWorkspace();
  const [showSettings, setShowSettings] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'logs' | 'problems'>('terminal');

  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'Initializing AI Agent runtime...',
    'Loading workspace environment...',
    'Ready. Waiting for commands...'
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  const [agentMessages, setAgentMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'Agent session initialized. Awaiting instructions...' }
  ]);
  const [agentInput, setAgentInput] = useState('');
  const [showAgentHistory, setShowAgentHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleAgentOutput = useCallback((chunk: string) => {
    setAgentMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'agent') {
        return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
      }
      return [...prev, { role: 'agent', content: chunk }];
    });
  }, []);

  const { spawn, send, kill, isRunning } = useAgentProcess(handleAgentOutput);

  // Auto-scroll agent console
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  const handleAgentSubmit = async () => {
    if (!agentInput.trim()) return;
    const input = agentInput.trim();
    setAgentMessages(prev => [...prev, { role: 'user', content: input }]);
    setAgentInput('');

    if (!isRunning) {
      const agent = agents.find(a => a.id === activeAgentId);
      if (agent && currentWorkspace) {
        try {
          await spawn(agent.command, agent.args, currentWorkspace);
          // Small delay to ensure process is ready
          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          console.error('Failed to spawn agent:', err);
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
      await send(input);
    } catch (err) {
      console.error('Failed to send input:', err);
      setAgentMessages(prev => [...prev, { role: 'system', content: `Error: ${err}` }]);
    }
  };

  const handleAgentStop = async () => {
    try {
      await kill();
      setAgentMessages(prev => [...prev, { role: 'system', content: 'Agent process stopped.' }]);
    } catch (err) {
      console.error('Failed to stop agent:', err);
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    setTerminalOutput(prev => [...prev, `$ ${terminalInput}`]);
    const cmd = terminalInput.trim();
    setTerminalInput('');
    
    setTimeout(() => {
      setTerminalOutput(prev => [...prev, `Executing: ${cmd}...`, 'Done.']);
    }, 500);
  };

  if (!currentWorkspace) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0b] overflow-hidden font-sans text-zinc-300">
      
      {/* Top Navbar */}
      <header className="h-12 border-b border-zinc-800 bg-[#0c0c0e] flex items-center justify-between px-4 shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center p-1.5 rounded-md hover:bg-zinc-900"
          >
            {isLeftSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
            <Terminal className="w-4 h-4 text-zinc-500" />
            <span className="max-w-[200px] truncate">{currentWorkspace.split(/[/\\]/).pop()}</span>
          </div>
          
          <button
             onClick={() => openTab({ id: 'agent-manager', type: 'agent-manager', title: 'Agent Manager' })}
             className="text-xs font-medium text-emerald-400 hover:text-emerald-300 ml-4 border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 rounded flex items-center transition-colors"
          >
             <Bot className="w-3.5 h-3.5 mr-1.5" />
             Agents & Skills
          </button>
          
          <button
             onClick={() => openTab({ id: 'cli-terminal', type: 'terminal', title: 'CLI Output' })}
             className="text-xs font-medium text-zinc-400 hover:text-zinc-300 ml-2 border border-zinc-700 bg-zinc-800/50 px-2 py-1 rounded flex items-center transition-colors"
          >
             <Terminal className="w-3.5 h-3.5 mr-1.5" />
             Open CLI
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium",
            isRunning ? "text-emerald-400" : "text-zinc-500"
          )}>
             <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isRunning ? "bg-emerald-500" : "bg-zinc-600")} />
             {isRunning ? 'Agent Running' : 'Core Online'}
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-md hover:bg-zinc-900"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-black">
        <PanelGroup autoSaveId="workspace-layout-v2" direction="horizontal" className="flex-1 w-full h-full">
          
          {/* LEFT PANE: Directory/File Tree (Collapsible) */}
          {isLeftSidebarOpen && (
              <Panel collapsible minSize={15} defaultSize={20} maxSize={40} className="border-r border-zinc-800 bg-[#0c0c0e] flex flex-col overflow-hidden">
                 <LeftSidebar />
              </Panel>
          )}
          {isLeftSidebarOpen && (
              <PanelResizeHandle className="w-3 group flex items-center justify-center cursor-col-resize outline-none hover:bg-zinc-800/50 transition-colors z-10 transition-all">
                <div className="w-[1px] h-full bg-zinc-800 group-hover:bg-indigo-500/50 transition-colors" />
              </PanelResizeHandle>
          )}

          {/* CENTER PANE: Tabbed Workspace */}
          <Panel minSize={30} className="flex flex-col min-w-0 bg-zinc-950 overflow-hidden relative border-r border-zinc-800">
             {/* Center Tabs Header */}
             <div className="flex bg-[#0c0c0e] border-b border-zinc-800/80 overflow-x-auto custom-scrollbar shrink-0">
               {tabs.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTabId(tab.id)}
                   className={cn(
                     "px-4 py-2.5 text-xs font-medium border-r border-zinc-800/50 flex items-center min-w-[140px] max-w-[200px] group transition-colors relative",
                     activeTabId === tab.id ? "bg-[#111113] text-zinc-100" : "bg-[#0a0a0b] text-zinc-500 hover:bg-zinc-900"
                   )}
                 >
                   {activeTabId === tab.id && <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500" />}
                   {tab.type === 'file' && <Code2 className="w-3.5 h-3.5 mr-2 shrink-0" />}
                   {tab.type === 'agent-manager' && <Bot className="w-3.5 h-3.5 mr-2 shrink-0" />}
                   {tab.type === 'terminal' && <Terminal className="w-3.5 h-3.5 mr-2 shrink-0" />}
                   <span className="truncate flex-1 text-left">{tab.title}</span>
                   <X 
                     className="w-3.5 h-3.5 ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity shrink-0" 
                     onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                   />
                 </button>
               ))}
             </div>
             
             {/* Dynamic Center Pane Content */}
             <div className="flex-1 w-full h-full overflow-hidden relative">
               {tabs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-sm">
                    <Code2 className="w-12 h-12 text-zinc-800 mb-4" />
                    Select a file to start editing or manage agents.
                  </div>
               ) : tabs.map(tab => (
                 <div
                   key={tab.id}
                   className={cn("absolute inset-0 z-0 bg-[#0a0a0b]", activeTabId === tab.id && "z-10")}
                   style={{ display: activeTabId === tab.id ? 'flex' : 'none', flexDirection: 'column' }}
                 >
                   {tab.type === 'agent-manager' && <AgentManager />}
                   {tab.type === 'file' && <CodeEditor filePath={tab.data || tab.title} />}
                   {tab.type === 'terminal' && (
                     <div className="flex flex-col h-full bg-[#0a0a0b] text-zinc-300 font-mono text-sm p-4">
                       <div className="flex-1 overflow-y-auto space-y-1 pb-4">
                         {terminalOutput.map((line, i) => (
                           <div key={i}>{line}</div>
                         ))}
                       </div>
                       <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 border-t border-zinc-800 pt-4 mt-auto shrink-0">
                         <span className="text-emerald-500 font-bold">$</span>
                         <input 
                           type="text" 
                           value={terminalInput}
                           onChange={(e) => setTerminalInput(e.target.value)}
                           className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-700" 
                           autoFocus 
                           placeholder="Type command..."
                         />
                       </form>
                     </div>
                   )}
                 </div>
               ))}
             </div>
          </Panel>

           <PanelResizeHandle className="w-3 group flex items-center justify-center cursor-col-resize outline-none hover:bg-zinc-800/50 transition-colors z-10 transition-all">
             <div className="w-[1px] h-full bg-zinc-800 group-hover:bg-indigo-500/50 transition-colors" />
           </PanelResizeHandle>
           
           <Panel defaultSize={25} minSize={20} maxSize={50} className="flex flex-col min-w-0 bg-[#0c0c0e] overflow-hidden relative border-l border-zinc-800">
             <div className="h-12 border-b border-zinc-800/80 shrink-0 flex items-center justify-between px-4 bg-[#0c0c0e] z-30 relative">
               <div className="flex items-center">
                 <Terminal className="w-4 h-4 text-emerald-400 mr-2" />
                 <span className="text-xs font-semibold text-zinc-300">&gt;_ Agent Console</span>
               </div>
               <button 
                 onClick={() => setShowAgentHistory(!showAgentHistory)}
                 className="text-xs font-medium text-zinc-400 hover:text-zinc-200 flex items-center transition-colors px-2 py-1 rounded hover:bg-zinc-800"
               >
                 <History className="w-3.5 h-3.5 mr-1.5" />
                 History
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0a0a0b] relative">
               <AnimatePresence>
                 {showAgentHistory && (
                   <>
                     <motion.div
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       onClick={() => setShowAgentHistory(false)}
                       className="absolute inset-0 bg-black/40 z-10 backdrop-blur-sm"
                     />
                     <motion.div
                         initial={{ y: "-100%" }}
                         animate={{ y: 0 }}
                         exit={{ y: "-100%" }}
                         transition={{ type: "spring", stiffness: 300, damping: 30 }}
                         className="absolute top-0 left-0 right-0 z-20 bg-[#111113] border-b border-zinc-800/80 shadow-2xl overflow-hidden rounded-b-xl"
                     >
                       <div className="p-3">
                         <button 
                           onClick={() => setShowAgentHistory(false)}
                           className="w-full flex items-center justify-center gap-2 py-2 mb-3 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-md text-sm font-medium transition-colors"
                         >
                           <Plus className="w-4 h-4" />
                           New Session
                         </button>
                         
                         <div className="space-y-1">
                           {agentMessages.filter(m => m.role === 'user').map((msg, idx) => (
                             <div
                               key={idx}
                               onClick={() => setShowAgentHistory(false)}
                               className="group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
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
                    {msg.role === 'user' ? <div className="font-semibold text-xs mb-1 text-indigo-400">User</div> : msg.role === 'agent' ? <div className="font-semibold text-xs mb-1 text-emerald-400">Agent</div> : null}
                    <AnsiMessage content={msg.content} role={msg.role} />
                  </div>
                ))}
                <div ref={messagesEndRef} />
             </div>
             
             <div className="p-4 border-t border-zinc-800/80 bg-[#0c0c0e] shrink-0">
               <AgentConsoleInput 
                 value={agentInput}
                 onChange={setAgentInput}
                 onSubmit={handleAgentSubmit}
                 onStop={handleAgentStop}
                 isRunning={isRunning}
               />
             </div>
           </Panel>
        </PanelGroup>

        {/* BOTTOM PANEL & STATUS BAR */}
        <WorkspaceFooter 
          isOpen={isBottomPanelOpen} 
          setIsOpen={setIsBottomPanelOpen} 
          activeTab={activeBottomTab} 
          setActiveTab={setActiveBottomTab} 
        />
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
