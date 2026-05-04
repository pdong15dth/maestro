# Maestro — AI Agent CLI Wrapper and Code Review Dashboard

> This file is intended for AI coding agents. It describes the project architecture, build process, conventions, and important implementation details.

---

## Project Overview

Maestro is a cross-platform desktop application that wraps an AI Agent CLI with a modern GUI. It provides:

- Real-time terminal output from AI agents via a PTY (pseudo-terminal)
- Visibility into the AI's thought process in a dedicated Agent Console
- Side-by-side code diffs and file editing
- File system navigation and management
- Interactive shell sessions

The app is built with **Tauri v2** (Rust backend) and **Next.js 15** (React 19 frontend), bundled as a native desktop application.

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.4.9 | React framework with App Router |
| React | 19.2.1 | UI library |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 4.1.11 | Utility-first styling |
| Motion | 12.23.24 | Animations and transitions |
| Monaco Editor | 4.7.0 | Code editing (via `@monaco-editor/react`) |
| CodeMirror 6 | 4.25.9 | Markdown editing support |
| Lucide React | 0.553.0 | Icon library |
| `@google/genai` | 1.17.0 | Google Gemini API integration |

### Backend (Rust)

| Technology | Version | Purpose |
|------------|---------|---------|
| Tauri | 2.11.0 | Desktop app framework |
| Tokio | 1.52.1 | Async runtime |
| portable-pty | 0.9.0 | Terminal emulation |
| Serde | 1.x | Serialization |

### Build Tooling

- **npm** — Node package management
- **Cargo** — Rust package management
- **just** — Task runner (defined in `justfile`)
- **ESLint** — Linting with `eslint-config-next`
- **PostCSS** — CSS processing with `@tailwindcss/postcss` and `autoprefixer`

---

## Project Structure

```
maestro/
├── app/                          # Next.js App Router
│   ├── globals.css               # Global styles, Tailwind import, ANSI colors, keyframes
│   ├── layout.tsx                # Root layout with fonts (Inter, JetBrains Mono), dark theme
│   └── page.tsx                  # Main workspace page (resizable 3-pane layout)
│
├── components/                   # React components
│   ├── AgentConsoleInput.tsx     # Agent input textarea with markdown toolbar
│   ├── AgentManager.tsx          # Agent/skill configuration UI
│   ├── CodeEditor.tsx            # Monaco Editor wrapper with Ctrl+S save
│   ├── FileViewer.tsx            # File preview router (image, SVG split, text, binary)
│   ├── LeftSidebar.tsx           # File explorer + agent list with context menu actions
│   ├── NomoFileIcon.tsx          # File icon component using Nomo Dark theme
│   ├── SettingsModal.tsx         # Settings modal (health check, general, API keys)
│   ├── WelcomeScreen.tsx         # Onboarding screen with workspace selection
│   └── WorkspaceFooter.tsx       # Bottom panel (terminal, logs, problems) + status bar
│
├── contexts/
│   └── WorkspaceContext.tsx      # Global workspace state: tabs, files, agents, messages
│
├── hooks/
│   ├── use-mobile.ts             # Mobile breakpoint detection hook
│   ├── useAgentProcess.ts        # PTY process lifecycle via Tauri events
│   ├── useAgentStore.ts          # Agent/skill persistence via Tauri Store plugin
│   └── useFileSystem.ts          # File tree traversal and file operations via Tauri FS plugin
│
├── lib/
│   ├── ansi.ts                   # ANSI-to-HTML converter (uses `anser`)
│   ├── nomo-icons.ts             # Nomo Dark icon theme mapping (auto-generated)
│   └── utils.ts                  # `cn()` utility, language/extension maps for Monaco
│
├── public/
│   ├── icons/nomo-dark/          # Nomo Dark file type SVG icons
│   ├── logo/                     # App logo assets
│   └── splash.html               # Splash screen for Tauri window
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri command handlers and app setup
│   │   └── pty.rs                # PTY session manager (spawn, stdin, kill, list)
│   ├── capabilities/
│   │   └── default.json          # Tauri v2 capability configuration (broad FS permissions)
│   ├── icons/                    # App bundle icons
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri app configuration
│
├── next.config.ts                # Next.js config (static export, distDir: 'dist')
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Node dependencies and scripts
├── justfile                      # Task runner recipes (PowerShell syntax)
├── eslint.config.mjs             # ESLint flat config
├── postcss.config.mjs            # PostCSS with Tailwind v4
└── .env.example                  # Environment variable template
```

---

## Build and Development Commands

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Rust >= 1.70.0
- On Windows: Microsoft Visual C++ Build Tools with "Desktop development with C++" workload

