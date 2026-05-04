import React, { useState, useEffect } from 'react';
import {
  X, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff,
  Bot, Pencil, Trash2, Plus, Terminal, Monitor, Palette,
  SlidersHorizontal
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  PLATFORMS,
  detectPlatform,
  AgentPlatform,
  getPlatformDefaults,
} from '@/lib/agent-platforms';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CliStatus {
  agentId: string;
  name: string;
  command: string;
  platform: AgentPlatform;
  available: boolean | null;
  version: string | null;
}

interface GeneralSettings {
  fontSize: number;
  theme: 'dark' | 'light';
  tabSize: number;
  autoSave: boolean;
}

const SETTINGS_STORE = 'settings.json';

async function loadGeneralSettings(): Promise<GeneralSettings> {
  const store = await Store.load(SETTINGS_STORE, { defaults: {}, autoSave: true });
  return (await store.get<GeneralSettings>('general')) ?? {
    fontSize: 14,
    theme: 'dark',
    tabSize: 2,
    autoSave: false,
  };
}

async function saveGeneralSettings(settings: GeneralSettings) {
  const store = await Store.load(SETTINGS_STORE, { defaults: {}, autoSave: true });
  await store.set('general', settings);
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'agents' | 'appearance'>('status');
  const { agents, saveCustomAgents, saveAgentOverrides, activeAgentId, setActiveAgentId } = useWorkspace();

  // ── CLI Status ──
  const [cliStatuses, setCliStatuses] = useState<CliStatus[]>([]);
  const [checking, setChecking] = useState(false);

  // ── Appearance ──
  const [general, setGeneral] = useState<GeneralSettings>({
    fontSize: 14,
    theme: 'dark',
    tabSize: 2,
    autoSave: false,
  });
  const [generalLoaded, setGeneralLoaded] = useState(false);

  // ── Agents ──
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    command: string;
    args: string;
    platform: AgentPlatform;
  }>({ name: '', command: '', args: '', platform: 'generic' });

  useEffect(() => {
    if (isOpen) {
      loadGeneralSettings()
        .then((s) => { setGeneral(s); setGeneralLoaded(true); })
        .catch(() => setGeneralLoaded(true));
    }
  }, [isOpen]);

  const runChecks = async () => {
    setChecking(true);
    const results: CliStatus[] = [];
    for (const agent of agents) {
      const platform = agent.platform || detectPlatform(agent.command);
      const p = PLATFORMS[platform];
      let available = false;
      let version: string | null = null;
      if (agent.command) {
        try {
          const ok = await invoke<boolean>('check_command', { command: agent.command });
          available = ok;
          if (ok) {
            try {
              const out = await invoke<{ stdout: string; stderr: string; exit_code: number }>('exec_command', {
                path: agent.command,
                args: ['--version'],
                cwd: '.',
              });
              version = (out.stdout || out.stderr).trim().split('\n')[0].slice(0, 40) || null;
            } catch {
              version = null;
            }
          }
        } catch {
          available = false;
        }
      }
      results.push({
        agentId: agent.id,
        name: agent.name,
        command: agent.command,
        platform,
        available,
        version,
      });
    }
    setCliStatuses(results);
    setChecking(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'status') {
      runChecks().catch(() => {});
    }
  }, [isOpen, activeTab, agents]);

  const handleStartEdit = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    setEditingAgentId(agentId);
    setEditForm({
      name: agent.name,
      command: agent.command,
      args: agent.args.join(', '),
      platform: agent.platform || detectPlatform(agent.command),
    });
  };

  const handleSaveEdit = () => {
    if (!editingAgentId) return;
    const agent = agents.find((a) => a.id === editingAgentId);
    if (!agent) return;

    if (agent.isDiscovered) {
      // Only save args override for discovered agents
      saveAgentOverrides(agent.command, {
        args: editForm.args.split(',').map((s) => s.trim()).filter(Boolean),
      }).catch(() => {});
    } else {
      const next = agents.map((a) =>
        a.id === editingAgentId
          ? {
              ...a,
              name: editForm.name,
              command: editForm.command,
              args: editForm.args.split(',').map((s) => s.trim()).filter(Boolean),
              platform: editForm.platform,
            }
          : a
      );
      saveCustomAgents(next.filter((a) => a.isCustom)).catch(() => {});
    }
    setEditingAgentId(null);
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

  const handleNewAgent = () => {
    const defaults = getPlatformDefaults('generic');
    const newAgent = {
      id: generateId(),
      name: 'New Agent',
      command: defaults.command,
      args: defaults.args,
      systemPrompt: '',
      isCustom: true,
      platform: 'generic' as AgentPlatform,
      inputTemplate: PLATFORMS.generic.inputTemplate,
    };
    const next = [...agents.filter((a) => a.isCustom), newAgent];
    saveCustomAgents(next).catch(() => {});
    setActiveAgentId(newAgent.id);
    handleStartEdit(newAgent.id);
    setActiveTab('agents');
  };

  if (!isOpen) return null;

  const StatusIcon = ({ available }: { available: boolean | null }) => {
    if (available === null) return <div className="w-4 h-4 rounded-full border-2 border-zinc-600 animate-pulse" />;
    if (available) return <CheckCircle2 className="w-4 h-4 text-[#A3E635]" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-[#111113] border border-zinc-800 rounded-none w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#09090B]">
          <h2 className="text-[#FAFAFA] font-medium flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-[#FAFAFA] p-1.5 rounded-none hover:bg-[#161618] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex bg-[#09090B] min-h-[420px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-zinc-800 p-3 space-y-1 bg-[#09090B]/50">
            <button
              onClick={() => setActiveTab('status')}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded-none font-medium transition-colors flex items-center gap-2',
                activeTab === 'status' ? 'text-[#FAFAFA] bg-zinc-800' : 'text-zinc-500 hover:text-[#FAFAFA] hover:bg-zinc-800/50'
              )}
            >
              <Terminal className="w-3.5 h-3.5" />
              CLI Status
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded-none font-medium transition-colors flex items-center gap-2',
                activeTab === 'agents' ? 'text-[#FAFAFA] bg-zinc-800' : 'text-zinc-500 hover:text-[#FAFAFA] hover:bg-zinc-800/50'
              )}
            >
              <Bot className="w-3.5 h-3.5" />
              Agents
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded-none font-medium transition-colors flex items-center gap-2',
                activeTab === 'appearance' ? 'text-[#FAFAFA] bg-zinc-800' : 'text-zinc-500 hover:text-[#FAFAFA] hover:bg-zinc-800/50'
              )}
            >
              <Palette className="w-3.5 h-3.5" />
              Appearance
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* ── CLI Status ── */}
            {activeTab === 'status' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-[#FAFAFA] font-medium text-lg">CLI Status</h3>
                    <p className="text-sm text-zinc-500">Check which AI CLI tools are installed on your system.</p>
                  </div>
                  <button
                    onClick={runChecks}
                    disabled={checking}
                    className="p-2 text-zinc-400 hover:text-[#FAFAFA] bg-zinc-900 hover:bg-zinc-800 rounded-none transition-colors disabled:opacity-50"
                    title="Re-check all"
                  >
                    <RefreshCw className={cn('w-4 h-4', checking && 'animate-spin')} />
                  </button>
                </div>

                <div className="space-y-2">
                  {agents.length === 0 && (
                    <div className="text-sm text-zinc-500 py-8 text-center">No agents configured. Add one in the Agents tab.</div>
                  )}
                  {cliStatuses.map((cli) => {
                    const p = PLATFORMS[cli.platform];
                    return (
                      <div
                        key={cli.agentId}
                        className={cn(
                          'flex items-center justify-between p-3 border rounded-none transition-colors',
                          cli.available === false
                            ? 'bg-yellow-500/5 border-yellow-500/20'
                            : 'bg-zinc-900/30 border-zinc-800/50'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: p.iconColor }}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[#FAFAFA] truncate">{cli.name}</div>
                            <div className="text-[11px] text-zinc-500 font-mono truncate">
                              {cli.command || 'No command'}
                              {cli.version && <span className="text-zinc-600 ml-2">{cli.version}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon available={cli.available} />
                            <span
                              className={cn(
                                'text-xs font-medium',
                                cli.available === null && 'text-zinc-500',
                                cli.available === true && 'text-[#A3E635]',
                                cli.available === false && 'text-yellow-500'
                              )}
                            >
                              {cli.available === null && 'Checking'}
                              {cli.available === true && 'Installed'}
                              {cli.available === false && 'Not Found'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleStartEdit(cli.agentId)}
                            className="p-1 text-zinc-500 hover:text-[#FAFAFA] hover:bg-zinc-800 rounded-none transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {cliStatuses.some((c) => c.available === false) && (
                  <div className="mt-4 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-none">
                    <div className="text-xs text-yellow-500/90 font-medium mb-1">Missing CLI tools detected</div>
                    <div className="text-[11px] text-zinc-500">
                      Install missing tools via your package manager (npm, pip, brew, cargo, etc.) or edit the command path above.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Agents ── */}
            {activeTab === 'agents' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[#FAFAFA] font-medium text-lg">Agents</h3>
                    <p className="text-sm text-zinc-500">Manage AI CLI wrappers.</p>
                  </div>
                  <button
                    onClick={handleNewAgent}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#A3E635] hover:bg-[#8bc926] text-black text-xs font-bold border-2 border-black rounded-none transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New
                  </button>
                </div>

                <div className="space-y-2">
                  {agents.map((agent) => {
                    const p = PLATFORMS[agent.platform || detectPlatform(agent.command)];
                    const isEditing = editingAgentId === agent.id;
                    return (
                      <div
                        key={agent.id}
                        className={cn(
                          'border rounded-none overflow-hidden',
                          isEditing ? 'border-[#A3E635]/40 bg-[#A3E635]/5' : 'border-zinc-800 bg-zinc-900/30'
                        )}
                      >
                        {!isEditing ? (
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: p.iconColor }}
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[#FAFAFA] truncate">{agent.name}</div>
                                <div className="text-[11px] text-zinc-500 font-mono truncate">
                                  {agent.command} {agent.args.join(' ')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                onClick={() => handleStartEdit(agent.id)}
                                className="p-1.5 text-zinc-500 hover:text-[#FAFAFA] hover:bg-zinc-800 rounded-none transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {!agent.isDiscovered && (
                                <button
                                  onClick={() => handleDeleteAgent(agent.id)}
                                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-none transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 space-y-3">
                            {(() => {
                              const editingAgent = agents.find((a) => a.id === editingAgentId);
                              const isDiscovered = editingAgent?.isDiscovered ?? false;
                              return (
                                <>
                                  <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Name</label>
                                    <input
                                      type="text"
                                      value={editForm.name}
                                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                      disabled={isDiscovered}
                                      className="w-full bg-[#111113] border border-zinc-800 rounded-none px-2.5 py-1.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] font-mono disabled:opacity-50"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Command</label>
                                      <input
                                        type="text"
                                        value={editForm.command}
                                        onChange={(e) => setEditForm({ ...editForm, command: e.target.value })}
                                        disabled={isDiscovered}
                                        className="w-full bg-[#111113] border border-zinc-800 rounded-none px-2.5 py-1.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] font-mono disabled:opacity-50"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Platform</label>
                                      <select
                                        value={editForm.platform}
                                        onChange={(e) => {
                                          const platform = e.target.value as AgentPlatform;
                                          const defs = getPlatformDefaults(platform);
                                          setEditForm({
                                            ...editForm,
                                            platform,
                                            command: editForm.command || defs.command,
                                          });
                                        }}
                                        disabled={isDiscovered}
                                        className="w-full bg-[#111113] border border-zinc-800 rounded-none px-2.5 py-1.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] font-mono appearance-none disabled:opacity-50"
                                      >
                                        {Object.values(PLATFORMS).map((p) => (
                                          <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Arguments (comma-separated)</label>
                                    <input
                                      type="text"
                                      value={editForm.args}
                                      onChange={(e) => setEditForm({ ...editForm, args: e.target.value })}
                                      className="w-full bg-[#111113] border border-zinc-800 rounded-none px-2.5 py-1.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] font-mono"
                                    />
                                  </div>
                                </>
                              );
                            })()}
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                onClick={() => setEditingAgentId(null)}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-[#FAFAFA] bg-zinc-900 border border-zinc-800 rounded-none transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                className="px-3 py-1.5 text-xs font-bold text-black bg-[#A3E635] hover:bg-[#8bc926] border-2 border-black rounded-none transition-colors"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Appearance ── */}
            {activeTab === 'appearance' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-[#FAFAFA] font-medium text-lg mb-1">Appearance</h3>
                  <p className="text-sm text-zinc-500 mb-6">Configure workspace preferences.</p>
                </div>

                {generalLoaded && (
                  <div className="space-y-6">
                    {/* Preview Box */}
                    <div className="border-2 border-black bg-[#0f0f10] p-4 shadow-[3px_3px_0px_#000000]">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Preview</label>
                      <div
                        className="font-mono text-[#FAFAFA] leading-relaxed"
                        style={{ fontSize: general.fontSize }}
                      >
                        <span className="text-[#A3E635]">const</span>{' '}
                        <span className="text-[#FAFAFA]">maestro</span>{' '}
                        <span className="text-zinc-500">=</span>{' '}
                        <span className="text-[#A3E635]">"build"</span>
                        <span className="text-zinc-500">;</span>
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Font Size</label>
                      <div className="flex gap-2">
                        {[12, 14, 16, 18].map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              const next = { ...general, fontSize: size };
                              setGeneral(next);
                              saveGeneralSettings(next).catch(() => {});
                            }}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-none border-2 transition-all duration-150",
                              general.fontSize === size
                                ? "bg-[#A3E635] text-black border-black shadow-[3px_3px_0px_#000000]"
                                : "bg-[#111113] text-zinc-400 border-zinc-800 hover:text-[#FAFAFA] hover:border-zinc-600"
                            )}
                          >
                            {size}px
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Theme */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Theme</label>
                      <div className="flex gap-2">
                        {[
                          { key: 'dark', label: 'Dark', bg: '#09090B', fg: '#FAFAFA' },
                          { key: 'light', label: 'Light', bg: '#FAFAFA', fg: '#09090B' },
                        ].map((t) => (
                          <button
                            key={t.key}
                            onClick={() => {
                              const next = { ...general, theme: t.key as 'dark' | 'light' };
                              setGeneral(next);
                              saveGeneralSettings(next).catch(() => {});
                            }}
                            className={cn(
                              "flex-1 flex items-center gap-2 px-3 py-2.5 text-xs font-bold rounded-none border-2 transition-all duration-150",
                              general.theme === t.key
                                ? "bg-[#A3E635] text-black border-black shadow-[3px_3px_0px_#000000]"
                                : "bg-[#111113] text-zinc-400 border-zinc-800 hover:text-[#FAFAFA] hover:border-zinc-600"
                            )}
                          >
                            <span
                              className="w-3 h-3 border border-zinc-600 shrink-0"
                              style={{ backgroundColor: t.bg }}
                            />
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tab Size */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Tab Size</label>
                      <div className="flex gap-2">
                        {[2, 4].map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              const next = { ...general, tabSize: size };
                              setGeneral(next);
                              saveGeneralSettings(next).catch(() => {});
                            }}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-none border-2 transition-all duration-150",
                              general.tabSize === size
                                ? "bg-[#A3E635] text-black border-black shadow-[3px_3px_0px_#000000]"
                                : "bg-[#111113] text-zinc-400 border-zinc-800 hover:text-[#FAFAFA] hover:border-zinc-600"
                            )}
                          >
                            {size} SPACES
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Auto Save */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Auto Save</label>
                      <div className="flex gap-2">
                        {[
                          { key: true, label: 'On' },
                          { key: false, label: 'Off' },
                        ].map((opt) => (
                          <button
                            key={String(opt.key)}
                            onClick={() => {
                              const next = { ...general, autoSave: opt.key };
                              setGeneral(next);
                              saveGeneralSettings(next).catch(() => {});
                            }}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-none border-2 transition-all duration-150",
                              general.autoSave === opt.key
                                ? "bg-[#A3E635] text-black border-black shadow-[3px_3px_0px_#000000]"
                                : "bg-[#111113] text-zinc-400 border-zinc-800 hover:text-[#FAFAFA] hover:border-zinc-600"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end bg-[#09090B]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#A3E635] hover:bg-[#8bc926] text-black border-2 border-black font-bold tracking-wide text-sm font-medium rounded-none transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
