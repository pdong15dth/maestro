import React, { useState, useEffect } from 'react';
import { FolderOpen, ChevronRight } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { open } from '@tauri-apps/plugin-dialog';

export function WelcomeScreen() {
  const { setCurrentWorkspace, recentWorkspaces, addRecentWorkspace, loadWorkspace } = useWorkspace();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectWorkspace = async () => {
    try {
      const selected = await open({ directory: true });
      if (selected && typeof selected === 'string') {
        setCurrentWorkspace(selected);
        addRecentWorkspace(selected);
        await loadWorkspace(selected);
      }
    } catch {
      // Ignore dialog errors
    }
  };

  const handleSelectRecent = async (path: string) => {
    setCurrentWorkspace(path);
    addRecentWorkspace(path);
    await loadWorkspace(path);
  };

  const brandChars = 'MAESTRO'.split('');

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#09090B] p-6 h-screen w-full relative overflow-hidden">
      {/* Animated grid background */}
      <div
        className="absolute inset-0 animate-[gridPulse_4s_ease-in-out_infinite]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #27272A 1px, transparent 1px), linear-gradient(to bottom, #27272A 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full">
        {/* Logo */}
        <div
          className="w-28 h-28 animate-[scaleIn_0.6s_ease-out_both]"
          style={{ animationDelay: '0.1s' }}
        >
          <img
            src="/logo/logo.svg"
            alt="Maestro"
            className="w-full h-full drop-shadow-lg"
          />
        </div>

        {/* Brand name with typing animation */}
        <div
          className="flex items-center gap-[3px] text-[28px] font-bold tracking-[6px] text-[#FAFAFA] font-mono select-none"
          style={{ animationDelay: '0.3s' }}
        >
          {brandChars.map((char, i) => (
            <span
              key={i}
              className="inline-block opacity-0 animate-[charReveal_0.08s_ease-out_forwards]"
              style={{ animationDelay: `${0.4 + i * 0.07}s` }}
            >
              {char}
            </span>
          ))}
          <span
            className="inline-block w-[10px] h-[22px] bg-[#A3E635] ml-1 animate-[blink_1s_step-end_infinite]"
            style={{ animationDelay: '0.95s' }}
          />
        </div>

        {/* Terminal subtitle */}
        <p
          className="text-zinc-500 text-sm font-mono text-center animate-[fadeIn_0.5s_ease-out_both]"
          style={{ animationDelay: '1.1s' }}
        >
          <span className="text-[#A3E635] mr-2">&gt;_</span>
          Select a workspace to initialize the AI Agent.
        </p>

        {/* Brutalist CTA Button */}
        <button
          onClick={handleSelectWorkspace}
          className="group flex items-center gap-3 px-7 py-3.5 bg-[#A3E635] text-black font-bold text-sm tracking-wide rounded-none border-2 border-black animate-[slideUp_0.5s_ease-out_both] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0"
          style={{
            animationDelay: '1.3s',
            boxShadow: '4px 4px 0px #000000',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '6px 6px 0px #000000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '4px 4px 0px #000000';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.boxShadow = '2px 2px 0px #000000';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = '6px 6px 0px #000000';
          }}
        >
          <FolderOpen className="w-5 h-5 transition-transform group-hover:scale-110" />
          OPEN FOLDER
        </button>

        {/* Recent workspaces */}
        {mounted && recentWorkspaces.length > 0 && (
          <div
            className="w-full animate-[slideUp_0.5s_ease-out_both]"
            style={{ animationDelay: '1.5s' }}
          >
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-600 uppercase tracking-widest mb-3 px-1">
              <span className="text-[#A3E635]">#</span>
              Recent Workspaces
            </div>
            <div className="flex flex-col gap-2">
              {recentWorkspaces.map((path, idx) => (
                <button
                  key={path}
                  onClick={() => handleSelectRecent(path).catch(() => {})}
                  className="group flex items-center justify-between w-full p-3 text-left bg-[#111113]/80 border border-[#27272A] hover:border-[#A3E635]/60 hover:bg-[#161618] transition-all duration-200 opacity-0 animate-[slideUp_0.4s_ease-out_forwards]"
                  style={{ animationDelay: `${1.6 + idx * 0.08}s` }}
                >
                  <div className="flex items-center overflow-hidden gap-3 min-w-0">
                    <FolderOpen className="w-4 h-4 text-zinc-600 group-hover:text-[#A3E635] transition-colors shrink-0" />
                    <span className="text-sm font-mono text-zinc-400 group-hover:text-[#FAFAFA] truncate">
                      {path}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-[#A3E635] opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