### Setup

```bash
npm install
```

Copy environment variables:

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Development

```bash
# Web-only frontend (no Tauri APIs)
npm run dev

# Full desktop app with Tauri backend
npm run tauri dev
```

The `justfile` provides additional tasks (requires `just`):

```bash
just dev          # Next.js dev server
just tauri        # Full Tauri dev mode
just dev-no-hmr   # Dev with HMR disabled (useful for AI agent editing)
just build-web    # Static export
just build        # Production desktop build
just lint         # ESLint
just typecheck    # TypeScript check
just clean        # Clean build artifacts
```

### Production Build

```bash
npm run tauri build
```

This:
1. Builds Next.js static export (`next build` → `dist/`)
2. Compiles Rust backend in release mode
3. Bundles into a native executable

Output paths:
- Windows: `src-tauri/target/release/ai-studio-applet.exe`
- macOS: `src-tauri/target/release/bundle/macos/*.app`
- Linux: `src-tauri/target/release/bundle/appimage/*.AppImage`

---

## Key Configuration Details

### Next.js (`next.config.ts`)

- `output: 'export'` — Required for Tauri (static site generation)
- `distDir: 'dist'` — Tauri expects frontend assets here
- `images.unoptimized: true` — Required for static export
- `transpilePackages: ['motion']` — Motion library transpilation
- HMR can be disabled via `DISABLE_HMR=true` env var (sets webpack `watchOptions.ignored: /.*/`)

### Tauri (`src-tauri/tauri.conf.json`)

- Product name: "Maestro"
- Identifier: `com.maestro.ai-studio`
- Dev URL: `http://localhost:3000`
- Frontend dist: `../dist`
- Main window: 1400x900, initially hidden (splashscreen shows first)
- Splash window: 480x340, transparent, always on top, auto-closes after ~3.2s
- CSP is currently disabled (`csp: null`)

### TypeScript (`tsconfig.json`)

- Target: ES2017
- Strict mode enabled
- Path alias: `@/*` maps to `./*`
- Module resolution: `bundler`

---

## Architecture

### Frontend-Backend Communication

The frontend and backend communicate via **Tauri invoke commands** and **events**:

**Commands (frontend → backend):**
- `spawn_agent` — Start an AI agent process in a PTY
- `send_stdin` — Send input to a running process
- `kill_agent` / `kill_all_agents` — Terminate processes
- `spawn_shell` — Start an interactive shell
- `check_cli` — Verify a CLI tool is installed
- `exec_command` — Execute a command and capture output
- `git_branch` — Get current git branch
- `get_language_for_file` — Detect programming language from file extension
- `check_problems` — Run `cargo check` or `eslint` and parse errors

**Events (backend → frontend):**
- `agent-output` — PTY output chunk (`{ session_id, chunk }`)
- `session-exited` — Process termination notification (`{ session_id }`)
- `close-splash` — Signal to close splashscreen

### State Management

- **`WorkspaceContext`** — Global React context providing:
  - Current workspace path and recent workspaces
  - Tab management (open, close, active, dirty state)
  - File system operations (delegated to `useFileSystem`)
  - Agent/skills state (delegated to `useAgentStore`)
  - Agent chat messages

- **`useAgentStore`** — Persists agent and skill configurations via Tauri Store plugin (`config.json`)

- **`useFileSystem`** — Wraps Tauri FS plugin for file tree traversal, read, write, create, delete, rename

- **`useAgentProcess`** — Manages PTY process lifecycle, listens to Tauri events, tracks `isRunning` state

### PTY System (`src-tauri/src/pty.rs`)

The `PtyManager` maintains a `HashMap<String, PtySession>` of active sessions:
- Each session has a writer (for stdin) and a child process handle
- A dedicated OS thread reads from the PTY master and forwards chunks via a Tokio channel
- A Tokio task emits Tauri events to the frontend
- `send_stdin` appends `\r` to each input line

### File Tree (`useFileSystem.ts`)

- Recursively reads directories up to `DEFAULT_MAX_DEPTH = 4`
- Skips common non-source directories (`node_modules`, `.git`, `target`, `dist`, etc. — see `SKIP_DIRS`)
- Skips hidden files unless in `allowedHidden` list
- Sorts: directories first, then files, both alphabetically

---

## Code Style Guidelines

### UI Conventions

The app uses a **dark, terminal-inspired aesthetic** with specific color constants:

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#09090B` | App background, panels |
| Text | `#FAFAFA` | Primary text |
| Accent | `#A3E635` | Primary accent (lime green), status indicators, CTAs |
| Border | `#27272A` | Borders, dividers |
| Hover bg | `#161618` | Hover states |
| Panel bg | `#111113` | Elevated panels, modals |
| Status bar | `#0c0c0d` | Terminal/console areas |

