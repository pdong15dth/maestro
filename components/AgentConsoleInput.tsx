'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Cpu, ArrowUp, Check, Plus, ChevronDown, SlidersHorizontal,
  StopCircle, Bold, Italic, Code, Link, List, Heading, Quote, Strikethrough,
  Paperclip, Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { open } from '@tauri-apps/plugin-dialog';

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
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isApprovalsOpen, setIsApprovalsOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [contextScope, setContextScope] = useState('Whole Workspace');
  const [autoApprove, setAutoApprove] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const contextDropdownRef = useRef<HTMLDivElement>(null);
  const approvalsDropdownRef = useRef<HTMLDivElement>(null);
  const skillsDropdownRef = useRef<HTMLDivElement>(null);
  const { agents, activeAgentId, setActiveAgentId, skills } = useWorkspace();

  const activeAgent = agents.find(a => a.id === activeAgentId);

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
      if (contextDropdownRef.current && !contextDropdownRef.current.contains(event.target as Node)) {
        setIsContextOpen(false);
      }
      if (approvalsDropdownRef.current && !approvalsDropdownRef.current.contains(event.target as Node)) {
        setIsApprovalsOpen(false);
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

  const insertMarkdown = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = value.slice(start, end);
    const text = selected || placeholder;
    const newValue = value.slice(0, start) + before + text + after + value.slice(end);
    onChange(newValue);
    setTimeout(() => {
      const pos = selected ? start + before.length : start + before.length + text.length;
      el.selectionStart = el.selectionEnd = pos;
      el.focus();
    }, 0);
  }, [value, onChange]);

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

  const toolbarItems = [
    { icon: Bold, label: 'Bold', action: () => insertMarkdown('**', '**') },
    { icon: Italic, label: 'Italic', action: () => insertMarkdown('*', '*') },
    { icon: Strikethrough, label: 'Strike', action: () => insertMarkdown('~~', '~~') },
    { icon: Heading, label: 'Heading', action: () => insertMarkdown('## ', '', 'Heading') },
    { icon: Quote, label: 'Quote', action: () => insertMarkdown('> ', '', 'Quote') },
    { icon: List, label: 'List', action: () => insertMarkdown('- ', '', 'Item') },
    { icon: Code, label: 'Code', action: () => insertMarkdown('`', '`', 'code') },
    { icon: Link, label: 'Link', action: () => insertMarkdown('[', '](url)', 'text') },
  ];

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

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 pb-1">
          {toolbarItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              title={item.label}
              className="p-1.5 rounded-none text-zinc-500 hover:text-[#FAFAFA] hover:bg-zinc-800/60 transition-colors"
            >
              <item.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-transparent shrink-0 flex-wrap gap-1">
          {/* Left Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Attach Button */}
            <button
              type="button"
              onClick={handleAttach}
              className="flex items-center justify-center w-7 h-7 rounded-none text-zinc-500 hover:text-[#FAFAFA] hover:bg-[#161618] transition-colors"
              title="Attach"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Agent Dropdown */}
            <div className="relative" ref={agentDropdownRef}>
              <button
                type="button"
                onClick={() => setIsAgentOpen(!isAgentOpen)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-none text-xs font-medium transition-colors",
                  isAgentOpen ? "bg-zinc-800 text-[#FAFAFA]" : "text-zinc-400 hover:text-[#FAFAFA] hover:bg-zinc-800/60"
                )}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>{activeAgent?.name ?? 'Agent'}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", isAgentOpen && "rotate-180")} />
              </button>

              {isAgentOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-52 bg-[#18181b] border border-zinc-800 rounded-none shadow-xl shadow-black/50 overflow-hidden z-50">
                  <div className="py-1">
                    {agents.length === 0 && (
                      <div className="px-3 py-2 text-xs text-zinc-500">No agents configured</div>
                    )}
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => {
                          setActiveAgentId(agent.id);
                          setIsAgentOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#FAFAFA] hover:bg-zinc-800 transition-colors text-left"
                      >
                        <span className="truncate">{agent.name}</span>
                        {activeAgentId === agent.id && <Check className="w-3.5 h-3.5 text-[#A3E635] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mode Dropdown */}
            <div className="relative" ref={modeDropdownRef}>
              <button
                type="button"
                onClick={() => setIsModeOpen(!isModeOpen)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-none text-xs font-medium transition-colors",
                  isModeOpen ? "bg-zinc-800 text-[#FAFAFA]" : "text-zinc-400 hover:text-[#FAFAFA] hover:bg-zinc-800/60"
                )}
              >
                <span>{mode}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", isModeOpen && "rotate-180")} />
              </button>

              {isModeOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-32 bg-[#18181b] border border-zinc-800 rounded-none shadow-xl shadow-black/50 overflow-hidden z-50">
                  <div className="py-1">
                    {(['Plan', 'Edit', 'Chat'] as AgentMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          onModeChange?.(m);
                          setIsModeOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#FAFAFA] hover:bg-zinc-800 transition-colors text-left"
                      >
                        <span>{m}</span>
                        {mode === m && <Check className="w-3.5 h-3.5 text-[#A3E635] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Skills Dropdown */}
            <div className="relative" ref={skillsDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSkillsOpen(!isSkillsOpen)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-none text-xs font-medium transition-colors",
                  isSkillsOpen ? "bg-zinc-800 text-[#FAFAFA]" : "text-zinc-400 hover:text-[#FAFAFA] hover:bg-zinc-800/60"
                )}
                title="Skills"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Skills</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", isSkillsOpen && "rotate-180")} />
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
                        onClick={() => handleSkillSelect(skill.command)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#FAFAFA] hover:bg-zinc-800 transition-colors text-left"
                      >
                        <span className="truncate">{skill.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tools / Settings */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center justify-center w-7 h-7 rounded-none text-zinc-500 hover:text-[#FAFAFA] hover:bg-[#161618] transition-colors"
              title="Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Stop (only when running) */}
            {isRunning && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onStop();
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-none text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Stop
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
              "flex items-center justify-center w-8 h-8 rounded-none border-2 border-black transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 shrink-0 ml-auto",
              value.trim()
                ? "text-[#09090B] bg-[#A3E635] hover:bg-[#8bc926] shadow-[3px_3px_0px_#000000]"
                : "border-zinc-800 text-zinc-600 cursor-not-allowed"
            )}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Context Bar */}
      <div className="flex items-center gap-3 px-1 flex-wrap">
        <div className="relative" ref={contextDropdownRef}>
          <button
            onClick={() => setIsContextOpen(!isContextOpen)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-[#FAFAFA] transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-none bg-[#A3E635]/80" />
            {contextScope}
            <ChevronDown className={cn("w-3 h-3 transition-transform", isContextOpen && "rotate-180")} />
          </button>
          {isContextOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-40 bg-[#18181b] border border-zinc-800 rounded-none shadow-xl z-50">
              {['Whole Workspace', 'Current File', 'Selected Folder'].map((scope) => (
                <button
                  key={scope}
                  onClick={() => { setContextScope(scope); setIsContextOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-[#FAFAFA] hover:bg-zinc-800 transition-colors"
                >
                  {scope}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={approvalsDropdownRef}>
          <button
            onClick={() => setIsApprovalsOpen(!isApprovalsOpen)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-[#FAFAFA] transition-colors"
          >
            {autoApprove ? 'Auto-Approve' : 'Default Approvals'}
            <ChevronDown className={cn("w-3 h-3 transition-transform", isApprovalsOpen && "rotate-180")} />
          </button>
          {isApprovalsOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-40 bg-[#18181b] border border-zinc-800 rounded-none shadow-xl z-50">
              <button
                onClick={() => { setAutoApprove(false); setIsApprovalsOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-[#FAFAFA] hover:bg-zinc-800 transition-colors"
              >
                Default Approvals
              </button>
              <button
                onClick={() => { setAutoApprove(true); setIsApprovalsOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-[#FAFAFA] hover:bg-zinc-800 transition-colors"
              >
                Auto-Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
