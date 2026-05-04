import React from 'react';
import { KimiWireState } from '@/hooks/useKimiWire';
import { cn } from '@/lib/utils';
import { Brain, Cpu, FileSearch, Loader2 } from 'lucide-react';

interface KimiStatusBarProps {
  state: KimiWireState;
}

export function KimiStatusBar({ state }: KimiStatusBarProps) {
  const { status, contextUsage, isReady } = state;

  const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    idle: { label: isReady ? 'Ready' : 'Offline', icon: <Cpu className="w-3 h-3" />, color: 'text-zinc-400' },
    initializing: { label: 'Initializing...', icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'text-blue-400' },
    thinking: { label: 'Thinking...', icon: <Brain className="w-3 h-3 animate-pulse" />, color: 'text-amber-400' },
    streaming: { label: 'Responding...', icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'text-emerald-400' },
    tool_call: { label: 'Using tool...', icon: <FileSearch className="w-3 h-3 animate-pulse" />, color: 'text-cyan-400' },
    waiting_approval: { label: 'Needs approval', icon: <Brain className="w-3 h-3 text-rose-400" />, color: 'text-rose-400' },
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800">
      <div className={cn('flex items-center gap-1.5 text-xs font-medium', config.color)}>
        {config.icon}
        <span>{config.label}</span>
      </div>

      {contextUsage && contextUsage.max > 0 && (
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                contextUsage.percent > 90 ? 'bg-rose-500' : contextUsage.percent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
              )}
              style={{ width: `${Math.min(contextUsage.percent, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-500 tabular-nums whitespace-nowrap">
            {(contextUsage.tokens / 1000).toFixed(1)}k / {(contextUsage.max / 1000).toFixed(0)}k
          </span>
        </div>
      )}
    </div>
  );
}
