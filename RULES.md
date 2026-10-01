# Engineering & Operational Rules — FloatCompanion

**Document Version:** 1.0.0  
**Scope:** Architecture Invariants, Coding Standards, AI Persona Guidelines & Security Guardrails  

---

## 1. Non-Negotiable System Invariants

1. **Local-First Precedence:** Every user interaction, note creation, and task status toggle MUST write to local IndexedDB before any asynchronous network request is dispatched.
2. **Authority vs. Intelligence Invariant:** The AI model possesses ZERO native authorization to execute OS commands. An AI output suggesting an action must pass through the deterministic Security Kernel before reaching PowerShell.
3. **The Single-Window Invariant:** Opening an application or webpage that is already running must focus the existing window instead of launching duplicate instances.
4. **Zero-Token Priority:** Any feature that can be accomplished with regular expressions, local system APIs, or date math must NEVER touch an LLM.

---

## 2. Engineering & Code Quality Standards

* **TypeScript Strictness:** Strict mode is mandatory (`"strict": true`). No `any` types in IPC contracts, storage schemas, or router signatures.
* **Separation of Concerns:**
  * `src/ui/` — Strictly UI components. No direct Node.js imports.
  * `src/ai/` — Model orchestration, fallback retry loops, and intent parsing.
  * `electron/` — Main process, window geometry, global shortcuts, and OS interaction.
* **No Blocking Sync Calls:** Never use synchronous child process methods (e.g. `execSync`) in the main process, which freeze the UI. Always use asynchronous streams or `spawn`.
* **State Management:** Use Zustand for fast, lightweight atomic state updates. Avoid massive monolithic Redux or context providers that cause unnecessary re-renders.

---

## 3. AI Persona & Prompting Rules

FloatCompanion embodies **Calm, High-Agency Execution**:

* **Tone:** Concise, objective, and action-oriented. No conversational fluff (*"Hello! I am happy to help you with that today!"* is banned).
* **Code Output Format:** When generating code or scripts, always provide executable blocks with clear comments.
* **Focus Sprint Behavior:** If a user sends off-topic casual questions during an active Pomodoro sprint, the model must gently deflect and prioritize the active task.
* **No Fake Terminal Theatrics:** Never simulate artificial terminal delays, hacking sounds, or sci-fi visual gimmicks.

---

## 4. UI/UX Design System Rules

* **Glassmorphic Minimalism:** Use curated dark mode palettes (`#090D16` / `#0F172A`) with subtle border gradients (`border-white/10`) and backdrop blur (`backdrop-blur-md`).
* **High Contrast:** All text must meet WCAG AAA contrast guidelines against translucent backgrounds.
* **Zero Frame Artifacts:** Ensure the Electron transparent window has no white flicker or black square artifacts on resize by using hardware acceleration properly.
