import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState } from 'react';

export type KimiWireStatus =
  | 'idle'
  | 'initializing'
  | 'thinking'
  | 'streaming'
  | 'tool_call'
  | 'waiting_approval';

export interface KimiContextUsage {
  percent: number;
  tokens: number;
  max: number;
}

export interface KimiToolCall {
  id: string;
  name: string;
  arguments?: string;
  result?: string;
}

export interface KimiApproval {
  requestId: string;
  kind: string;
  title?: string;
  description?: string;
  toolName?: string;
}

export interface KimiWireState {
  status: KimiWireStatus;
  isReady: boolean;
  contextUsage: KimiContextUsage | null;
  toolCalls: KimiToolCall[];
  pendingApprovals: KimiApproval[];
  error: string | null;
}

interface WireEventPayload {
  session_id: string;
  event_type: string;
  payload: unknown;
}

interface WireRequestPayload {
  session_id: string;
  request_id: string;
  request_type: string;
  payload: unknown;
}

interface WireResponsePayload {
  session_id: string;
  id: string;
  result?: unknown;
  error?: unknown;
}

interface WireReadyPayload {
  session_id: string;
}

export function useKimiWire(
  sessionId: string,
  onTurnBegin?: (input: string) => void,
  onTextChunk?: (text: string) => void,
  onThinkChunk?: (text: string) => void,
  onTurnEnd?: () => void,
  onToolCall?: (tool: KimiToolCall) => void,
  onToolResult?: (toolId: string, result: string) => void,
  onApprovalRequest?: (approval: KimiApproval) => void,
  onToolCallUpdate?: (toolId: string, args: string) => void,
) {
  const [state, setState] = useState<KimiWireState>({
    status: 'idle',
    isReady: false,
    contextUsage: null,
    toolCalls: [],
    pendingApprovals: [],
    error: null,
  });

  // Keep streaming text in refs to avoid re-rendering the hook on every chunk
  const currentMessageRef = useRef('');
  const thinkingContentRef = useRef('');
  const currentToolCallIdRef = useRef('');
  const toolCallArgsBufferRef = useRef('');

  const isReadyRef = useRef(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  const unlistenReadyRef = useRef<(() => void) | null>(null);
  const unlistenEventRef = useRef<(() => void) | null>(null);
  const unlistenRequestRef = useRef<(() => void) | null>(null);
  const unlistenResponseRef = useRef<(() => void) | null>(null);
  const unlistenStderrRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    listen<WireReadyPayload>('kimi-wire-ready', (event) => {
      console.log('[useKimiWire] kimi-wire-ready', event.payload);
      if (cancelled || event.payload.session_id !== sessionId) return;
      isReadyRef.current = true;
      setState((prev) => ({ ...prev, isReady: true, status: 'idle' }));
    }).then((unlisten) => {
      if (!cancelled) unlistenReadyRef.current = unlisten;
      else unlisten();
    }).catch(() => {});

    // Helper to process any event payload (used for both top-level and SubagentEvent unwrap)
    const processEvent = (eventType: string, payload: unknown) => {
      switch (eventType) {
        case 'TurnBegin': {
          const input = (payload as Record<string, unknown>)?.user_input as string || '';
          currentMessageRef.current = '';
          thinkingContentRef.current = '';
          setState((prev) => ({
            ...prev,
            status: 'thinking',
            toolCalls: [],
            error: null,
          }));
          onTurnBegin?.(input);
          break;
        }
        case 'StepBegin': {
          setState((prev) => ({ ...prev, status: 'thinking' }));
          break;
        }
        case 'StatusUpdate': {
          const p = payload as Record<string, unknown>;
          const usage: KimiContextUsage | null =
            p.context_usage != null
              ? {
                  percent: Math.round(((p.context_usage as number) || 0) * 100),
                  tokens: (p.context_tokens as number) || 0,
                  max: (p.max_context_tokens as number) || 0,
                }
              : null;
          setState((prev) => ({ ...prev, contextUsage: usage }));
          break;
        }
        case 'ContentPart': {
          const p = payload as Record<string, unknown>;
          const partType = (p.type as string) || '';
          console.log('[KW-APPROVAL] ContentPart type=', partType);
          if (partType === 'text') {
            const text = (p.text as string) || '';
            currentMessageRef.current += text;
            setState((prev) => prev.status === 'streaming' ? prev : { ...prev, status: 'streaming' });
            onTextChunk?.(text);
          } else if (partType === 'think' || partType === 'thinking') {
            const text = (p.think as string) || '';
            thinkingContentRef.current += text;
            onThinkChunk?.(text);
          }
          break;
        }
        case 'TextPart': {
          const p = payload as Record<string, unknown>;
          const text = (p.text as string) || '';
          console.log('[KW-APPROVAL] TextPart text len=', text.length);
          currentMessageRef.current += text;
          setState((prev) => prev.status === 'streaming' ? prev : { ...prev, status: 'streaming' });
          onTextChunk?.(text);
          break;
        }
        case 'ThinkPart':
        case 'thinking': {
          const p = payload as Record<string, unknown>;
          const text = (p.text as string) || '';
          thinkingContentRef.current += text;
          onThinkChunk?.(text);
          break;
        }
        case 'ToolCall': {
          const p = payload as Record<string, unknown>;
          console.log('[KW-APPROVAL] ToolCall raw payload=', JSON.stringify(p));
          console.log('[KW-APPROVAL] ToolCall payload keys=', Object.keys(p));
          const funcObj = (p as Record<string, unknown>).function as Record<string, unknown> | undefined;
          if (funcObj) {
            console.log('[KW-APPROVAL] ToolCall funcObj keys=', Object.keys(funcObj));
          }
          const toolId = (p.id as string) || (p.toolCallId as string) || (p.tool_id as string) || '';
          const toolName = (p.name as string) || (p.tool_name as string) || (funcObj?.name as string) || '';
          let toolArgs: string | undefined;
          let rawArgs = p.arguments ?? (funcObj?.arguments as string) ?? p.args ?? p.input ?? undefined;
          // If p.arguments is an empty string, try funcObj.arguments instead
          if (typeof rawArgs === 'string' && rawArgs.trim() === '') {
            rawArgs = (funcObj?.arguments as string) ?? p.args ?? p.input ?? undefined;
          }
          console.log('[KW-APPROVAL] ToolCall rawArgs=', rawArgs, 'typeof=', typeof rawArgs);
          if (rawArgs !== undefined) {
            toolArgs = typeof rawArgs === 'string' ? rawArgs : JSON.stringify(rawArgs);
          }
          const tool: KimiToolCall = {
            id: toolId,
            name: toolName,
            arguments: toolArgs,
            result: (p.result as string) || undefined,
          };
          currentToolCallIdRef.current = toolId;
          toolCallArgsBufferRef.current = toolArgs || '';
          console.log('[KW-APPROVAL] ToolCall resolved id=', tool.id, 'name=', tool.name, 'args=', toolArgs);
          setState((prev) => ({
            ...prev,
            status: 'tool_call',
            toolCalls: [...prev.toolCalls, tool],
          }));
          onToolCall?.(tool);
          break;
        }
        case 'ToolCallPart': {
          const p = payload as Record<string, unknown>;
          const part = (p.arguments_part as string) || '';
          if (!part) break;
          toolCallArgsBufferRef.current += part;
          const updatedArgs = toolCallArgsBufferRef.current;
          const targetId = currentToolCallIdRef.current;
          console.log('[KW-APPROVAL] ToolCallPart part=', part, 'accumulated=', updatedArgs, 'targetId=', targetId);
          setState((prev) => ({
            ...prev,
            toolCalls: prev.toolCalls.map((t) =>
              t.id === targetId ? { ...t, arguments: updatedArgs } : t
            ),
          }));
          onToolCallUpdate?.(targetId, updatedArgs);
          break;
        }
        case 'ToolResult': {
          const p = payload as Record<string, unknown>;
          // Kimi CLI uses tool_call_id (snake_case) and return_value.output
          const toolId = (p.tool_call_id as string) || (p.id as string) || (p.toolCallId as string) || '';
          const returnValue = p.return_value as Record<string, unknown> | undefined;
          let result = '';
          if (returnValue && returnValue.output !== undefined) {
            result = typeof returnValue.output === 'string' ? returnValue.output : JSON.stringify(returnValue.output);
          } else {
            const rawResult = p.result;
            result = rawResult !== undefined
              ? (typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult))
              : '';
          }
          console.log('[KW-APPROVAL] ToolResult raw payload=', JSON.stringify(p));
          console.log('[KW-APPROVAL] ToolResult resolved id=', toolId, 'result len=', result.length);
          setState((prev) => {
            const hasMatch = prev.toolCalls.some((t) => t.id === toolId);
            if (!hasMatch) {
              console.warn('[KW-APPROVAL] ToolResult id not found in toolCalls:', toolId, 'available ids=', prev.toolCalls.map(t => t.id));
            }
            return {
              ...prev,
              toolCalls: prev.toolCalls.map((t) =>
                t.id === toolId ? { ...t, result } : t
              ),
            };
          });
          onToolResult?.(toolId, result);
          break;
        }
        case 'TurnEnd':
        case 'StepInterrupted': {
          setState((prev) => ({ ...prev, status: 'idle', pendingApprovals: [] }));
          onTurnEnd?.();
          break;
        }
        case 'Notification': {
          const p = payload as Record<string, unknown>;
          const text = (p.message as string) || '';
          currentMessageRef.current += '\n' + text;
          onTextChunk?.('\n' + text);
          break;
        }
        case 'CompactionBegin': {
          currentMessageRef.current += '\n*[Context compaction started...]*';
          break;
        }
        case 'CompactionEnd': {
          currentMessageRef.current += '\n*[Context compaction finished]*';
          break;
        }
        default:
          // Ignore unknown events silently
          break;
      }
    };

    listen<WireEventPayload>('kimi-wire-event', (event) => {
      console.log('[useKimiWire] kimi-wire-event', event.payload);
      if (cancelled || event.payload.session_id !== sessionId) return;
      const { event_type, payload } = event.payload;

      if (event_type === 'SubagentEvent') {
        // Unwrap nested event from SubagentEvent payload
        const p = payload as Record<string, unknown>;
        const nestedEvent = p.event as Record<string, unknown> | undefined;
        if (nestedEvent) {
          const nestedType = (nestedEvent.type as string) || '';
          const nestedPayload = nestedEvent.payload;
          console.log('[KW-APPROVAL] SubagentEvent unwrap type=', nestedType);
          processEvent(nestedType, nestedPayload);
        }
      } else {
        processEvent(event_type, payload);
      }
    }).then((unlisten) => {
      if (!cancelled) unlistenEventRef.current = unlisten;
      else unlisten();
    }).catch(() => {});

    listen<WireRequestPayload>('kimi-wire-request', (event) => {
      if (cancelled || event.payload.session_id !== sessionId) return;
      const { request_id, request_type, payload } = event.payload;

      if (request_type === 'ApprovalRequest') {
        const p = payload as Record<string, unknown>;
        console.log('[KW-APPROVAL] ApprovalRequest request_id=', request_id, 'payload=', JSON.stringify(p));
        const approval: KimiApproval = {
          requestId: request_id,
          kind: (p.kind as string) || 'action',
          title: (p.title as string) || undefined,
          description: (p.description as string) || undefined,
          toolName: (p.toolName as string) || (p.tool as string) || (p.tool_name as string) || undefined,
        };
        setState((prev) => ({
          ...prev,
          status: 'waiting_approval',
          pendingApprovals: [...prev.pendingApprovals, approval],
        }));
        onApprovalRequest?.(approval);
      }
      // QuestionRequest and ToolCallRequest can be added later
    }).then((unlisten) => {
      if (!cancelled) unlistenRequestRef.current = unlisten;
      else unlisten();
    }).catch(() => {});

    listen<WireResponsePayload>('kimi-wire-response', (event) => {
      if (cancelled || event.payload.session_id !== sessionId) return;
      const { id, error } = event.payload;
      if (id === 'prompt' && error) {
        setState((prev) => ({
          ...prev,
          status: 'idle',
          error: JSON.stringify(error),
        }));
      }
    }).then((unlisten) => {
      if (!cancelled) unlistenResponseRef.current = unlisten;
      else unlisten();
    }).catch(() => {});

    listen<{ session_id: string; chunk: string }>('kimi-wire-stderr', (event) => {
      if (cancelled || event.payload.session_id !== sessionId) return;
      // Log stderr for debugging; do not show in chat
      console.warn('[kimi-wire-stderr]', event.payload.chunk);
    }).then((unlisten) => {
      if (!cancelled) unlistenStderrRef.current = unlisten;
      else unlisten();
    }).catch(() => {});

    return () => {
      cancelled = true;
      unlistenReadyRef.current?.();
      unlistenEventRef.current?.();
      unlistenRequestRef.current?.();
      unlistenResponseRef.current?.();
      unlistenStderrRef.current?.();
    };
  }, [sessionId, onTurnBegin, onTextChunk, onThinkChunk, onTurnEnd, onToolCall, onToolResult, onApprovalRequest]);

  const initWire = useCallback(async (sid: string, cwd: string) => {
    isReadyRef.current = false;
    setState((prev) => ({ ...prev, status: 'initializing', isReady: false, error: null }));
    await invoke('init_kimi_wire', { sessionId: sid, cwd });
  }, []);

  const sendPrompt = useCallback(async (sid: string, input: string) => {
    await invoke('send_kimi_prompt', { sessionId: sid, input });
  }, []);

  const respondRequest = useCallback(async (sid: string, requestId: string, payload: unknown) => {
    await invoke('respond_kimi_request', { sessionId: sid, requestId, payload });
    // Remove from pending approvals locally
    setState((prev) => ({
      ...prev,
      pendingApprovals: prev.pendingApprovals.filter((a) => a.requestId !== requestId),
      status: prev.pendingApprovals.length <= 1 ? 'thinking' : prev.status,
    }));
  }, []);

  const killWire = useCallback(async (sid: string) => {
    await invoke('kill_kimi_wire', { sessionId: sid });
    isReadyRef.current = false;
    currentMessageRef.current = '';
    thinkingContentRef.current = '';
    setState({
      status: 'idle',
      isReady: false,
      contextUsage: null,
      toolCalls: [],
      pendingApprovals: [],
      error: null,
    });
  }, []);

  return {
    state,
    isReadyRef,
    initWire,
    sendPrompt,
    respondRequest,
    killWire,
  };
}
