import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import { useCallback, useEffect, useState } from 'react';
import { AgentPlatform, detectPlatform, PLATFORMS } from '@/lib/agent-platforms';

export interface Agent {
  id: string;
  name: string;
  command: string;
  args: string[];
  systemPrompt: string;
  isCustom?: boolean;
  isDiscovered?: boolean;
  platform?: AgentPlatform;
  inputTemplate?: string;
  version?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version?: string;
  source?: string;
  path?: string;
  command?: string; // only for custom skills
}

interface DetectedAgent {
  name: string;
  command: string;
  version: string;
  platform: string;
}

interface ScannedSkill {
  name: string;
  description: string;
  version: string;
  source: string;
  path: string;
}

interface AgentOverride {
  args?: string[];
  systemPrompt?: string;
  inputTemplate?: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const STORE_KEY = 'config.json';

function mapDetectedToAgent(d: DetectedAgent): Agent {
  const platform = (d.platform as AgentPlatform) || detectPlatform(d.command);
  return {
    id: generateId(),
    name: d.name,
    command: d.command,
    args: PLATFORMS[platform]?.defaultArgs ?? [],
    systemPrompt: '',
    isDiscovered: true,
    platform,
    inputTemplate: PLATFORMS[platform]?.inputTemplate ?? '{{input}}',
    version: d.version,
  };
}

function mapScannedToSkill(s: ScannedSkill): Skill {
  return {
    id: generateId(),
    name: s.name,
    description: s.description,
    version: s.version,
    source: s.source,
    path: s.path,
  };
}

export function useAgentStore() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [ready, setReady] = useState(false);

  // Load detected agents + overrides on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const store = await Store.load(STORE_KEY, { defaults: {}, autoSave: true });

        // 1. Detect installed CLI agents
        const detected = (await invoke<DetectedAgent[]>('detect_agents')) ?? [];
        let mergedAgents = detected.map(mapDetectedToAgent);

        // 2. Load custom agents
        const customAgents = (await store.get<Agent[]>('customAgents')) ?? [];
        mergedAgents = [...mergedAgents, ...customAgents];

        // 3. Apply overrides
        const overrides = (await store.get<Record<string, AgentOverride>>('agentOverrides')) ?? {};
        mergedAgents = mergedAgents.map((agent) => {
          const ov = overrides[agent.command];
          if (!ov) return agent;
          return {
            ...agent,
            args: ov.args ?? agent.args,
            systemPrompt: ov.systemPrompt ?? agent.systemPrompt,
            inputTemplate: ov.inputTemplate ?? agent.inputTemplate,
          };
        });

        // 4. Load custom skills (backward compat)
        const customSkills = (await store.get<Skill[]>('customSkills')) ?? [];

        if (!cancelled) {
          setAgents(mergedAgents);
          setSkills(customSkills);
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const refreshSkills = useCallback(async (cwd: string) => {
    try {
      const scanned = (await invoke<ScannedSkill[]>('scan_skills', { cwd })) ?? [];
      const store = await Store.load(STORE_KEY, { defaults: {}, autoSave: true });
      const customSkills = (await store.get<Skill[]>('customSkills')) ?? [];
      setSkills([...scanned.map(mapScannedToSkill), ...customSkills]);
    } catch {
      // ignore
    }
  }, []);

  const saveAgentOverrides = useCallback(async (agentCommand: string, overrides: AgentOverride) => {
    const store = await Store.load(STORE_KEY, { defaults: {}, autoSave: true });
    const existing = (await store.get<Record<string, AgentOverride>>('agentOverrides')) ?? {};
    existing[agentCommand] = { ...existing[agentCommand], ...overrides };
    await store.set('agentOverrides', existing);

    setAgents((prev) =>
      prev.map((a) =>
        a.command === agentCommand
          ? {
              ...a,
              args: overrides.args ?? a.args,
              systemPrompt: overrides.systemPrompt ?? a.systemPrompt,
              inputTemplate: overrides.inputTemplate ?? a.inputTemplate,
            }
          : a
      )
    );
  }, []);

  const saveCustomAgents = useCallback(async (next: Agent[]) => {
    const custom = next.filter((a) => a.isCustom);
    const store = await Store.load(STORE_KEY, { defaults: {}, autoSave: true });
    await store.set('customAgents', custom);
    setAgents((prev) => {
      const discovered = prev.filter((a) => a.isDiscovered);
      return [...discovered, ...custom];
    });
  }, []);

  const saveCustomSkills = useCallback(async (next: Skill[]) => {
    const store = await Store.load(STORE_KEY, { defaults: {}, autoSave: true });
    await store.set('customSkills', next);
    setSkills((prev) => {
      const scanned = prev.filter((s) => s.source);
      return [...scanned, ...next];
    });
  }, []);

  return {
    agents,
    skills,
    ready,
    refreshSkills,
    saveAgentOverrides,
    saveCustomAgents,
    saveCustomSkills,
  };
}
