import React, { useState } from 'react';
import { Settings, Save, Plus, Trash2, Bot, Wrench, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  isCustom?: boolean;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  command: string;
}

const DEFAULT_AGENTS: Agent[] = [
  { id: '1', name: 'Claude Code', systemPrompt: 'You are an expert developer...', isCustom: false },
  { id: '2', name: 'Kimi', systemPrompt: 'You are Kimi, a helpful assistant.', isCustom: false },
];

const DEFAULT_SKILLS: Skill[] = [
  { id: 's1', name: 'bash_shell', description: 'Execute bash commands', command: 'bash -c "${cmd}"' },
];

export function AgentManager() {
  const [activeTab, setActiveTab] = useState<'agents' | 'skills'>('agents');
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0].id);
  const [selectedSkillId, setSelectedSkillId] = useState<string>(skills[0].id);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const selectedSkill = skills.find(s => s.id === selectedSkillId);

  return (
    <div className="flex h-full w-full bg-[#0a0a0b] text-zinc-300">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800/80 bg-[#0c0c0e] flex flex-col">
        <div className="flex border-b border-zinc-800/80 pt-2 px-2 gap-2">
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
          <button 
            onClick={() => setActiveTab('skills')}
            className={`flex items-center pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'skills' 
                ? 'border-indigo-500 text-zinc-100' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 mr-1.5" />
            Skills
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeTab === 'agents' ? (
              <>
                 {agents.map(agent => (
                   <button
                     key={agent.id}
                     onClick={() => setSelectedAgentId(agent.id)}
                     className={cn("w-full text-left px-3 py-2 text-sm rounded-md truncate transition-colors flex items-center justify-between group", selectedAgentId === agent.id ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200")}
                   >
                     <span className="truncate">{agent.name}</span>
                     {agent.isCustom && <Trash2 className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400" />}
                   </button>
                 ))}
              </>
            ) : (
              <>
                 {skills.map(skill => (
                   <button
                     key={skill.id}
                     onClick={() => setSelectedSkillId(skill.id)}
                     className={cn("w-full text-left px-3 py-2 text-sm rounded-md truncate transition-colors flex items-center justify-between group", selectedSkillId === skill.id ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200")}
                   >
                     <span className="flex items-center truncate"><Code2 className="w-3.5 h-3.5 mr-2 text-zinc-500 shrink-0" />{skill.name}</span>
                   </button>
                 ))}
              </>
            )}
          </div>
          <div className="p-2 border-t border-zinc-800/80">
            {activeTab === 'agents' ? (
              <button className="w-full py-2 text-xs font-semibold text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-sm transition-colors flex items-center justify-center">
                <Plus className="w-3 h-3 mr-1.5" /> New Agent
              </button>
            ) : (
              <button className="w-full py-2 text-xs font-semibold text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-sm transition-colors flex items-center justify-center">
                <Plus className="w-3 h-3 mr-1.5" /> New Skill
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'agents' && selectedAgent ? (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-xl font-medium text-zinc-100 mb-1">Edit Agent</h2>
              <p className="text-sm text-zinc-500">Configure the behavior and capabilities of this agent.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Agent Name</label>
                <input 
                  type="text" 
                  value={selectedAgent.name}
                  disabled={!selectedAgent.isCustom}
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">System Prompt</label>
                <textarea 
                  value={selectedAgent.systemPrompt}
                  rows={8}
                  disabled={!selectedAgent.isCustom}
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono disabled:opacity-50 resize-y"
                />
              </div>

              {selectedAgent.isCustom && (
                <div className="flex justify-end pt-4">
                  <button className="flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-sm transition-colors shadow-none">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'skills' && selectedSkill ? (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-xl font-medium text-zinc-100 mb-1">Edit Skill</h2>
              <p className="text-sm text-zinc-500">Define a custom tool for the agent to use via CLI execution.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Skill Name</label>
                <input 
                  type="text" 
                  value={selectedSkill.name}
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                <input 
                  type="text" 
                  value={selectedSkill.description}
                  placeholder="Explain what this tool does to the LLM..."
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Execution Command</label>
                <textarea 
                  value={selectedSkill.command}
                  rows={4}
                  className="w-full bg-black border border-zinc-800 rounded-sm px-3 py-2 text-sm text-emerald-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono"
                />
                <p className="text-xs text-zinc-600 mt-2">Use <code className="bg-zinc-800 px-1 rounded text-zinc-400">{`\${paramName}`}</code> inside the command to inject arguments passed by the AI.</p>
              </div>

              <div className="flex justify-end pt-4">
                <button className="flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-sm transition-colors shadow-none">
                  <Save className="w-4 h-4 mr-2" /> Save Skill
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
