'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowUp, Check, ChevronDown, AlertTriangle,
  StopCircle, Paperclip, Wrench, SlidersHorizontal,
  Bot, MessageSquare, Zap, PenTool
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { PLATFORMS, detectPlatform } from '@/lib/agent-platforms';

interface AgentConsoleInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isRunning: boolean;
  mode?: 'Plan' | 'Edit' | 'Chat';
  onModeChange?: (mode: 'Plan' | 'Edit' | 'Chat') => void;
  onOpenSettings?: () => void;
}

type AgentMode = 'Plan' | 'Edit' | 'Chat';

const MODE_ICONS: Record<AgentMode, React.ElementType> = {
  Plan: PenTool,
  Edit: Zap,
  Chat: MessageSquare,
};

const MIN_INPUT_HEIGHT = 120;
const MAX_INPUT_HEIGHT = 480;

export function AgentConsoleInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isRunning,
  mode = 'Edit',
  onModeChange,
  onOpenSettings,
}: AgentConsoleInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [agentAvailability, setAgentAvailability] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const skillsDropdownRef = useRef<HTMLDivElement>(null);
  const { agents, activeAgentId, setActiveAgentId, skills } = useWorkspace();

  const activeAgent = agents.find(a => a.id === activeAgentId);
  const activePlatform = activeAgent
    ? PLATFORMS[activeAgent.platform || detectPlatform(activeAgent.command)]
    : null;

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const scrollH = el.scrollHeight;
    const newH = Math.min(MAX_INPUT_HEIGHT, Math.max(MIN_INPUT_HEIGHT, scrollH));
    el.style.height = `${newH}px`;
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setIsAgentOpen(false);
      }
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeOpen(false);
      }
      if (skillsDropdownRef.current && !skillsDropdownRef.current.contains(event.target as Node)) {
        setIsSkillsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return;
    onSubmit();
  }, [value, onSubmit]);

  const handleAttach = async () => {
    try {
      const selected = await open({ multiple: false });
      if (selected && typeof selected === 'string') {
        const el = textareaRef.current;
        if (el) {
          const start = el.selectionStart ?? 0;
          const newValue = value.slice(0, start) + `[Attached: ${selected}]` + value.slice(start);
          onChange(newValue);
        } else {
          onChange(value + ` [Attached: ${selected}]`);
        }
      }
    } catch {
      // Ignore dialog errors
    }
  };

  const handleSkillSelect = (skillCommand: string) => {
    setIsSkillsOpen(false);
    onChange(value + '\n`Skill: ' + skillCommand + '`\n');
  };

  const ModeIcon = MODE_ICONS[mode];

  // Check CLI availability when agent dropdown opens
  useEffect(() => {
    if (!isAgentOpen) return;
    let cancelled = false;
    Promise.all(
      agents.map(async (agent) => {
        if (!agent.command) return { id: agent.id, available: false };
        try {
          const available = await invoke<boolean>('check_command', { command: agent.command });
          return { id: agent.id, available };
        } catch {
          return { id: agent.id, available: false };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, boolean> = {};
      for (const r of results) {
        next[r.id] = r.available;
      }
      setAgentAvailability(next);
    });
    return () => { cancelled = true; };
  }, [isAgentOpen, agents]);

  return (
    <div className="flex flex-col w-full gap-2">
      {/* Input Container */}
      <div
        className={cn(
          "flex flex-col w-full bg-[#0f0f10] border rounded-none transition-all duration-200",
          isFocused
            ? "border-[#A3E635]/60 ring-1 ring-[#A3E635]/20"
            : "border-[#27272A]/60"
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="w-full bg-transparent text-sm text-[#FAFAFA] placeholder:text-zinc-600 resize-none border-none outline-none py-3 px-3 overflow-y-auto custom-scrollbar"
          style={{ minHeight: MIN_INPUT_HEIGHT, maxHeight: MAX_INPUT_HEIGHT }}
          placeholder="Describe what to build"
          rows={1}
        />

        {/* Action Bar — Icon Only */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-transparent shrink-0">
          {/* Left: Icon Group */}
          <div className="flex items-center gap-0.5">
            {/* Attach */}
            <button
              type="button"
              onClick={handleAttach}
              className="flex items-center justify-center w-7 h-7 rounded-none text-zinc-500 hover:text-[#FAFAFA] hover:bg-[#161618] transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>

            {/* Agent Dropdown — Compact */}
            <div className="relative" ref={agentDropdownRef}>
              <button
                type="button"
                onClick={() => setIsAgentOpen(!isAgentOpen)}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-1 rounded-none text-xs font-medium transition-colors",
                  isAgentOpen ? "bg-zinc-800 text-[#FAFAFA]" : "text-zinc-400 hover:text-[#FAFAFA] hover:bg-zinc-800/60"
                )}
                title={activeAgent ? `${activeAgent.name} — ${activePlatform?.name}` : 'Select agent'}
              >
                <Bot className="w-3.5 h-3.5 shrink-0" style={{ color: activePlatform?.iconColor }} />
                <span className="truncate max-w-[70px] hidden sm:inline">
                  {activeAgent?.name ?? 'Agent'}
                </span>
                <ChevronDown className={cn("w-3 h-3 shrink-0 transition-transform", isAgentOpen && "rotate-180")} />
              </button>

              {isAgentOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-48 bg-[#18181b] border border-zinc-800 rounded-none shadow-xl shadow-black/50 overflow-hidden z-50">
                  <div className="py-1">
                    {agents.length === 0 && (
                      <div className="px-3 py-2 text-xs text-zinc-500">No agents configured</div>
                    )}
                    {agents.map((agent) => {
                      const p = PLATFORMS[agent.platform || detectPlatform(agent.command)];
                      const available = agentAvailability[agent.id];
                      const isActive = agent.id === activeAgentId;
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => {
                            setIsAgentOpen(false);
                            if (available === false) {
                              onOpenSettings?.();
                            } else {
                              setActiveAgentId(agent.id);
                            }
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#FAFAFA] hover:bg-zinc-800 transition-colors text-left"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.iconColor }} />
                            <span className={cn("truncate", !isActive && available === false && "text-zinc-500")}>{agent.name}</span>
                          </div>
                          <div className="flex items-center shrink-0 ml-2">
                            {isActive ? (
                              <Check className="w-3.5 h-3.5 text-[#A3E635]" />
                            ) : available === false ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500/80" />
                            ) : available === true ? (
                              <Check className="w-3.5 h-3.5 text-zinc-600" />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <span className="w-px h-4 bg-zinc-800 mx-1" />

            {/* Mode Dropdown — Icon Only */}
            <div className="relative" ref={modeDropdownRef}>
              <button
                type="button"
                onClick={() => setIsModeOpen(!isModeOpen)}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-none transition-colors",
                  isModeOpen ? "bg-zinc-800 text-[#FAFAFA]" : "text-zinc-500 hover:text-[#FAFAFA] hover:bg-[#161618]"
                )}
                title={`Mode: ${mode}`}
              >
                <ModeIcon className="w-3.5 h-3.5" />
              </button>

              {isModeOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-28 bg-[#18181b] border border-zinc-800 rounded-none shadow-xl shadow-black/50 overflow-hidden z-50">
                  <div className="py-1">
                    {(['Plan', 'Edit', 'Chat'] as AgentMode[]).map((m) => {
                      const MIcon = MODE_ICONS[m];
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            onModeChange?.(m);
                            setIsModeOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#FAFAFA] hover:bg-zinc-800 transition-colors text-left"
                        >
                          <div className="flex items-center gap-1.5">
                            <MIcon className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{m}</span>
                          </div>
                          {mode === m && <Check className="w-3.5 h-3.5 text-[#A3E635] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Skills — Icon Only */}
            <div className="relative" ref={skillsDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSkillsOpen(!isSkillsOpen)}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-none transition-colors",
                  isSkillsOpen ? "bg-zinc-800 text-[#FAFAFA]" : "text-zinc-500 hover:text-[#FAFAFA] hover:bg-[#161618]"
                )}
                title="Skills"
              >
                <Wrench className="w-3.5 h-3.5" />
              </button>

              {isSkillsOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-56 bg-[#18181b] border border-zinc-800 rounded-none shadow-xl shadow-black/50 overflow-hidden z-50">
                  <div className="py-1">
                    {skills.length === 0 && (
                      <div className="px-3 py-2 text-xs text-zinc-500">No skills configured</div>
                    )}
                    {skills.map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => handleSkillSelect(skill.command || '')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#FAFAFA] hover:bg-zinc-800 transition-colors text-left"
                      >
                        <span className="truncate">{skill.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings — Icon Only */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center justify-center w-7 h-7 rounded-none text-zinc-500 hover:text-[#FAFAFA] hover:bg-[#161618] transition-colors"
              title="Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Stop — Icon Only */}
            {isRunning && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onStop();
                }}
                className="flex items-center justify-center w-7 h-7 rounded-none text-red-400 hover:bg-red-500/10 transition-colors"
                title="Stop"
              >
                <StopCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Submit */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={!value.trim()}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-none border-2 border-black transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 shrink-0",
              value.trim()
                ? "text-[#09090B] bg-[#A3E635] hover:bg-[#8bc926] shadow-[3px_3px_0px_#000000]"
                : "border-zinc-800 text-zinc-600 cursor-not-allowed"
            )}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
