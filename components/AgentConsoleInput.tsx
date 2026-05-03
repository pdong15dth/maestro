'use client';

import React, { useState, useRef, useEffect } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { EditorView, keymap } from '@codemirror/view';
import { Cpu, SquareTerminal, Sparkles, MessageCircle, StopCircle, ArrowUp, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface AgentConsoleInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

type AgentMode = 'Plan' | 'Edit' | 'Chat';

export function AgentConsoleInput({ value, onChange, onSubmit }: AgentConsoleInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [mode, setMode] = useState<AgentMode>('Edit');
  const [model, setModel] = useState('Claude 3.5 Sonnet');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (cmd: string) => {
    if (!cmd.trim()) return;
    onSubmit();
  };

  // Custom keymap extension for Enter / Shift+Enter
  const enterExtension = keymap.of([
    {
      key: 'Enter',
      run: (view) => {
        const cmd = view.state.doc.toString();
        handleSubmit(cmd);
        return true; // prevent default new line
      },
      shift: () => false, // allow default Shift+Enter
    },
  ]);

  return (
    <div 
      className={cn(
        "flex flex-col w-full bg-[#111113] border rounded-lg shadow-inner transition-all duration-200",
        isFocused 
          ? "border-indigo-500/50 ring-1 ring-indigo-500/20" 
          : "border-zinc-800/80"
      )}
    >
      {/* Markdown Input Area */}
      <div className="relative w-full max-h-[40vh] overflow-y-auto custom-scrollbar">
        <CodeMirror
          ref={editorRef}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          theme={vscodeDark}
          extensions={[
             markdown({ base: markdownLanguage, codeLanguages: languages }),
             EditorView.lineWrapping,
             enterExtension
          ]}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightSelectionMatches: false,
            dropCursor: false,
            bracketMatching: true,
          }}
          className="text-sm border-none outline-none [&_.cm-editor]:bg-transparent [&_.cm-editor.cm-focused]:outline-none [&_.cm-scroller]:bg-transparent [&_.cm-scroller]:font-sans [&_.cm-content]:py-3 [&_.cm-content]:px-3"
          placeholder="Instruct the agent..."
        />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-3 h-12 bg-black/50 border-t border-zinc-800/80 shrink-0 rounded-b-[7px]">
        
        {/* Left Side: Controls */}
        <div className="flex items-center gap-3">
          {/* Model Selector Dropdown Trigger */}
          <div className="relative flex items-center" ref={dropdownRef}>
            <button 
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors text-xs font-medium",
                isDropdownOpen ? "bg-zinc-800 text-zinc-300" : "hover:bg-zinc-800 text-zinc-400"
              )}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{model}</span>
            </button>
            
            {/* Drop-up Menu */}
            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#18181b] border border-zinc-800/80 rounded-md shadow-xl shadow-black/50 overflow-hidden z-50">
                <div className="py-1">
                  {['Claude 3.5 Sonnet', 'Claude 3 Opus', 'Kimi (Moonshot)', 'Ollama: Llama 3 (Local)'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setModel(m);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-sm text-zinc-300 hover:bg-indigo-600 hover:text-white transition-colors text-left"
                    >
                      <span className="truncate">{m}</span>
                      {model === m && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-[1px] h-4 bg-zinc-800" />

          {/* Mode Selector */}
          <div className="flex items-center p-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
            {(['Plan', 'Edit', 'Chat'] as AgentMode[]).map((m) => {
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  onClick={(e) => {
                    e.preventDefault();
                    setMode(m);
                  }}
                  className={cn(
                    "relative px-2.5 py-1 text-[11px] font-semibold rounded-sm transition-all duration-200 flex items-center gap-1.5",
                    isActive ? "text-indigo-300" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mode-bg"
                      className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 rounded-sm"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {m === 'Plan' && <Sparkles className="w-3 h-3 relative z-10" />}
                  {m === 'Edit' && <SquareTerminal className="w-3 h-3 relative z-10" />}
                  {m === 'Chat' && <MessageCircle className="w-3 h-3 relative z-10" />}
                  <span className="relative z-10">{m}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            className="flex items-center justify-center h-7 px-3 rounded-md bg-transparent hover:bg-red-500/10 text-zinc-500 hover:text-red-400 text-xs font-semibold transition-colors gap-1.5"
            onClick={(e) => e.preventDefault()}
          >
            <StopCircle className="w-3.5 h-3.5" />
            Stop
          </button>
          
          <button 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(value);
            }}
            disabled={!value.trim()} 
            className="flex items-center justify-center h-7 px-3 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors gap-1.5 shadow-lg shadow-indigo-500/20"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            Send
          </button>
        </div>
        
      </div>
    </div>
  );
}
