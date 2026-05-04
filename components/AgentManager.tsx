import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Bot, Wrench, Code2, Terminal, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Agent, Skill } from '@/hooks/useAgentStore';
import {
  AgentPlatform,
  PLATFORM_LIST,
  PLATFORMS,
  getPlatformDefaults,
  detectPlatform,
} from '@/lib/agent-platforms';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function getSourceLabel(source?: string) {
  switch (source) {
    case 'user-claude': return 'Claude (User)';
    case 'user-kimi': return 'Kimi (User)';
    case 'project-claude': return 'Claude (Project)';
    case 'project-kimi': return 'Kimi (Project)';
    default: return 'Custom';
  }
}

function getSourceColor(source?: string) {
  switch (source) {
    case 'user-claude': return 'text-orange-400';
    case 'user-kimi': return 'text-blue-400';
    case 'project-claude': return 'text-orange-300';
    case 'project-kimi': return 'text-blue-300';
    default: return 'text-zinc-500';
  }
}

export function AgentManager() {
  const {
    agents,
    skills,
    saveAgentOverrides,
    saveCustomAgents,
    saveCustomSkills,
    activeAgentId,
    setActiveAgentId,
    agentStoreReady,
  } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'agents' | 'skills'>('agents');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  // Local form state for editing
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  const selectedAgent = agents.find((a) => a.id === activeAgentId);
  const selectedSkill = skills.find((s) => s.id === selectedSkillId);

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
    const platform: AgentPlatform = 'generic';
    const defaults = getPlatformDefaults(platform);
    const newAgent: Agent = {
      id: generateId(),
      name: 'Custom Agent',
      command: defaults.command,
      args: defaults.args,
      systemPrompt: '',
      isCustom: true,
      platform,
      inputTemplate: PLATFORMS[platform].inputTemplate,
    };
    const next = [...agents, newAgent];
    saveCustomAgents(next.filter((a) => a.isCustom)).catch(() => {});
    setActiveAgentId(newAgent.id);
  };

  const handleDeleteAgent = (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent || agent.isDiscovered) return;
    const next = agents.filter((a) => a.id !== id);
    saveCustomAgents(next.filter((a) => a.isCustom)).catch(() => {});
    if (activeAgentId === id) {
      setActiveAgentId(next.length > 0 ? next[0].id : null);
    }
  };

  const handleSaveAgent = () => {
    if (!editingAgent) return;
    if (editingAgent.isDiscovered) {
      // Save only overrides for discovered agents
      saveAgentOverrides(editingAgent.command, {
        args: editingAgent.args,
        systemPrompt: editingAgent.systemPrompt,
        inputTemplate: editingAgent.inputTemplate,
      }).catch(() => {});
    } else if (editingAgent.isCustom) {
      // Save full custom agent list
      const next = agents.map((a) => (a.id === editingAgent.id ? editingAgent : a));
      saveCustomAgents(next.filter((a) => a.isCustom)).catch(() => {});
    }
  };

  const handleNewSkill = () => {
    const newSkill: Skill = {
      id: generateId(),
      name: 'new_skill',
      description: '',
      command: '',
    };
    const customSkills = skills.filter((s) => !s.source);
    const next = [...customSkills, newSkill];
    saveCustomSkills(next).catch(() => {});
    setSelectedSkillId(newSkill.id);
  };

  const handleDeleteSkill = (id: string) => {
    const skill = skills.find((s) => s.id === id);
    if (!skill || skill.source) return;
    const next = skills.filter((s) => s.id !== id);
    saveCustomSkills(next.filter((s) => !s.source)).catch(() => {});
    if (selectedSkillId === id) {
      setSelectedSkillId(next.length > 0 ? next[0].id : null);
    }
  };

  const handleSaveSkill = () => {
    if (!editingSkill || editingSkill.source) return;
    const customSkills = skills.filter((s) => !s.source);
    const next = customSkills.map((s) => (s.id === editingSkill.id ? editingSkill : s));
    saveCustomSkills(next).catch(() => {});
  };

  if (!agentStoreReady) {
    return (
      <div className="flex h-full w-full bg-[#09090B] text-[#FAFAFA] items-center justify-center">
        <div className="text-sm text-zinc-500">Loading agent configuration...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-[#09090B] text-[#FAFAFA]">
      {/* Sidebar */}
      <div className="w-72 border-r border-zinc-800/80 bg-[#09090B] flex flex-col">
        <div className="flex border-b border-zinc-800/80 pt-2 px-2 gap-2">
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'agents'
                ? 'border-[#A3E635] text-[#FAFAFA]'
                : 'border-transparent text-zinc-500 hover:text-[#FAFAFA]'
            }`}
          >
            <Bot className="w-3.5 h-3.5 mr-1.5" />
            Agents
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`flex items-center pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'skills'
                ? 'border-[#A3E635] text-[#FAFAFA]'
                : 'border-transparent text-zinc-500 hover:text-[#FAFAFA]'
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
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setActiveAgentId(agent.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm rounded-md truncate transition-colors flex items-center justify-between group',
                      activeAgentId === agent.id
                        ? 'bg-[#A3E635]/10 text-[#A3E635]'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-[#FAFAFA]'
                    )}
                  >
                    <span className="truncate flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      {agent.name}
                      {agent.version && (
                        <span className="text-[10px] text-zinc-600 font-mono">{agent.version}</span>
                      )}
                    </span>
                    {agent.isCustom && (
                      <Trash2
                        className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAgent(agent.id);
                        }}
                      />
                    )}
                  </button>
                ))}
              </>
            ) : (
              <>
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedSkillId(skill.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm rounded-md truncate transition-colors flex items-center justify-between group',
                      selectedSkillId === skill.id
                        ? 'bg-[#A3E635]/10 text-[#A3E635]'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-[#FAFAFA]'
                    )}
                  >
                    <span className="flex items-center truncate">
                      <Code2 className="w-3.5 h-3.5 mr-2 text-zinc-500 shrink-0" />
                      {skill.name}
                      {skill.source && (
                        <span className={cn('ml-2 text-[10px] font-mono', getSourceColor(skill.source))}>
                          {getSourceLabel(skill.source)}
                        </span>
                      )}
                    </span>
                    {!skill.source && (
                      <Trash2
                        className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSkill(skill.id);
                        }}
                      />
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
          <div className="p-2 border-t border-zinc-800/80">
            {activeTab === 'agents' ? (
              <button
                onClick={handleNewAgent}
                className="w-full py-2 text-xs font-semibold text-[#FAFAFA] hover:text-[#FAFAFA] bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-sm transition-colors flex items-center justify-center"
              >
                <Plus className="w-3 h-3 mr-1.5" /> Add Custom Agent
              </button>
            ) : (
              <button
                onClick={handleNewSkill}
                className="w-full py-2 text-xs font-semibold text-[#FAFAFA] hover:text-[#FAFAFA] bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-sm transition-colors flex items-center justify-center"
              >
                <Plus className="w-3 h-3 mr-1.5" /> Add Custom Skill
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
              <h2 className="text-xl font-medium text-[#FAFAFA] mb-1">
                {editingAgent.isDiscovered ? 'Agent Overrides' : 'Edit Custom Agent'}
              </h2>
              <p className="text-sm text-zinc-500">
                {editingAgent.isDiscovered
                  ? `Discovered from ${editingAgent.command}. You can override arguments, template, and system prompt.`
                  : 'Configure the behavior and capabilities of this custom agent.'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  disabled={editingAgent.isDiscovered}
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635]/20 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Platform
                </label>
                <select
                  value={editingAgent.platform || detectPlatform(editingAgent.command)}
                  onChange={(e) => {
                    const platform = e.target.value as AgentPlatform;
                    const defaults = getPlatformDefaults(platform);
                    setEditingAgent({
                      ...editingAgent,
                      platform,
                      command: editingAgent.command || defaults.command,
                      args: editingAgent.args.length > 0 ? editingAgent.args : defaults.args,
                      inputTemplate: editingAgent.inputTemplate || PLATFORMS[platform].inputTemplate,
                    });
                  }}
                  disabled={editingAgent.isDiscovered}
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635]/20 font-mono disabled:opacity-50 appearance-none cursor-pointer"
                >
                  {PLATFORM_LIST.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Execution Command
                </label>
                <input
                  type="text"
                  value={editingAgent.command}
                  onChange={(e) => setEditingAgent({ ...editingAgent, command: e.target.value })}
                  disabled={editingAgent.isDiscovered}
                  placeholder="e.g. claude or aider"
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635]/20 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Arguments (comma-separated)
                </label>
                <input
                  type="text"
                  value={editingAgent.args.join(', ')}
                  onChange={(e) =>
                    setEditingAgent({
                      ...editingAgent,
                      args: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="e.g. --model, sonnet"
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635]/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Input Template
                  <span className="normal-case text-zinc-600 ml-2 font-normal">
                    Use {'{{input}}'} as placeholder
                  </span>
                </label>
                <input
                  type="text"
                  value={
                    editingAgent.inputTemplate ||
                    PLATFORMS[editingAgent.platform || 'generic'].inputTemplate
                  }
                  onChange={(e) => setEditingAgent({ ...editingAgent, inputTemplate: e.target.value })}
                  placeholder="e.g. /ask {{input}}"
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635]/20 font-mono"
                />
                <p className="text-xs text-zinc-600 mt-1">
                  Defines how user messages are formatted before being sent to the CLI via stdin.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  System Prompt
                </label>
                <textarea
                  value={editingAgent.systemPrompt}
                  onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                  rows={8}
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635]/20 font-mono resize-y"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveAgent}
                  className="flex items-center px-4 py-2 bg-[#A3E635] hover:bg-[#8bc926] text-black border-2 border-black font-bold tracking-wide text-sm font-medium rounded-sm transition-colors shadow-none"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'skills' && editingSkill ? (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-xl font-medium text-[#FAFAFA] mb-1">
                {editingSkill.source ? 'Skill Details' : 'Edit Custom Skill'}
              </h2>
              <p className="text-sm text-zinc-500">
                {editingSkill.source
                  ? 'This skill was discovered from the filesystem. Edit it in its SKILL.md file.'
                  : 'Define a custom tool for the agent to use via CLI execution.'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={editingSkill.name}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                  disabled={!!editingSkill.source}
                  className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635]/20 font-mono disabled:opacity-50"
                />
              </div>

              {editingSkill.version && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Version
                  </label>
                  <div className="text-sm text-zinc-400 font-mono">{editingSkill.version}</div>
                </div>
              )}

              {editingSkill.source && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Source
                  </label>
                  <div className="text-sm text-zinc-400">
                    {getSourceLabel(editingSkill.source)} — {editingSkill.path}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Description
                </label>
                {editingSkill.source ? (
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {editingSkill.description}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={editingSkill.description}
                    onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                    placeholder="Explain what this tool does to the LLM..."
                    className="w-full bg-[#111113] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635]/20"
                  />
                )}
              </div>

              {!editingSkill.source && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Execution Command
                  </label>
                  <textarea
                    value={editingSkill.command}
                    onChange={(e) => setEditingSkill({ ...editingSkill, command: e.target.value })}
                    rows={4}
                    className="w-full bg-[#09090B] border border-zinc-800 rounded-sm px-3 py-2 text-sm text-[#A3E635] focus:outline-none focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635]/20 font-mono"
                  />
                  <p className="text-xs text-zinc-600 mt-2">
                    Use{' '}
                    <code className="bg-zinc-800 px-1 rounded text-zinc-400">{`\${paramName}`}</code>{' '}
                    inside the command to inject arguments passed by the AI.
                  </p>
                </div>
              )}

              {!editingSkill.source && (
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveSkill}
                    className="flex items-center px-4 py-2 bg-[#A3E635] hover:bg-[#8bc926] text-black border-2 border-black font-bold tracking-wide text-sm font-medium rounded-sm transition-colors shadow-none"
                  >
                    <Save className="w-4 h-4 mr-2" /> Save Skill
                  </button>
                </div>
              )}
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
