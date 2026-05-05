import React, { useState, useMemo } from 'react';
import { KimiToolCall } from '@/hooks/useKimiWire';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, FileText, Terminal, Globe, Search, Folder, Loader2 } from 'lucide-react';

interface ToolCallCardProps {
  tools: KimiToolCall[];
}

const toolIcons: Record<string, React.ReactNode> = {
  ReadFile: <FileText className="w-3.5 h-3.5" />,
  WriteFile: <FileText className="w-3.5 h-3.5" />,
  StrReplaceFile: <FileText className="w-3.5 h-3.5" />,
  Shell: <Terminal className="w-3.5 h-3.5" />,
  SearchWeb: <Globe className="w-3.5 h-3.5" />,
  FetchURL: <Globe className="w-3.5 h-3.5" />,
  Grep: <Search className="w-3.5 h-3.5" />,
  Glob: <Folder className="w-3.5 h-3.5" />,
};

function getToolSummary(tool: KimiToolCall): string {
  if (!tool.arguments) return tool.name;
  try {
    const args = JSON.parse(tool.arguments);
    switch (tool.name) {
      case 'Shell': {
        const cmd = args.command || args.cmd || args.shell || args.exec || '';
        const first = cmd.split('\n')[0];
        return first.length > 120 ? first.slice(0, 120) + '…' : first;
      }
      case 'ReadFile':
      case 'WriteFile':
      case 'StrReplaceFile': {
        const path = args.path || args.file || args.filePath || args.filepath || args.filename || args.file_name || args.target || '';
        return path ? `${tool.name}: ${path}` : tool.name;
      }
      case 'Glob': {
        const pattern = args.pattern || args.glob || args.search || '';
        return pattern ? `Glob: ${pattern}` : tool.name;
      }
      case 'Grep': {
        const pattern = args.pattern || args.query || args.q || args.search || '';
        const path = args.path || args.file || args.dir || '';
        return pattern ? `Grep: "${pattern}"${path ? ` in ${path}` : ''}` : tool.name;
      }
      case 'SearchWeb': {
        const query = args.query || args.q || args.search || '';
        return query ? `Web: ${query}` : tool.name;
      }
      case 'FetchURL': {
        const url = args.url || args.link || args.href || '';
        return url ? `Fetch: ${url}` : tool.name;
      }
      default:
        return tool.name;
    }
  } catch {
    // Fallback: try regex extraction from raw JSON string
    const raw = tool.arguments;
    const pathMatch = raw.match(/"path"\s*:\s*"([^"]+)"/);
    const fileMatch = raw.match(/"file"\s*:\s*"([^"]+)"/);
    const cmdMatch = raw.match(/"command"\s*:\s*"([^"]+)"/);
    const urlMatch = raw.match(/"url"\s*:\s*"([^"]+)"/);
    const fallback = pathMatch?.[1] || fileMatch?.[1] || cmdMatch?.[1] || urlMatch?.[1];
    return fallback ? `${tool.name}: ${fallback}` : tool.name;
  }
}

function ShellCommandPreview({ command, isRunning }: { command: string; isRunning: boolean }) {
  return (
    <div className={cn(
      "flex items-start gap-2 px-3 py-2 rounded border font-mono text-xs",
      isRunning
        ? "bg-black/60 border-[#A3E635]/30 text-[#A3E635]"
        : "bg-zinc-950/50 border-zinc-800 text-zinc-400"
    )}>
      <span className="text-zinc-500 shrink-0 select-none">$</span>
      <span className="whitespace-pre-wrap break-all leading-relaxed">{command}</span>
    </div>
  );
}

function SingleToolCard({ tool }: { tool: KimiToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const icon = toolIcons[tool.name] || <Terminal className="w-3.5 h-3.5" />;
  const summary = useMemo(() => getToolSummary(tool), [tool]);
  const isRunning = !tool.result;
  const isShell = tool.name === 'Shell';
  // Debug: log arguments to console so we can inspect what Kimi CLI sends
  console.log('[ToolCallCard] name=', tool.name, 'args=', tool.arguments, 'summary=', summary);

  return (
    <div className={cn(
      "rounded overflow-hidden border transition-colors",
      isRunning ? "bg-amber-500/5 border-amber-500/20" : "bg-zinc-900/60 border-zinc-800"
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs transition-colors",
          isRunning ? "hover:bg-amber-500/10" : "hover:bg-zinc-800/50"
        )}
      >
        <span className={cn("shrink-0", isRunning ? "text-amber-400" : "text-zinc-400")}>
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
        </span>

        {isShell && tool.arguments ? (
          <span className="font-mono text-[11px] text-[#FAFAFA] whitespace-pre-wrap break-all text-left flex-1" title={summary}>
            {summary}
          </span>
        ) : (
          <span className="font-medium text-zinc-300 text-left flex-1 truncate" title={summary}>
            {summary}
          </span>
        )}

        {tool.result ? (
          <span className="ml-2 text-[10px] text-emerald-400 shrink-0">Done</span>
        ) : (
          <span className="ml-2 text-[10px] text-amber-400 animate-pulse shrink-0 font-bold">Running</span>
        )}
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0 ml-1" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0 ml-1" />
        )}
      </button>

      {isShell && isRunning && tool.arguments && (
        <div className="px-2.5 pb-2">
          <ShellCommandPreview
            command={(() => {
              try {
                const args = JSON.parse(tool.arguments);
                return args.command || args.cmd || args.shell || args.exec || '';
              } catch {
                const raw = tool.arguments;
                const cmdMatch = raw.match(/"command"\s*:\s*"([^"]+)"/);
                return cmdMatch?.[1] || '';
              }
            })()}
            isRunning={isRunning}
          />
        </div>
      )}

      {expanded && (
        <div className="px-2.5 pb-2 space-y-1.5 border-t border-zinc-800/50">
          {tool.arguments && (
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1.5">Arguments</div>
              <pre className="text-[11px] text-zinc-400 bg-zinc-950/50 p-1.5 rounded mt-0.5 overflow-x-auto">
                {tool.arguments}
              </pre>
            </div>
          )}
          {tool.result && (
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1.5">Result</div>
              <pre className="text-[11px] text-zinc-400 bg-zinc-950/50 p-1.5 rounded mt-0.5 overflow-x-auto max-h-32">
                {tool.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ToolCallCard({ tools }: ToolCallCardProps) {
  if (tools.length === 0) return null;
  return (
    <div className="space-y-1.5 my-2">
      {tools.map((tool, i) => (
        <SingleToolCard key={`${tool.id}-${i}`} tool={tool} />
      ))}
    </div>
  );
}
