<div align="center">

  <!-- Animated Typing Header -->
  <a href="https://git.io/typing-svg">
    <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=32&duration=3000&pause=1000&color=00D4AA&center=true&vCenter=true&width=700&lines=Maestro+%F0%9F%8E%BC;AI+Agent+CLI+Wrapper;Code+Review+Dashboard;Built+with+Tauri+%2B+Next.js+%F0%9F%9A%80" alt="Typing SVG" />
  </a>

  <!-- Banner -->
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:00D4AA,100:0891B2&height=180&section=header&text=Maestro&fontSize=50&fontColor=ffffff&animation=fadeIn&fontAlignY=35" width="100%" />

  <!-- Badges -->
  <img src="https://img.shields.io/badge/Tauri-24C8D8?style=for-the-badge&logo=tauri&logoColor=white" />
  <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />

  <br/><br/>

  <img src="https://img.shields.io/badge/version-0.1.0-00D4AA?style=for-the-badge" />
  <img src="https://img.shields.io/badge/license-MIT-00D4AA?style=for-the-badge" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-00D4AA?style=for-the-badge" />

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Building](#-building)
- [Environment Variables](#-environment-variables)
- [Tech Stack](#-tech-stack)
- [Troubleshooting](#-troubleshooting)
- [Screenshots](#-screenshots)

---

## 🎯 Overview

**Maestro** is a powerful developer dashboard that wraps an AI Agent CLI with a modern desktop interface. It provides real-time terminal output, visibility into the AI's thought process, and side-by-side code diffs — all within a blazing-fast native app built with **Tauri** and **Next.js**.

> 💡 Think of it as your intelligent coding companion with a slick GUI — talk to your AI agent, review code changes, and manage projects without leaving the app.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Agent Integration** | Connects to Google Gemini API for intelligent code assistance |
| 🖥️ **Embedded Terminal** | Full PTY terminal powered by Rust (`portable-pty`) with ANSI color support |
| 🧠 **Thought Process View** | See the AI's reasoning and planning steps in real-time |
| 📝 **Code Editor** | Monaco Editor + CodeMirror with Markdown support and VS Code themes |
| 🔄 **Side-by-Side Diffs** | Review code changes with intuitive before/after comparison |
| 📂 **File System Access** | Native file operations via Tauri FS & Dialog plugins |
| ⚡ **Lightning Fast** | Rust-powered backend with <100ms startup time |
| 🎨 **Modern UI** | Beautiful, responsive interface built with Tailwind CSS v4 + Motion animations |
| 💾 **Persistent Settings** | App preferences stored locally via Tauri Store plugin |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Maestro                         │
│                   (Desktop Application)                     │
├──────────────────────────────┬──────────────────────────────┤
│      Frontend (Next.js)      │      Backend (Tauri/Rust)    │
│  ┌────────────────────────┐  │  ┌────────────────────────┐  │
│  │  React 19 + TypeScript │  │  │  Tauri v2 Runtime      │  │
│  │  Tailwind CSS v4       │  │  │  Tokio Async Runtime   │  │
│  │  Motion Animations     │  │  │  portable-pty          │  │
│  │  Monaco / CodeMirror   │  │  │  ├─ Terminal Emulation │  │
│  │  Lucide Icons          │  │  │  ├─ FS Operations      │  │
│  │  React Hook Form       │  │  │  ├─ Dialog Handling    │  │
│  └────────────────────────┘  │  │  └─ Store / Config     │  │
│                              │  └────────────────────────┘  │
│         WebView (WebKit)     │         Native OS APIs       │
└──────────────────────────────┴──────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Google Gemini  │
                    │     API         │
                    └─────────────────┘
```

---

## 📁 Project Structure

```
ai-studio-applet/
├── 📂 app/                      # Next.js App Router
│   ├── globals.css              # Global styles (Tailwind)
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
│
├── 📂 components/               # React components
│   ├── AgentConsoleInput.tsx    # AI agent input console
│   ├── AgentManager.tsx         # Agent management UI
│   ├── CodeEditor.tsx           # Monaco/CodeMirror editor
│   ├── LeftSidebar.tsx          # Sidebar navigation
│   ├── SettingsModal.tsx        # App settings
│   ├── WelcomeScreen.tsx        # Onboarding screen
│   └── WorkspaceFooter.tsx      # Status bar / footer
│
├── 📂 contexts/                 # React contexts
│   └── WorkspaceContext.tsx     # Global workspace state
│
├── 📂 hooks/                    # Custom React hooks
│   ├── use-mobile.ts            # Mobile detection
│   ├── useAgentProcess.ts       # Agent process management
│   ├── useAgentStore.ts         # Agent state (Zustand-style)
│   └── useFileSystem.ts         # File system operations
│
├── 📂 lib/                      # Utilities
│   ├── ansi.ts                  # ANSI color parser
│   └── utils.ts                 # Helper functions
│
├── 📂 src-tauri/                # 🔥 Rust backend (Tauri)
│   ├── src/                     # Rust source code
│   ├── capabilities/            # Tauri capability configs
│   ├── icons/                   # App icons
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
│
├── 📄 next.config.ts            # Next.js configuration
├── 📄 package.json              # Node dependencies
├── 📄 tsconfig.json             # TypeScript config
└── 📄 .env.example              # Environment variables template
```

---

## 🚀 Getting Started

### Prerequisites

Before running this project, make sure you have the following installed:

| Requirement | Version | Download |
|-------------|---------|----------|
| **Node.js** | `>= 20.0.0` | [nodejs.org](https://nodejs.org/) |
| **npm** | `>= 10.0.0` | Bundled with Node.js |
| **Rust** | `>= 1.70.0` | [rustup.rs](https://rustup.rs/) |
| **Tauri CLI** | Latest | Already in `devDependencies` (auto-installed via `npm install`) |

> ⚠️ **Windows Users**: You also need [Microsoft Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload.

### 1. Clone the Repository

```bash
git clone https://github.com/pdong15dth/maestro.git
cd maestro
```

### ⚡ Quick Setup (Windows)

If you're on Windows, just run the automated setup script:

```powershell
.\setup.ps1
```

This script will check all prerequisites, install dependencies, and create your `.env` file automatically.

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Rust dependencies will be installed automatically by Cargo
```

> 💡 **Pro Tip**: Install [`just`](https://github.com/casey/just) to use the project's task runner:
> ```bash
> cargo install just
> just --list    # See all available tasks
> ```

### 3. Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your API keys
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Your Google Gemini API key |
| `APP_URL` | ⚠️ Optional | App hosting URL (auto-injected in AI Studio) |

> 🔑 Get your Gemini API key at: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

---

## 💻 Development

### Run Web-only (Next.js Dev Server)

Use this for quick frontend development without the Rust backend:

```bash
npm run dev
```

- Opens at: `http://localhost:3000`
- Hot reload enabled
- ⚠️ Tauri APIs won't work in browser mode

### Run Full Desktop App (Tauri Dev Mode)

This starts both the Next.js dev server and the Tauri desktop window:

```bash
npm run tauri dev
```

- Desktop window opens automatically
- Rust backend hot-reloads on code changes
- Frontend HMR enabled (unless `DISABLE_HMR=true`)

### Available Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Build static export for Tauri
npm run start        # Start production Next.js server
npm run lint         # Run ESLint
npm run clean        # Clean Next.js cache
npm run tauri dev    # 🖥️ Start Tauri in development mode
npm run tauri build  # 📦 Build desktop app for production
```

---

## 📦 Building

### Build for Production

To create a standalone desktop application:

```bash
npm run tauri build
```

This will:
1. Build the Next.js frontend (`next build` → `dist/`)
2. Compile the Rust backend in release mode
3. Bundle everything into a native executable

### Output Locations

| Platform | Output Path |
|----------|-------------|
| Windows | `src-tauri/target/release/ai-studio-applet.exe` |
| macOS | `src-tauri/target/release/bundle/macos/*.app` |
| Linux | `src-tauri/target/release/bundle/appimage/*.AppImage` |

> 📝 The `next.config.ts` is already configured with `output: 'export'` and `distDir: 'dist'` for Tauri integration.

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# Required for Gemini AI integration
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: App URL for callbacks
APP_URL=http://localhost:3000
```

> 🔒 **Never commit your `.env` file!** It's already added to `.gitignore`.

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| [Next.js 15](https://nextjs.org/) | React framework with App Router |
| [React 19](https://react.dev/) | UI library |
| [TypeScript 5.9](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first styling |
| [Motion](https://motion.dev/) | Animations & transitions |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | Code editing |
| [CodeMirror 6](https://codemirror.net/) | Markdown editing |
| [Lucide React](https://lucide.dev/) | Icon library |
| [React Hook Form](https://react-hook-form.com/) | Form management |

### Backend (Rust)

| Technology | Purpose |
|------------|---------|
| [Tauri v2](https://tauri.app/) | Desktop app framework |
| [Tokio](https://tokio.rs/) | Async runtime |
| [portable-pty](https://github.com/wez/wezterm/tree/main/portable-pty) | Terminal emulation |
| [Serde](https://serde.rs/) | Serialization |

### APIs & Services

| Service | Purpose |
|---------|---------|
| [Google Gemini API](https://ai.google.dev/) | AI agent intelligence |

---

## 🛠️ Troubleshooting

### Common Issues

#### 1. `npm run tauri dev` fails on Windows

**Error**: `error: linker link.exe not found` or MSVC-related errors

**Fix**: Install Visual Studio Build Tools with "Desktop development with C++" workload:
```powershell
# Or download from:
# https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

#### 2. `cargo` command not found

**Fix**: Install Rust via rustup:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Windows: download from https://rustup.rs/
```

Restart your terminal after installation.

#### 3. Port 3000 is already in use

**Fix**: Kill the process using port 3000, or change the dev URL in `src-tauri/tauri.conf.json`:
```json
"devUrl": "http://localhost:3001"
```

#### 4. Tauri APIs not working in browser

**Error**: `window.__TAURI__ is undefined`

**Fix**: Tauri APIs only work inside the Tauri desktop window. Run `npm run tauri dev` instead of `npm run dev`.

#### 5. Build fails with "dist folder not found"

**Fix**: Make sure `next.config.ts` has:
```ts
output: 'export',
distDir: 'dist',
```
Then run `npm run build` before `npm run tauri build`.

#### 6. HMR causing flickering during agent edits

**Fix**: The project has built-in HMR disabling via `DISABLE_HMR=true`:
```bash
# Windows PowerShell
$env:DISABLE_HMR="true"
npm run dev

# Or permanently set in your environment variables
```

#### 7. `forbidden path` error when loading workspace

**Error**: `forbidden path: .../.dart_tool, maybe it is not allowed on the scope for allow-read-dir`

**Fix**: Tauri v2 requires filesystem scopes in the capability file. Make sure `src-tauri/capabilities/default.json` includes the path scope for your workspace:
```json
{
  "identifier": "fs:allow-read-dir",
  "allow": [{"path": "**"}]
}
```

#### 8. Rust compilation is very slow

**Fix**: Enable Cargo incremental compilation and use `tauri dev` instead of `tauri build` during development.

---

## 📸 Screenshots

> 🖼️ *Screenshots will be added here soon...*

<!-- 
<div align="center">
  <img src="./screenshots/dashboard.png" alt="Dashboard" width="80%" />
  <br/>
  <img src="./screenshots/terminal.png" alt="Terminal" width="80%" />
</div>
-->

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License**.

---

<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0891B2,100:00D4AA&height=120&section=footer&text=Happy%20Coding!%20%F0%9F%9A%80&fontSize=30&fontColor=ffffff&animation=fadeIn" width="100%" />

  <br/>

  <sub>Built with ❤️ by <a href="https://github.com/pdong15dth">@pdong15dth</a></sub>

</div>
