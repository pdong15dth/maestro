import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HealthCheckStatus {
  node: 'checking' | 'passed' | 'failed';
  claude: 'checking' | 'passed' | 'failed';
  git: 'checking' | 'passed' | 'failed';
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'health' | 'general' | 'keys'>('health');
  const [status, setStatus] = useState<HealthCheckStatus>({
    node: 'checking',
    claude: 'checking',
    git: 'checking'
  });

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
      runChecks();
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
        className="bg-[#111113] border border-zinc-800 rounded-sm w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#0c0c0e]">
          <h2 className="text-zinc-200 font-medium">Settings</h2>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-md hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex bg-[#0c0c0e] min-h-[400px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-zinc-800 p-4 space-y-1 bg-zinc-950/50">
            <button 
              onClick={() => setActiveTab('health')}
              className={`w-full text-left px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                activeTab === 'health' ? 'text-zinc-200 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              Health Check
            </button>
            <button 
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                activeTab === 'general' ? 'text-zinc-200 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              General
            </button>
            <button 
              onClick={() => setActiveTab('keys')}
              className={`w-full text-left px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                activeTab === 'keys' ? 'text-zinc-200 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              API Keys
            </button>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 p-8">
            {activeTab === 'health' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-zinc-200 font-medium text-lg">System Health</h3>
                    <p className="text-sm text-zinc-500">Verification of required CLI tools and dependencies.</p>
                  </div>
                  <button 
                    onClick={runChecks}
                    disabled={Object.values(status).includes('checking')}
                    className="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-sm transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${Object.values(status).includes('checking') ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-sm">
                    <span className="text-sm text-zinc-300 font-medium">Node.js Version (&gt;=18)</span>
                    {renderStatus(status.node)}
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-sm">
                    <span className="text-sm text-zinc-300 font-medium">Claude Code CLI</span>
                    {renderStatus(status.claude)}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-sm">
                    <span className="text-sm text-zinc-300 font-medium">Git Access</span>
                    {renderStatus(status.git)}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'general' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-zinc-200 font-medium text-lg mb-1">General Settings</h3>
                <p className="text-sm text-zinc-500 mb-6">Configure workspace preferences.</p>
                <div className="text-sm text-zinc-400 p-4 border border-zinc-800/50 bg-zinc-900/30 rounded-sm">
                  General settings will be implemented in a future update.
                </div>
              </div>
            )}

            {activeTab === 'keys' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-zinc-200 font-medium text-lg mb-1">API Keys</h3>
                <p className="text-sm text-zinc-500 mb-6">Manage external service credentials.</p>
                <div className="text-sm text-zinc-400 p-4 border border-zinc-800/50 bg-zinc-900/30 rounded-sm">
                  API key management will be implemented in a future update.
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-zinc-800 flex justify-end bg-zinc-950">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-[#A3E635] hover:bg-[#8bc926] text-black border-2 border-black font-bold tracking-wide text-sm font-medium rounded-sm transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
