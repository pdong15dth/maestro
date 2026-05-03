import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Bot, Wrench, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Agent, Skill } from '@/hooks/useAgentStore';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function AgentManager() {
  const { agents, skills, saveAgents, saveSkills, activeAgentId, setActiveAgentId, agentStoreReady } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'agents' | 'skills'>('agents');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  // Local form state for editing
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  const selectedAgent = agents.find(a => a.id === activeAgentId);
  const selectedSkill = skills.find(s => s.id === selectedSkillId);

  useEffect(() => {
    if (selectedAgent) {
      setEditingAgent({ ...selectedAgent });
    } else {
      setEditingAgent(null);
    }
  }, [selectedAgent]);

  useEffect(() => {
    if (selectedSkill) {
      setEditingSkill({ ...selectedSkill });
    } else {
      setEditingSkill(null);
    }
  }, [selectedSkill]);

  const handleNewAgent = () => {
    const newAgent: Agent = {
      id: generateId(),
      name: 'New Agent',
      command: '',
      args: [],
      systemPrompt: '',
      isCustom: true,
    };
    const next = [...agents, newAgent];
    saveAgents(next);
    setActiveAgentId(newAgent.id);
  };

  const handleDeleteAgent = (id: string) => {
    const next = agents.filter(a => a.id !== id);
    saveAgents(next);
    if (activeAgentId === id) {
      setActiveAgentId(next.length > 0 ? next[0].id : null);
    }
  };

  const handleSaveAgent = () => {
    if (!editingAgent) return;
    const next = agents.map(a => a.id === editingAgent.id ? editingAgent : a);
    saveAgents(next);
  };

  const handleNewSkill = () => {
    const newSkill: Skill = {
      id: generateId(),
      name: 'new_skill',
      description: '',
      command: '',
    };
    const next = [...skills, newSkill];
    saveSkills(next);
    setSelectedSkillId(newSkill.id);
  };

  const handleDeleteSkill = (id: string) => {
    const next = skills.filter(s => s.id !== id);
    saveSkills(next);
    if (selectedSkillId === id) {
      setSelectedSkillId(next.length > 0 ? next[0].id : null);
    }
  };

  const handleSaveSkill = () => {
    if (!editingSkill) return;
    const next = skills.map(s => s.id === editingSkill.id ? editingSkill : s);
    saveSkills(next);
  };

  if (!agentStoreReady) {
    return (
      <div className="flex h-full w-full bg-[#0a0a0b] text-zinc-300 items-center justify-center">
        <div className="text-sm text-zinc-500">Loading agent configuration...</div>
      </div>
    );
  }

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
                    onClick={() => setActiveAgentId(agent.id)}
                    className={cn("w-full text-left px-3 py-2 text-sm rounded-md truncate transition-colors flex items-center justify-between group", activeAgentId === agent.id ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200")}
                  >
                    <span className="truncate">{agent.name}</span>
                    {agent.isCustom && (
                      <Trash2 
                        className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent.id); }}
                      />
                    )}
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
                    <Trash2 
                      className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400"
                      onClick={(e) => { e.stopPropagation(); handleDeleteSkill(skill.id); }}
                    />
                  </button>
                ))}
              </>
            )}
          </div>
          <div className="p-2 border-t border-zinc-800/80">
            {activeTab === 'agents' ? (
              <button 
                onClick={handleNewAgent}
                className="w-full py-2 text-xs font-semibold text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-sm transition-colors flex items-center justify-center"
              >
                <Plus className="w-3 h-3 mr-1.5" /> New Agent
              </button>
            ) : (
              <button 
                onClick={handleNewSkill}
                className="w-full py-2 text-xs font-semibold text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-sm transition-colors flex items-center justify-center"
              >
                <Plus className="w-3 h-3 mr-1.5" /> New Skill
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'agents' && editingAgent ? (
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
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  disabled={!editingAgent.isCustom}
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Execution Command</label>
                <input 
                  type="text" 
                  value={editingAgent.command}
                  onChange={(e) => setEditingAgent({ ...editingAgent, command: e.target.value })}
                  disabled={!editingAgent.isCustom}
                  placeholder="e.g. claude or aider"
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Arguments (comma-separated)</label>
                <input 
                  type="text" 
                  value={editingAgent.args.join(', ')}
                  onChange={(e) => setEditingAgent({ ...editingAgent, args: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  disabled={!editingAgent.isCustom}
                  placeholder="e.g. --model, sonnet"
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">System Prompt</label>
                <textarea 
                  value={editingAgent.systemPrompt}
                  onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                  rows={8}
                  disabled={!editingAgent.isCustom}
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono disabled:opacity-50 resize-y"
                />
              </div>

              {editingAgent.isCustom && (
                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleSaveAgent}
                    className="flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-sm transition-colors shadow-none"
                  >
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'skills' && editingSkill ? (
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
                  value={editingSkill.name}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                <input 
                  type="text" 
                  value={editingSkill.description}
                  onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                  placeholder="Explain what this tool does to the LLM..."
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Execution Command</label>
                <textarea 
                  value={editingSkill.command}
                  onChange={(e) => setEditingSkill({ ...editingSkill, command: e.target.value })}
                  rows={4}
                  className="w-full bg-black border border-zinc-800 rounded-sm px-3 py-2 text-sm text-emerald-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono"
                />
                <p className="text-xs text-zinc-600 mt-2">Use <code className="bg-zinc-800 px-1 rounded text-zinc-400">{`\${paramName}`}</code> inside the command to inject arguments passed by the AI.</p>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSaveSkill}
                  className="flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-sm transition-colors shadow-none"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Skill
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-sm">
            <Bot className="w-12 h-12 text-zinc-800 mb-4" />
            Select an agent or skill to configure.
          </div>
        )}
      </div>
    </div>
  );
}
