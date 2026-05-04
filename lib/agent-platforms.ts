/**
 * Agent Platform Behaviors
 *
 * Maestro wraps existing AI CLI tools (Claude Code, Kimi Code, Aider, etc).
 * Each platform has different invocation patterns, default commands, and
 * input formatting rules. This module centralizes those behaviors.
 */

export type AgentPlatform =
  | 'generic'
  | 'claude-code'
  | 'kimi-code'
  | 'aider'
  | 'openai-cli'
  | 'custom';

export interface PlatformConfig {
  id: AgentPlatform;
  name: string;
  description: string;
  iconColor: string;
  defaultCommand: string;
  defaultArgs: string[];
  inputTemplate: string;
  /** Whether the platform needs an explicit newline/enter after input */
  needsEnterKey: boolean;
  /** Whether the platform supports multi-turn chat via stdin */
  supportsInteractive: boolean;
  /** Mode-specific prefix mappings (if any) */
  modePrefixes?: Partial<Record<'Plan' | 'Edit' | 'Chat', string>>;
}

export const PLATFORMS: Record<AgentPlatform, PlatformConfig> = {
  generic: {
    id: 'generic',
    name: 'Generic',
    description: 'Any CLI tool that accepts raw stdin input.',
    iconColor: '#A3E635',
    defaultCommand: '',
    defaultArgs: [],
    inputTemplate: '{{input}}',
    needsEnterKey: true,
    supportsInteractive: true,
  },

  'claude-code': {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Anthropic Claude Code CLI (claude).',
    iconColor: '#D97757',
    defaultCommand: 'claude',
    defaultArgs: [],
    inputTemplate: '{{input}}',
    needsEnterKey: true,
    supportsInteractive: true,
  },

  'kimi-code': {
    id: 'kimi-code',
    name: 'Kimi Code',
    description: 'Kimi Code CLI (kimi).',
    iconColor: '#3B82F6',
    defaultCommand: 'kimi',
    defaultArgs: [],
    inputTemplate: '{{input}}',
    needsEnterKey: true,
    supportsInteractive: true,
  },

  aider: {
    id: 'aider',
    name: 'Aider',
    description: 'Aider coding assistant (aider).',
    iconColor: '#10B981',
    defaultCommand: 'aider',
    defaultArgs: ['--no-auto-commits'],
    inputTemplate: '{{input}}',
    needsEnterKey: true,
    supportsInteractive: true,
    modePrefixes: {
      Plan: '/ask ',
      Edit: '/code ',
      Chat: '/ask ',
    },
  },

  'openai-cli': {
    id: 'openai-cli',
    name: 'OpenAI CLI',
    description: 'OpenAI CLI or compatible (e.g., o1, gpt-4).',
    iconColor: '#10A37F',
    defaultCommand: 'openai',
    defaultArgs: [],
    inputTemplate: '{{input}}',
    needsEnterKey: true,
    supportsInteractive: false,
  },

  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Fully custom command and input template.',
    iconColor: '#FAFAFA',
    defaultCommand: '',
    defaultArgs: [],
    inputTemplate: '{{input}}',
    needsEnterKey: true,
    supportsInteractive: true,
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

/**
 * Format user input according to the agent's platform configuration.
 *
 * @param platform   The platform ID
 * @param template   Optional custom template (overrides platform default)
 * @param input      Raw user input
 * @param mode       Current agent mode (Plan | Edit | Chat)
 * @returns          Formatted input ready to send via stdin
 */
export function formatAgentInput(
  platform: AgentPlatform,
  template: string | undefined,
  input: string,
  mode?: 'Plan' | 'Edit' | 'Chat'
): string {
  const config = PLATFORMS[platform] ?? PLATFORMS.generic;
  let tmpl = template?.trim() || config.inputTemplate;

  // Apply mode-specific prefix if defined by the platform
  let body = input;
  if (mode && config.modePrefixes?.[mode]) {
    // Only prepend prefix if input doesn't already start with it
    const prefix = config.modePrefixes[mode]!;
    if (!body.startsWith(prefix.trim())) {
      body = prefix + body;
    }
  }

  // Replace template variable
  let formatted = tmpl.replace(/\{\{\s*input\s*\}\}/g, body);

  // If template didn't contain {{input}}, append body after template
  if (!tmpl.includes('{{input}}') && !tmpl.includes('{{ input }}')) {
    formatted = formatted + body;
  }

  return formatted;
}

/**
 * Get default command + args for a platform.
 */
export function getPlatformDefaults(
  platform: AgentPlatform
): { command: string; args: string[] } {
  const config = PLATFORMS[platform] ?? PLATFORMS.generic;
  return {
    command: config.defaultCommand,
    args: [...config.defaultArgs],
  };
}

/**
 * Detect platform from command string (best-effort).
 */
export function detectPlatform(command: string): AgentPlatform {
  const lower = command.toLowerCase().trim();
  if (lower === 'claude') return 'claude-code';
  if (lower === 'kimi') return 'kimi-code';
  if (lower === 'aider') return 'aider';
  if (lower === 'openai') return 'openai-cli';
  return 'generic';
}
