# Master Phased Delivery Blueprint — FloatCompanion

**Document Version:** 1.0.0  
**Status:** Ready for Execution  
**Scope:** Exhaustive Phase-by-Phase Implementation, File Manifests, Step-by-Step Code Tasks & Exit Criteria  

---

## 🗺️ Master Phase Overview

```
Phase 0: Scaffolding, Tooling & Dependency Configuration
   │
   ▼
Phase 1: Transparent Desktop Shell, Dynamic Geometry & Global Hotkey
   │
   ▼
Phase 2: Floating Orb Physics & Expandable Glassmorphic Tray UI
   │
   ▼
Phase 3: Deterministic Zero-Token FastRouter Engine (<10ms)
   │
   ▼
Phase 4: Multi-Model AI Hub (Groq/Gemini), Streaming & Key Pool Failover
   │
   ▼
Phase 5: Native OS Action Bridge, PowerShell Daemon & Security Kernel
   │
   ▼
Phase 6: Focus Guardian, Active Window Poller & Pomodoro Shield
   │
   ▼
Phase 7: Context Capsule Pruning & Local-First IndexedDB Persistence
   │
   ▼
Phase 8: Production Packaging, NSIS Installer (.exe) & System Hardening
```

---

## 📦 Phase 0: Project Scaffolding & Tooling Setup

### 1. Objective
Establish a clean, modern TypeScript monorepo combining Vite (React 19) and Electron with Tailwind CSS, Lucide icons, and Framer Motion.

