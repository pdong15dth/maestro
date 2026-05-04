import React, { useState, useMemo } from 'react';
import { KimiToolCall } from '@/hooks/useKimiWire';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, FileText, Terminal, Globe, Search, Folder } from 'lucide-react';

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
        const cmd = args.command || args.cmd || args.shell || '';
        // Show first line / first 60 chars
        const first = cmd.split('\n')[0];
        return first.length > 60 ? first.slice(0, 60) + '…' : first;
      }
      case 'ReadFile':
      case 'WriteFile':
      case 'StrReplaceFile': {
        const path = args.path || args.file || args.filePath || '';
        return path ? `${tool.name}: ${path}` : tool.name;
      }
      case 'Glob': {
        const pattern = args.pattern || args.glob || '';
        return pattern ? `Glob: ${pattern}` : tool.name;
      }
      case 'Grep': {
        const pattern = args.pattern || args.query || '';
        const path = args.path || '';
        return pattern ? `Grep: "${pattern}"${path ? ` in ${path}` : ''}` : tool.name;
      }
      case 'SearchWeb': {
        const query = args.query || args.q || '';
        return query ? `Web: ${query}` : tool.name;
      }
      case 'FetchURL': {
        const url = args.url || '';
        return url ? `Fetch: ${url}` : tool.name;
      }
      default:
        return tool.name;
    }
  } catch {
    return tool.name;
  }
}

function SingleToolCard({ tool }: { tool: KimiToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const icon = toolIcons[tool.name] || <Terminal className="w-3.5 h-3.5" />;
  const summary = useMemo(() => getToolSummary(tool), [tool]);

  return (
    <div className="border border-zinc-800 rounded bg-zinc-900/60 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-zinc-400">{icon}</span>
        <span className="font-medium text-zinc-300 truncate" title={summary}>{summary}</span>
        {tool.result ? (
          <span className="ml-auto text-[10px] text-emerald-400 shrink-0">Done</span>
        ) : (
          <span className="ml-auto text-[10px] text-amber-400 animate-pulse shrink-0">Running</span>
        )}
        {expanded ? <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />}
      </button>
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
