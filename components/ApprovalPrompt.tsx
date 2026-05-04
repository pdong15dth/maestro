import React from 'react';
import { KimiApproval } from '@/hooks/useKimiWire';
import { cn } from '@/lib/utils';
import { Check, X, AlertTriangle } from 'lucide-react';

interface ApprovalPromptProps {
  approvals: KimiApproval[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export function ApprovalPrompt({ approvals, onApprove, onReject }: ApprovalPromptProps) {
  if (approvals.length === 0) return null;

  return (
    <div className="space-y-2 my-2">
      {approvals.map((approval) => (
        <div
          key={approval.requestId}
          className="border border-amber-500/30 bg-amber-500/5 rounded p-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-amber-300">
                {approval.toolName ? `${approval.toolName} requires approval` : (approval.title || 'Action requires approval')}
              </div>
              {approval.description && (
                <div className="text-[11px] text-zinc-400 mt-1">{approval.description}</div>
              )}
              <div className="text-[10px] text-zinc-500 mt-1 capitalize">
                Type: {approval.kind}{approval.toolName ? ` • Tool: ${approval.toolName}` : ''}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onApprove(approval.requestId)}
              className={cn(
                'flex items-center gap-1 px-3 py-1 rounded text-xs font-medium',
                'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
              )}
            >
              <Check className="w-3 h-3" />
              Approve
            </button>
            <button
              onClick={() => onReject(approval.requestId)}
              className={cn(
                'flex items-center gap-1 px-3 py-1 rounded text-xs font-medium',
                'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
              )}
            >
              <X className="w-3 h-3" />
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
