import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HealthCheckStatus {
  node: 'checking' | 'passed' | 'failed';
  claude: 'checking' | 'passed' | 'failed';
  git: 'checking' | 'passed' | 'failed';
}

interface GeneralSettings {
  fontSize: number;
  theme: 'dark' | 'light';
  tabSize: number;
  autoSave: boolean;
}

interface ApiKeys {
  openai?: string;
  anthropic?: string;
  gemini?: string;
}

const SETTINGS_STORE = 'settings.json';
const KEYS_STORE = 'keys.json';

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

async function loadApiKeys(): Promise<ApiKeys> {
  const store = await Store.load(KEYS_STORE, { defaults: {}, autoSave: true });
  return (await store.get<ApiKeys>('keys')) ?? {};
}

async function saveApiKeys(keys: ApiKeys) {
  const store = await Store.load(KEYS_STORE, { defaults: {}, autoSave: true });
  await store.set('keys', keys);
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'health' | 'general' | 'keys'>('health');
  const [status, setStatus] = useState<HealthCheckStatus>({
    node: 'checking',
    claude: 'checking',
    git: 'checking'
  });

  const [general, setGeneral] = useState<GeneralSettings>({
    fontSize: 14,
    theme: 'dark',
    tabSize: 2,
    autoSave: false,
  });
  const [generalLoaded, setGeneralLoaded] = useState(false);

  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      loadGeneralSettings()
        .then((s) => {
          setGeneral(s);
          setGeneralLoaded(true);
        })
        .catch(() => setGeneralLoaded(true));
      loadApiKeys()
        .then((k) => {
          setApiKeys(k);
          setKeysLoaded(true);
        })
        .catch(() => setKeysLoaded(true));
    }
  }, [isOpen]);

  const runChecks = async () => {
    setStatus({ node: 'checking', claude: 'checking', git: 'checking' });

    try {
      const nodeOk = await invoke<boolean>('check_cli', { path: 'node' }).catch(() => false);
      setStatus(prev => ({ ...prev, node: nodeOk ? 'passed' : 'failed' }));
    } catch {
      setStatus(prev => ({ ...prev, node: 'failed' }));
    }

    try {
      const claudeOk = await invoke<boolean>('check_cli', { path: 'claude' }).catch(() => false);
      setStatus(prev => ({ ...prev, claude: claudeOk ? 'passed' : 'failed' }));
    } catch {
      setStatus(prev => ({ ...prev, claude: 'failed' }));
    }

    try {
      const gitOk = await invoke<boolean>('check_cli', { path: 'git' }).catch(() => false);
      setStatus(prev => ({ ...prev, git: gitOk ? 'passed' : 'failed' }));
    } catch {
      setStatus(prev => ({ ...prev, git: 'failed' }));
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'health') {
      runChecks().catch(() => {});
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const renderStatus = (state: 'checking' | 'passed' | 'failed') => {
    if (state === 'checking') {
      return (
        <div className="flex items-center text-zinc-500 text-sm font-medium">
          <div className="flex space-x-1 mr-2">
            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce"></span>
          </div>
          Checking...
        </div>
      );
    }

    if (state === 'passed') {
      return (
        <div className="flex items-center text-[#A3E635] text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          Passed
        </div>
      );
    }

    return (
      <div className="flex items-center text-rose-400 text-sm font-medium">
        <AlertCircle className="w-4 h-4 mr-1.5" />
        Action Required
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-[#111113] border border-zinc-800 rounded-none w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#09090B]">
          <h2 className="text-[#FAFAFA] font-medium">Settings</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-[#FAFAFA] p-1.5 rounded-none hover:bg-[#161618] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex bg-[#09090B] min-h-[400px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-zinc-800 p-4 space-y-1 bg-[#09090B]/50">
            <button
              onClick={() => setActiveTab('health')}
              className={`w-full text-left px-3 py-2 text-sm rounded-none font-medium transition-colors ${
                activeTab === 'health' ? 'text-[#FAFAFA] bg-zinc-800' : 'text-zinc-500 hover:text-[#FAFAFA] hover:bg-zinc-800/50'
              }`}
            >
              Health Check
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-3 py-2 text-sm rounded-none font-medium transition-colors ${
                activeTab === 'general' ? 'text-[#FAFAFA] bg-zinc-800' : 'text-zinc-500 hover:text-[#FAFAFA] hover:bg-zinc-800/50'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`w-full text-left px-3 py-2 text-sm rounded-none font-medium transition-colors ${
                activeTab === 'keys' ? 'text-[#FAFAFA] bg-zinc-800' : 'text-zinc-500 hover:text-[#FAFAFA] hover:bg-zinc-800/50'
              }`}
            >
              API Keys
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8 overflow-y-auto">
            {activeTab === 'health' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-[#FAFAFA] font-medium text-lg">System Health</h3>
                    <p className="text-sm text-zinc-500">Verification of required CLI tools and dependencies.</p>
                  </div>
                  <button
                    onClick={runChecks}
                    disabled={Object.values(status).includes('checking')}
                    className="p-2 text-zinc-400 hover:text-[#FAFAFA] bg-zinc-900 hover:bg-zinc-800 rounded-none transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${Object.values(status).includes('checking') ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-none">
                    <span className="text-sm text-[#FAFAFA] font-medium">Node.js Version (&gt;=18)</span>
                    {renderStatus(status.node)}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-none">
                    <span className="text-sm text-[#FAFAFA] font-medium">Claude Code CLI</span>
                    {renderStatus(status.claude)}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-none">
                    <span className="text-sm text-[#FAFAFA] font-medium">Git Access</span>
                    {renderStatus(status.git)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-[#FAFAFA] font-medium text-lg mb-1">General Settings</h3>
                  <p className="text-sm text-zinc-500 mb-6">Configure workspace preferences.</p>
                </div>

                {generalLoaded && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Font Size ({general.fontSize}px)</label>
                      <input
                        type="range"
                        min={12}
                        max={20}
                        value={general.fontSize}
                        onChange={(e) => {
                          const next = { ...general, fontSize: parseInt(e.target.value) };
                          setGeneral(next);
                          saveGeneralSettings(next).catch(() => {});
                        }}
                        className="w-full accent-[#A3E635]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Theme</label>
                      <select
                        value={general.theme}
                        onChange={(e) => {
                          const next = { ...general, theme: e.target.value as 'dark' | 'light' };
                          setGeneral(next);
                          saveGeneralSettings(next).catch(() => {});
                        }}
                        className="w-full bg-[#111113] border border-zinc-800 rounded-none px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635]"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tab Size</label>
                      <div className="flex gap-2">
                        {[2, 4].map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              const next = { ...general, tabSize: size };
                              setGeneral(next);
                              saveGeneralSettings(next).catch(() => {});
                            }}
                            className={`px-4 py-2 text-sm rounded-none border transition-colors ${
                              general.tabSize === size
                                ? 'bg-[#A3E635] text-black border-[#A3E635] font-medium'
                                : 'bg-[#111113] text-[#FAFAFA] border-zinc-800 hover:border-zinc-600'
                            }`}
                          >
                            {size} spaces
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm text-[#FAFAFA] font-medium">Auto Save</label>
                      <button
                        onClick={() => {
                          const next = { ...general, autoSave: !general.autoSave };
                          setGeneral(next);
                          saveGeneralSettings(next).catch(() => {});
                        }}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          general.autoSave ? 'bg-[#A3E635]' : 'bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            general.autoSave ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'keys' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-[#FAFAFA] font-medium text-lg mb-1">API Keys</h3>
                  <p className="text-sm text-zinc-500 mb-6">Manage external service credentials.</p>
                </div>

                {keysLoaded && (
                  <div className="space-y-4">
                    {[
                      { key: 'openai', label: 'OpenAI API Key' },
                      { key: 'anthropic', label: 'Anthropic API Key' },
                      { key: 'gemini', label: 'Google Gemini API Key' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{label}</label>
                        <div className="flex gap-2">
                          <input
                            type={showKey[key] ? 'text' : 'password'}
                            value={apiKeys[key as keyof ApiKeys] ?? ''}
                            onChange={(e) => {
                              const next = { ...apiKeys, [key]: e.target.value };
                              setApiKeys(next);
                              saveApiKeys(next).catch(() => {});
                            }}
                            placeholder={`Enter ${label}`}
                            className="flex-1 bg-[#111113] border border-zinc-800 rounded-none px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635]/20 font-mono"
                          />
                          <button
                            onClick={() => setShowKey((prev) => ({ ...prev, [key]: !prev[key] }))}
                            className="px-3 py-2 text-zinc-400 hover:text-[#FAFAFA] bg-zinc-900 border border-zinc-800 rounded-none transition-colors"
                          >
                            {showKey[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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
