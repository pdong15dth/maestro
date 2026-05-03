import { Store } from '@tauri-apps/plugin-store';
import { useCallback, useEffect, useState } from 'react';

export interface Agent {
  id: string;
  name: string;
  command: string;
  args: string[];
  systemPrompt: string;
  isCustom?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  command: string;
}

const STORE_KEY = 'config.json';

export function useAgentStore() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Store.load(STORE_KEY, { defaults: {}, autoSave: true })
      .then(async (store) => {
        const savedAgents = (await store.get<Agent[]>('agents')) ?? [];
        const savedSkills = (await store.get<Skill[]>('skills')) ?? [];
        if (!cancelled) {
          setAgents(savedAgents);
          setSkills(savedSkills);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const saveAgents = useCallback(async (next: Agent[]) => {
    setAgents(next);
    const store = await Store.load(STORE_KEY, { defaults: {}, autoSave: true });
    await store.set('agents', next);
  }, []);

  const saveSkills = useCallback(async (next: Skill[]) => {
    setSkills(next);
    const store = await Store.load(STORE_KEY, { defaults: {}, autoSave: true });
    await store.set('skills', next);
  }, []);

  return { agents, skills, ready, saveAgents, saveSkills };
}
