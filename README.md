# FloatCompanion (Autonomous AI Desktop Companion)

> A lightweight, persistent, floating desktop AI copilot inspired by FloatGPT. It sits seamlessly over your desktop workspace as an interactive floating Orb, executing native OS commands, managing focus, and providing low-latency multi-model intelligence.

---

## 🌟 Executive Summary

FloatCompanion bridges the gap between passive web-based AI chats and local desktop execution. Traditional AI chatbots sit idle in a browser tab requiring manual copy-pasting. FloatCompanion is an active desktop participant:

* **Always Accessible:** Summonable anywhere via a global hotkey (`Ctrl + Shift + Space`).
* **Zero-Token Local Execution:** Answers clock, calendar, system hardware stats, and app launches in under 10ms with zero LLM API calls.
* **Native Operating System Bridge:** Inspects running windows, queries RAM/disk telemetry, opens apps, and pastes text directly into background windows.
* **Focus & Attention Guardian:** An active focus engine that detects distraction windows (YouTube, Reddit, Twitter) during deep-work sprints and pulls you back on track.
* **Local-First & Privacy-Focused:** All API keys and chat histories remain strictly on your local machine using encrypted local storage / IndexedDB.

---

## ⚡ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Desktop Shell** | **Electron 33+ / Node 22** | Transparent window, global hotkeys, Win32/macOS IPC bridge |
| **Frontend Framework** | **React 19 + TypeScript + Vite** | High-performance reactive UI rendering |
| **Styling & Motion** | **Tailwind CSS + Framer Motion** | Glassmorphic aesthetics, physics-based drag & expanding transitions |
| **Fast Intent Router** | **TypeScript (Regex + AST Matcher)** | Zero-token, sub-10ms deterministic local command interception |
| **AI Orchestration** | **Groq SDK + Gemini SDK + OpenAI API** | Sub-300ms Llama-3.3 on Groq, Gemini 2.5 Flash for vision/RAG |
| **Local Persistence** | **IndexedDB (`idb-keyval`) / SQLite** | Local-first message storage and cached habit telemetry |
| **OS Scripting Engine** | **PowerShell (Windows) / AppleScript (macOS)** | Non-blocking spawned shell processes guarded by a security kernel |

---

## ⌨️ Default Global Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Ctrl + Shift + Space` | Toggle Assistant (Summon / Dismiss) | Global (Anywhere in OS) |
| `Escape` | Collapse expanded panel back to compact Orb | In-App |
| `Ctrl + Shift + F` | Toggle Instant Focus / Pomodoro Mode | Global |
| `Ctrl + Shift + C` | Toggle Transparent Screen Canvas Overlay | Global |
| `Ctrl + Enter` | Submit prompt / message | In-App Chat |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
* **Node.js**: v18.0.0 or later (v20+ LTS recommended)
* **npm** or **pnpm** installed
* **OS**: Windows 10/11 (PowerShell 5.1+ or 7+) or macOS (12+)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/float-companion.git
cd float-companion

# Install dependencies
npm install
```

### 3. Configure API Keys
Copy the example environment file:
```bash
cp .env.example .env
```
Add at least one LLM provider key (Groq is recommended for ultra-low latency, or Google Gemini):
```env
VITE_GROQ_API_KEY=gsk_your_groq_api_key_here
VITE_GEMINI_API_KEY=AIzaSy_your_gemini_api_key_here
```

### 4. Run in Development Mode
```bash
# Runs Vite dev server and Electron simultaneously
npm run dev
```

### 5. Build Desktop Installers
```bash
# Build Windows NSIS (.exe) installer
npm run pack:win

# Build macOS DMG (.dmg) package
npm run pack:mac
```

---

## 📁 Repository Documentation Map

Every subsystem of FloatCompanion is thoroughly specified across dedicated documentation files:

* 📄 [PRD.md](file:///C:/Users/lohit/.gemini/antigravity-ide/scratch/float-companion/PRD.md) — Product Requirements, User Personas, Goals, and Functional Acceptance Criteria.
* 🏛️ [ARCHITECTURE.md](file:///C:/Users/lohit/.gemini/antigravity-ide/scratch/float-companion/ARCHITECTURE.md) — Deep technical architecture, process isolation, and sub-system interaction.
* 🔄 [APPFLOW.md](file:///C:/Users/lohit/.gemini/antigravity-ide/scratch/float-companion/APPFLOW.md) — State machine, window transitions, UI modes, and user journey flows.
* 🔌 [IPC_API.md](file:///C:/Users/lohit/.gemini/antigravity-ide/scratch/float-companion/IPC_API.md) — Full specification of Electron IPC channels, request payloads, and responses.
* 🧠 [MEMORY.md](file:///C:/Users/lohit/.gemini/antigravity-ide/scratch/float-companion/MEMORY.md) — Short-term context, persistent memory, habit tracking, and context compression.
* 📜 [RULES.md](file:///C:/Users/lohit/.gemini/antigravity-ide/scratch/float-companion/RULES.md) — Engineering guidelines, prompt guardrails, and non-negotiable coding standards.
* 🛡️ [SECURITY.md](file:///C:/Users/lohit/.gemini/antigravity-ide/scratch/float-companion/SECURITY.md) — Multi-tier security kernel, PowerShell de-obfuscation, and command whitelists.
* 🛠️ [DEVELOPMENT.md](file:///C:/Users/lohit/.gemini/antigravity-ide/scratch/float-companion/DEVELOPMENT.md) — Local development workflow, transparent window debugging, and packaging tips.
* 🗺️ [ROADMAP.md](file:///C:/Users/lohit/.gemini/antigravity-ide/scratch/float-companion/ROADMAP.md) — Phased milestone checklist from Day 1 to Production v1.0.

---

## ⚖️ License
MIT License. Built for calm execution and desktop autonomy.
