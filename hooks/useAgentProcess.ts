import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useAgentProcess(onOutput: (chunk: string) => void) {
  const [isRunning, setIsRunning] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    listen<string>('agent-output', (event) => {
      if (!cancelled) {
        onOutput(event.payload);
      }
    }).then((unlisten) => {
      if (!cancelled) {
        unlistenRef.current = unlisten;
      } else {
        unlisten();
      }
    });
    return () => {
      cancelled = true;
      unlistenRef.current?.();
    };
  }, [onOutput]);

  const spawn = useCallback(async (command: string, args: string[], cwd: string) => {
    setIsRunning(true);
    await invoke('spawn_agent', { command, args, cwd });
  }, []);

  const send = useCallback(async (input: string) => {
    await invoke('send_stdin', { input });
  }, []);

  const kill = useCallback(async () => {
    await invoke('kill_agent');
    setIsRunning(false);
  }, []);

  return { spawn, send, kill, isRunning };
}
