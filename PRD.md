# Product Requirements Document (PRD) — FloatCompanion

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Product Target:** Autonomous Desktop AI Execution Companion  

---

## 1. Product Vision & Mission

Traditional AI assistants exist in browser tabs or mobile apps—disconnected from where real desktop knowledge work occurs. When developers, analysts, or writers hit roadblocks, they must manually switch contexts, copy text back and forth, and juggle windows.

**FloatCompanion** is designed around **"Calm Execution"**:
* It sits unobtrusively on the screen as a minimalist, draggable, glassmorphic floating Orb.
* It bridges natural language directly with local operating system actions (launching apps, querying live hardware specs, typing into background editors).
* It eliminates cognitive overhead with a deterministic **Zero-Token Fast Router** for common daily commands.
* It shields user attention with an active **Digital Guardian** focus mode.

---

## 2. Target User Personas

| Persona | Primary Needs & Pain Points | Key FloatCompanion Features Used |
| :--- | :--- | :--- |
| **1. Software Engineers & DevOps** | Hates leaving the IDE to lookup bash/powershell commands, needs to check RAM/disk without launching heavy GUI monitors, wants quick documentation lookup. | Global summon hotkey (`Ctrl+Shift+Space`), OS command launcher, hardware stats inspector, Groq ultra-fast code synthesis. |
| **2. Solo Founders & Sprint Hackers** | Juggling 50 tasks with tight deadlines; gets overwhelmed by complicated project management tools and red overdue backlog alerts. | Natural language sprint planner with "Self-Healing" deadline auto-recalculation, task breakdown engine. |
| **3. High-Distraction & ADHD Knowledge Workers** | Starts a task, gets sucked into YouTube or social media, loses hours down rabbit holes. | Focus Guardian mode, background window distraction detector, visual urgency color shifts, chit-chat blocker. |
| **4. Researchers & Academic Analysts** | Analyzes research papers and needs to draw diagrams or highlight text across multi-window reference materials. | Transparent Screen Canvas overlay, local PDF document drop, zero-token note generator (`/note`). |

---

## 3. Product Scope & Functional Requirements

### 3.1. Floating Orb Window Shell (Core UI)
* **FR-1.1 (Always-on-Top):** The desktop window must float above all active applications with transparent backgrounds, no standard OS borders or title bars.
* **FR-1.2 (Dual Geometry States):**
  * **Compact Orb State:** A circular interactive orb (diameter 60px to 72px) with subtle breathing animation and status indicator dot.
  * **Expanded Tray State:** An animated glassmorphic panel (width 400px–460px, height 550px–650px) hosting tabs for Chat, System Health, Tasks, and Settings.
* **FR-1.3 (Draggable & Sticky):** The user can click-drag the Orb to any desktop edge. It snaps smoothly to margins without obscuring OS taskbars.
* **FR-1.4 (Global Summon Hotkey):** Pressing `Ctrl + Shift + Space` must summon the window from anywhere, instantly focusing the prompt input field.

### 3.2. Deterministic Zero-Token Fast Router
* **FR-2.1 (Pattern Recognition):** Prompts matching known local intent patterns must be executed locally within 10ms without making external network or LLM API calls.
* **FR-2.2 (Intent Catalog):**
  * `Time / Date`: Formats local machine time/date.
  * `System Stats`: Queries available RAM and disk space via PowerShell / POSIX.
  * `App Launching`: Matches queries like `open chrome`, `launch vscode`, `start calc`.
  * `Task Inspection`: Returns pending goals/tasks from local store.
  * `Document Export`: Generates `/pdf` or `/note` directly on client.
* **FR-2.3 (Pass-Through):** Any prompt not matched with >95% confidence by the router is immediately forwarded to the cloud/local AI model.

### 3.3. Multi-Model AI Hub & Key Rotation
* **FR-3.1 (Provider Support):** Native support for:
  * Groq (`llama-3.3-70b-versatile`) — ultra low latency (<300ms).
  * Google Gemini (`gemini-2.5-flash` / `gemini-1.5-flash`) — deep reasoning and vision.
  * OpenAI (`gpt-4o-mini` / `gpt-4o`).
  * Local Ollama (`llama3`, `mistral`, `deepseek-r1`).
* **FR-3.2 (Zero-Delay Fallback):** When an API key encounters HTTP 429 (rate-limited) or quota exhaustion, it immediately rotates to the next available key or fallback provider without waiting for backoff timers.
* **FR-3.3 (Streaming Responses):** All LLM generation must stream in real time via server-sent events or streaming reader with Markdown and syntax-highlighted code blocks.

### 3.4. Local OS Action Broker
* **FR-4.1 (Safe Command Execution):** Executes verified PowerShell / bash scripts via a restricted, non-blocking child process.
* **FR-4.2 (App Focusing & Launching):** If an application is already open, brings its existing window to the foreground rather than launching duplicate instances.
* **FR-4.3 (Window Text Typing):** Allows the assistant to paste or type generated text directly into the active window behind the Orb upon explicit user confirmation.

### 3.5. Digital Guardian (Focus & Pomodoro Suite)
* **FR-5.1 (Active Window Polling):** While Focus Mode is active, poll the title of the currently focused window every 3 seconds.
* **FR-5.2 (Distraction Rules):** If a blacklisted keyword (e.g. `YouTube`, `Netflix`, `Reddit`, `Twitter`, `Instagram`, `Twitch`) is detected in the title, trigger an alert overlay.
* **FR-5.3 (Urgency Palette Shifts):** Visual status indicator transitions:
  * 🟢 **Normal / Idle:** Calm blue/emerald.
  * 🟡 **Sprint Active:** Amber breathing pulse.
  * 🔴 **Distraction Detected:** High-contrast pulsating red with return-to-work callout.
* **FR-5.4 (Chit-Chat Deflection):** If the user types off-topic casual questions during a Focus Sprint, the assistant responds with: *"You have an active sprint: [Task Name]. Finish this first or type `/endfocus` to break."*

### 3.6. Self-Healing Sprint Planner
* **FR-6.1 (Natural Language Deconstruction):** Converts free-form goals into atomic, checklist-style tasks with estimated durations.
* **FR-6.2 (Autonomous Rescheduling):** If task 1 slips past estimated duration, downstream non-essential tasks automatically shift forward in time to protect the hard deadline.

---

## 4. Non-Functional Requirements (NFR)

* **NFR-1 (Startup & Memory Footprint):**
  * Cold launch time must be under 1.5 seconds.
  * Memory footprint in compact Orb state must remain < 120MB RSS.
* **NFR-2 (Latency Budget):**
  * Global hotkey summon to input ready: < 50ms.
  * Zero-Token Fast Router response: < 10ms.
  * Groq LLM First-Token Latency: < 400ms.
* **NFR-3 (Data Privacy & Zero Leakage):**
  * Local conversations, system telemetry, and API keys are persisted strictly in local IndexedDB / SQLite.
  * No analytics or keystrokes transmitted to third parties.
* **NFR-4 (Security & Sandboxing):**
  * Renderer process must have `nodeIntegration: false` and `contextIsolation: true`.
  * All OS calls pass strictly through typed IPC channels checked by a de-obfuscation security kernel.

---

## 5. Success Metrics

1. **Summon Frequency:** Average user summons the Orb 15+ times per workday.
2. **Context-Switch Reduction:** 60% of quick queries (time, system stats, quick math, app launching) resolved without opening a browser tab.
3. **Focus Session Completion:** >80% of launched 25-minute Pomodoro sprints completed without distraction breaks.