### 2. Files to Create
* [`package.json`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/package.json) — Dependencies, scripts, and build metadata.
* [`vite.config.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/vite.config.ts) — Vite config with React plugin and base relative paths.
* [`tsconfig.json`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/tsconfig.json) — Strict TypeScript configuration.
* [`tailwind.config.js`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/tailwind.config.js) — Design tokens, glassmorphic styling, and animation utilities.
* [`postcss.config.js`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/postcss.config.js) — PostCSS plugins.
* [`src/index.css`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/index.css) — Custom glassmorphism, scrollbars, and dark palette.
* [`index.html`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/index.html) — HTML root with transparent body.

### 3. Step-by-Step Tasks
1. Run `npm init -y` and configure `"type": "module"`.
2. Install production dependencies: `react`, `react-dom`, `framer-motion`, `lucide-react`, `zustand`, `idb-keyval`, `clsx`, `tailwind-merge`.
3. Install dev dependencies: `electron`, `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `concurrently`, `wait-on`, `electron-builder`.
4. Configure Tailwind CSS with custom glass background (`rgba(15, 23, 42, 0.75)`), border gradients, and neon accent colors.

### 4. Verification & Exit Criteria
* [x] `npm run dev:vite` successfully launches Vite on port 5173 with zero build errors.
* [x] Hot-Module-Replacement (HMR) operates smoothly.

---

## 🪟 Phase 1: Transparent Desktop Shell & Global Hotkeys

### 1. Objective
Build the Electron main process to render a transparent, frameless, always-on-top window that resizes smoothly and responds to the global summon hotkey (`Ctrl + Shift + Space`).

### 2. Files to Create
* [`electron/main.cjs`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/electron/main.cjs) — Electron lifecycle, BrowserWindow initialization, and window geometry.
* [`electron/preload.cjs`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/electron/preload.cjs) — Secure `contextBridge` exposing `window.electronAPI`.
* [`electron/windowManager.cjs`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/electron/windowManager.cjs) — Smooth transitions between Orb mode (68x68) and Tray mode (420x600).
* [`electron/hotkeyManager.cjs`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/electron/hotkeyManager.cjs) — `globalShortcut` registration and collision handling.

### 3. Step-by-Step Tasks
1. Initialize `BrowserWindow` with:
   * `transparent: true`, `frame: false`, `alwaysOnTop: true`, `skipTaskbar: true`.
   * `hasShadow: false` (to prevent black rectangular shadow artifacts on Windows).
2. Implement IPC channel `window:resize` to change window bounds without visual flickering.
3. Bind `Ctrl + Shift + Space` via `globalShortcut.register`:
   * If window is hidden or collapsed: expand and focus.
   * If window is active: collapse back to Orb or hide.
4. Setup system tray icon with a right-click context menu (Toggle, Settings, Quit).

### 4. Verification & Exit Criteria
* [ ] Electron window opens with 100% background transparency (desktop background visible around the circle).
* [ ] Pressing `Ctrl + Shift + Space` summons and dismisses the window from any third-party app.
* [ ] Resizing does not produce black flicker or visual stuttering.

---

## 🎨 Phase 2: Floating Orb Physics & Expandable Tray UI

### 1. Objective
Create the visual frontend containing the draggable Orb widget and the animated expanding glassmorphic panel using React 19, Framer Motion, and Tailwind CSS.

### 2. Files to Create
* [`src/App.tsx`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/App.tsx) — Main container managing mode state (`orb` vs `tray`).
* [`src/components/FloatingOrb.tsx`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/components/FloatingOrb.tsx) — Circular interactive widget with idle glow, status indicator, and drag handles.
* [`src/components/ExpandedTray.tsx`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/components/ExpandedTray.tsx) — Sliding glass panel with header, content tabs, and prompt input.
* [`src/components/ChatView.tsx`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/components/ChatView.tsx) — Message stream with Markdown, code block copy, and action badges.
* [`src/components/PromptBar.tsx`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/components/PromptBar.tsx) — Auto-resizing textarea, mic button, and submit hotkey handler (`Enter`).
* [`src/store/useAppStore.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/store/useAppStore.ts) — Zustand state store for UI mode, active tab, and message queue.

### 3. Step-by-Step Tasks
1. Build `FloatingOrb`:
   * 68x68 circular glass bubble with subtle neon border.
   * Drag detection: allows moving the Orb anywhere on the desktop edge.
   * Click trigger: fires IPC to resize window to 420x600 and morphs into the tray.
2. Build `ExpandedTray`:
   * Smooth Framer Motion scale & fade entrance animation.
   * Header with status indicator, active model pill, minimize button, and close button.
   * Tab switchers: **Chat**, **Tasks / Sprints**, **System Health**, **Settings**.
3. Implement `Escape` key listener to quickly snap back to compact Orb mode.

### 4. Verification & Exit Criteria
* [ ] Clicking the Orb expands into the Tray in under 200ms with a fluid 60 FPS animation.
* [ ] Pressing `Esc` or clicking the minimize button snaps it back to the small Orb.
* [ ] Chat messages render markdown headings, lists, and formatted code blocks.

---

## ⚡ Phase 3: Deterministic Zero-Token FastRouter Engine

### 1. Objective
Implement the client-side intent interceptor that resolves daily commands (clock, hardware specs, app launches, document creation) in <10ms with zero LLM API calls.

### 2. Files to Create
* [`src/ai/fastRouter.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/ai/fastRouter.ts) — Core router engine matching regex patterns and dispatching actions.
* [`src/ai/intents/clockIntent.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/ai/intents/clockIntent.ts) — Local system time and date formatter.
* [`src/ai/intents/appLaunchIntent.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/ai/intents/appLaunchIntent.ts) — App name alias resolver (`vscode`, `chrome`, `notepad`, `calc`, etc.).
* [`src/ai/intents/systemStatsIntent.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/ai/intents/systemStatsIntent.ts) — RAM and disk space intent mapper.
* [`src/ai/intents/documentIntent.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/ai/intents/documentIntent.ts) — Direct client-side `/note` and `/pdf` exporter.

### 3. Step-by-Step Tasks
1. Write pattern dictionary matching:
   * Time/Date: `/^(what\s+is\s+the\s+)?(time|date|current\s+time|what\s+day)/i`
   * App Launch: `/^(open|launch|start)\s+([a-zA-Z0-9\s_-]+)$/i`
   * System RAM: `/^(how\s+much\s+)?(ram|memory)(\s+is\s+free|\s+in\s+use)?$/i`
   * Disk Space: `/^(how\s+much\s+)?(disk|storage|hard\s+drive)(\s+space)?/i`
2. Test latency using `performance.now()`.
3. If pattern matches: generate immediate local assistant message bubble and return `{ handled: true }`.
4. If no pattern matches: return `{ handled: false }` to trigger the AI Orchestrator.

### 4. Verification & Exit Criteria
* [ ] Typing `"time"` returns the exact local time in < 8ms with 0 network requests.
* [ ] Typing `"open notepad"` triggers the app launcher and acknowledges in the chat instantly.
* [ ] Complex questions (e.g. *"Explain quantum computing"*) seamlessly fall through to Phase 4.

---

## 🧠 Phase 4: Multi-Model AI Hub & Key Pool Failover

### 1. Objective
Connect Groq, Google Gemini, and local Ollama with streaming tokens, context pruning, and an automatic, zero-delay API key rotation pool.

### 2. Files to Create
* [`src/ai/orchestrator.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/ai/orchestrator.ts) — Provider dispatcher and streaming reader.
* [`src/ai/providers/groqProvider.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/ai/providers/groqProvider.ts) — Groq client (`llama-3.3-70b-versatile`).
* [`src/ai/providers/geminiProvider.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/ai/providers/geminiProvider.ts) — Google Gemini client (`gemini-2.5-flash`).
* [`src/ai/providers/ollamaProvider.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/ai/providers/ollamaProvider.ts) — Offline local Ollama runner.
* [`src/ai/keyPool.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/ai/keyPool.ts) — Key status registry with 0ms rotation on HTTP 429 errors.
* [`src/ai/contextCompressor.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/ai/contextCompressor.ts) — Historical message compressor and token pruner.

### 3. Step-by-Step Tasks
1. Implement streaming API calls using fetch and Server-Sent Events / ReadableStream.
2. In `keyPool.ts`, maintain an array of configured API keys.
3. Catch HTTP status 429 (`rate_limit_exceeded` / `resource_exhausted`):
   * Temporarily flag the key as cooling down.
   * Immediately re-dispatch the payload to the next key without backoff sleep.
4. Implement `compressContext()`: keep System prompt + last 6 full turns + summarize older turns.

### 4. Verification & Exit Criteria
* [ ] Groq streams tokens in under 350ms first-token latency.
* [ ] Inducing a 429 error seamlessly fails over to the backup key without the user noticing.
* [ ] Streaming markdown renders tables and syntax-highlighted code blocks dynamically.

---

## 🛡️ Phase 5: Native OS Action Bridge & Security Kernel

### 1. Objective
Establish safe, non-blocking execution of native OS tasks on Windows (PowerShell) and macOS (POSIX/AppleScript) guarded by a multi-tier de-obfuscation security kernel.

### 2. Files to Create
* [`electron/osActionHandler.cjs`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/electron/osActionHandler.cjs) — Spawned PowerShell daemon with non-blocking stdin.
* [`electron/securityKernel.cjs`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/electron/securityKernel.cjs) — Syntax de-obfuscator and dangerous command blacklist.
* [`electron/appResolver.cjs`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/electron/appResolver.cjs) — Registry / PATH executable lookup for installed apps.
* [`electron/windowFocus.cjs`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/electron/windowFocus.cjs) — Win32 `SetForegroundWindow` API bridge.

### 3. Step-by-Step Tasks
1. Launch a persistent PowerShell stdin session: `spawn('powershell.exe', ['-NoProfile', '-Command', '-'])`.
2. Implement Security Kernel:
   * Strip backticks, quotes, and inline comments (`<# #>`).
   * Decode Base64 arguments.
   * Reject blacklisted commands: `Remove-Item -Recurse`, `Format-Volume`, `del /f /s /q`, `net user`, `Set-ExecutionPolicy`.
3. Implement `os:get-system-stats`:
   * Run `Get-CimInstance Win32_OperatingSystem` to extract exact Total/Free RAM.
   * Run `Get-CimInstance Win32_LogicalDisk` for drive free space.
4. Implement `os:type-text`:
   * Sends text to the active window behind the Orb via clipboard paste simulation.

### 4. Verification & Exit Criteria
* [ ] Executing `"how much RAM is left"` returns real numbers matching Windows Task Manager.
* [ ] Attempting to run a blacklisted command like `rmdir /s /q` is rejected with an explicit security alert.
* [ ] Launching an already running app brings its existing window to the foreground.

---

## 🎯 Phase 6: Focus Guardian & Pomodoro Attention Shield

### 1. Objective
Build an active focus enforcement daemon that polls the foreground window title every 3 seconds, alerts on distraction sites, and manages Pomodoro sprints.

### 2. Files to Create
* [`electron/focusPoller.cjs`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/electron/focusPoller.cjs) — Background active window title polling loop.
* [`src/components/FocusModeView.tsx`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/components/FocusModeView.tsx) — Pomodoro timer countdown ring and sprint controls.
* [`src/components/DistractionBanner.tsx`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/components/DistractionBanner.tsx) — Alert banner with red pulsating glow.
* [`src/services/soundEffects.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/services/soundEffects.ts) — Web Audio API synthesized chimes for sprint start and distraction warnings.

### 3. Step-by-Step Tasks
1. In `focusPoller.cjs`, use user32.dll `GetForegroundWindow` + `GetWindowTextW` via PowerShell/C# one-liner or native addon.
2. Poll every 3 seconds while focus session is active.
3. Compare active window title against blacklist: `['YouTube', 'Netflix', 'Reddit', 'Twitter', 'Instagram', 'Twitch', 'Facebook', 'TikTok']`.
4. If a match is detected:
   * Send IPC event `focus:distraction-detected` to UI.
   * Shift Orb color palette: Amber ➔ Pulsating High-Contrast Red.
   * Play warning tone and render: *"Return to your sprint: '[Task Title]'"*.

### 4. Verification & Exit Criteria
* [ ] Starting a focus sprint begins the 25-minute countdown.
* [ ] Opening YouTube in Chrome or Edge triggers the red pulse alert within 3 seconds.
* [ ] Returning to VS Code or word processor clears the distraction warning.

---

## 💾 Phase 7: Context Pruning & Local-First Storage

### 1. Objective
Ensure every chat message, task, and focus session is committed locally to IndexedDB before any network operations, maintaining complete privacy.

### 2. Files to Create
* [`src/db/indexedDB.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/db/indexedDB.ts) — `idb-keyval` wrapper with typed stores for `chats`, `sprints`, and `settings`.
* [`src/db/habitTracker.ts`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/db/habitTracker.ts) — Computes daily focus minutes and sprint completion ratios.
* [`src/components/SettingsView.tsx`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/src/components/SettingsView.tsx) — API Key management, custom hotkeys, and "Purge All Data" button.

### 3. Step-by-Step Tasks
1. Initialize IndexedDB stores:
   * `float_chats`: Stores past conversations indexed by session ID.
   * `float_habits`: Stores daily productivity telemetry.
   * `float_settings`: Stores active model preferences and API keys.
2. Build session history viewer in the Chat panel allowing switching between past conversations.
3. Implement one-click "Purge All Data" that completely clears IndexedDB tables.

### 4. Verification & Exit Criteria
* [ ] Closing and reopening the application restores all previous messages and tasks.
* [ ] Settings page allows saving Groq / Gemini API keys directly into local storage.
* [ ] Clicking "Purge Data" wipes all records instantly with user confirmation.

---

## 🚀 Phase 8: Production Packaging & Standalone Installer

### 1. Objective
Package the entire application into a standalone Windows NSIS installer (`.exe`) that installs cleanly without requiring Node.js or Git on the target machine.

### 2. Files to Create / Configure
* [`electron-builder.json`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/electron-builder.json) — Packaging configuration (NSIS, icons, file associations, auto-update).
* [`scripts/build-win.mjs`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/scripts/build-win.mjs) — Bundling and packaging pipeline script.
* [`build/icon.ico`](file:///C:/Users/lohit/OneDrive/Desktop/float-companion/build/icon.ico) — Application icon for Windows taskbar and installer.

### 3. Step-by-Step Tasks
1. Run `npm run build` to compile TypeScript and produce Vite production assets in `dist/`.
2. Configure `electron-builder`:
   * Target: Windows `nsis` (x64).
   * Settings: one-click installer, allow desktop shortcut, start menu entry.
3. Execute packaging command:
   ```bash
   npm run pack:win
   ```
4. Verify the generated installer in `dist/FloatCompanion-Setup-1.0.0.exe`.

### 4. Verification & Exit Criteria
* [ ] The `.exe` installer installs and launches FloatCompanion on a clean Windows machine.
* [ ] Desktop shortcut launches the floating Orb directly into memory.
* [ ] Uninstaller cleanly removes the application and files from `AppData`.

---

## 📊 Phase Deliverables Summary Table

| Phase | Core Deliverable | Primary File(s) | Exit Verification |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Project Scaffolding | `package.json`, `vite.config.ts`, `tailwind.config.js` | Vite dev server runs at `localhost:5173` |
| **Phase 1** | Transparent Shell & Hotkey | `electron/main.cjs`, `electron/preload.cjs` | Transparent window summons via `Ctrl+Shift+Space` |
| **Phase 2** | Floating Orb & Tray UI | `src/components/FloatingOrb.tsx`, `ExpandedTray.tsx` | Drag physics & 60 FPS expanding tray animation |
| **Phase 3** | Zero-Token FastRouter | `src/ai/fastRouter.ts` | Time, RAM & App launcher respond in <10ms |
| **Phase 4** | Multi-Model AI Hub | `src/ai/orchestrator.ts`, `src/ai/keyPool.ts` | Groq Llama-3.3 streams tokens with 0ms key rotation |
| **Phase 5** | OS Action Bridge & Security | `electron/osActionHandler.cjs`, `securityKernel.cjs` | Win32 RAM inspection & dangerous command blocking |
| **Phase 6** | Focus Guardian | `electron/focusPoller.cjs`, `DistractionBanner.tsx` | Red pulse alert on YouTube/Reddit within 3 seconds |
| **Phase 7** | Local-First Storage | `src/db/indexedDB.ts`, `SettingsView.tsx` | Chats & settings persist across app reboots |
| **Phase 8** | Standalone Installer | `electron-builder.json`, `FloatCompanion-Setup.exe` | Clean installation on Windows without Node.js |