**Typography:**
- Sans-serif: Inter (`--font-sans`)
- Monospace: JetBrains Mono (`--font-mono`)
- Most UI uses `font-mono` for the terminal aesthetic

**Button Patterns:**
- Primary CTA: `bg-[#A3E635] text-black border-2 border-black` with `box-shadow: 3px 3px 0px #000000`
- Hover: translate `-0.5px` on both axes, increase shadow
- Active: reset translation, reduce shadow
- Brutalist/neobrutalist style throughout

### Component Patterns

- Use `'use client'` for interactive components
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Prefer `useCallback` for event handlers passed to child components
- Use `useEffect` with cancellation flags (`let cancelled = false`) for async operations
- Common error pattern: `.catch(() => {})` for silent failure (especially Tauri API calls)

### File Handling

- `FileViewer` determines how to display a file based on its type:
  - Images → `<ImagePreview>` with base64 encoding
  - SVG → Split view: CodeMirror (left) + ImagePreview (right)
  - Binary → "Binary file — preview not available"
  - Text → `<CodeEditor>` (Monaco)
- `CodeEditor` auto-detects language from path via `getLanguageFromPath()`
- Save shortcut: `Ctrl+S` / `Cmd+S` wired to `writeFile`

---

## Testing Instructions

**There is currently no test framework configured in this project.**

If adding tests:
- For frontend: consider Vitest + React Testing Library
- For Rust backend: use `cargo test` with standard Rust testing
- No existing test files or test scripts are present

---

## Security Considerations

1. **Broad Filesystem Permissions:** `src-tauri/capabilities/default.json` grants read/write/remove/rename/mkdir permissions for `$HOME/**` and `**` (all paths). This is necessary for the IDE functionality but means the app has extensive filesystem access.

2. **No CSP:** `csp: null` in `tauri.conf.json` means Content Security Policy is not enforced.

3. **API Key Storage:** API keys (OpenAI, Anthropic, Gemini) are stored locally via Tauri Store plugin in `keys.json`. They are not encrypted at rest.

4. **Environment Variables:** `.env` contains `GEMINI_API_KEY`. It is listed in `.gitignore` and must never be committed.

5. **Process Execution:** The app spawns arbitrary CLI processes based on user-configured agent commands. This is by design (the app wraps CLIs) but means users should only configure trusted agents.

---

## Important Implementation Notes

### HMR Disabling for AI Agents

The `next.config.ts` has special handling for `DISABLE_HMR=true`:

```typescript
if (dev && process.env.DISABLE_HMR === 'true') {
  config.watchOptions = { ignored: /.*/ };
}
```

This prevents Next.js from reloading when files are edited by an external AI agent, avoiding UI flickering.

### Splash Screen Logic

In `main.rs`, the setup handler:
1. Shows the splashscreen window
2. Sleeps 2800ms
3. Emits `close-splash` event
4. Sleeps 400ms
5. Shows the main window
6. Closes the splashscreen

The splashscreen HTML is `public/splash.html`.

### Agent Modes

The agent console supports three modes that prepend instructions on first user message:
- **Plan:** "You are in PLAN mode. Do not write code. Only describe the approach."
- **Edit:** "You are in EDIT mode. You may read and modify files."
- **Chat:** "You are in CHAT mode. Answer questions only."

### Problem Detection

`check_problems` in `main.rs`:
- For Rust projects (has `Cargo.toml`): runs `cargo check --message-format=short` and parses stderr
- For Node projects (has `package.json`): runs `npx eslint . --format compact` and parses stdout
- Returns a list of `{ file, line, message, severity }` objects

### Monaco Language Detection

`lib/utils.ts` contains extensive `EXTENSION_MAP` (1000+ lines) mapping file extensions to Monaco language IDs. This is one of the largest files in the project.

---

## Common Issues and Fixes

1. **`npm run tauri dev` fails on Windows** — Install Visual Studio Build Tools with "Desktop development with C++"
2. **Tauri APIs not working in browser** — Tauri APIs only work inside the Tauri window; use `npm run tauri dev`
3. **"dist folder not found" during build** — Ensure `output: 'export'` and `distDir: 'dist'` are in `next.config.ts`
4. **`forbidden path` error** — Ensure `src-tauri/capabilities/default.json` includes the required path scopes
5. **HMR flickering during agent edits** — Set `DISABLE_HMR=true` when running the dev server
