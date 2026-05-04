import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState } from 'react';

interface AgentOutputPayload {
  session_id: string;
  chunk: string;
}

interface SessionExitedPayload {
  session_id: string;
}

export function useAgentProcess(
  onOutput: (sessionId: string, chunk: string) => void,
  onSessionExited?: (sessionId: string) => void
) {
  const [isRunning, setIsRunning] = useState(false);
  const unlistenOutputRef = useRef<(() => void) | null>(null);
  const unlistenExitedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    listen<AgentOutputPayload>('agent-output', (event) => {
      if (!cancelled) {
        onOutput(event.payload.session_id, event.payload.chunk);
        if (event.payload.chunk.includes('[Process exited]')) {
          setIsRunning(false);
          onSessionExited?.(event.payload.session_id);
        }
      }
    }).then((unlisten) => {
      if (!cancelled) {
        unlistenOutputRef.current = unlisten;
      } else {
        unlisten();
      }
    }).catch(() => {});

    listen<SessionExitedPayload>('session-exited', (event) => {
      if (!cancelled) {
        setIsRunning(false);
        onSessionExited?.(event.payload.session_id);
      }
    }).then((unlisten) => {
      if (!cancelled) {
        unlistenExitedRef.current = unlisten;
      } else {
        unlisten();
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
      unlistenOutputRef.current?.();
      unlistenExitedRef.current?.();
    };
  }, [onOutput, onSessionExited]);

  const spawn = useCallback(async (sessionId: string, command: string, args: string[], cwd: string) => {
    setIsRunning(true);
    await invoke('spawn_agent', { sessionId, command, args, cwd });
  }, []);

  const runTask = useCallback(async (sessionId: string, command: string, args: string[], cwd: string) => {
    setIsRunning(true);
    await invoke('run_agent_task', { sessionId, command, args, cwd });
  }, []);

  const spawnShell = useCallback(async (sessionId: string, cwd: string) => {
    setIsRunning(true);
    await invoke('spawn_shell', { sessionId, cwd });
  }, []);

  const send = useCallback(async (sessionId: string, input: string) => {
    await invoke('send_stdin', { sessionId, input });
  }, []);

  const kill = useCallback(async (sessionId: string) => {
    await invoke('kill_agent', { sessionId });
    setIsRunning(false);
  }, []);

  const killAll = useCallback(async () => {
    await invoke('kill_all_agents');
    setIsRunning(false);
  }, []);

  return { spawn, runTask, spawnShell, send, kill, killAll, isRunning };
}
