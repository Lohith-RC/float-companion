# Electron IPC API Specification — FloatCompanion

**Document Version:** 1.0.0  
**Scope:** Hardened Preload Interface, IPC Channels, Data Contracts & Error Enums  

---

## 1. Overview & ContextBridge Contract

The communication boundary between the Renderer Process (React UI) and the Main Process (Node.js/OS) is strictly brokered by Electron's `contextBridge`.

Inside the Renderer, all calls are invoked through `window.electronAPI`:

```typescript
// Window global augmentation
declare global {
  interface Window {
    electronAPI: FloatCompanionAPI;
  }
}
```

---

## 2. Full IPC Channel Registry

### 2.1. Window Management Channels

#### `window:resize`
* **Direction:** Renderer ➔ Main (Invoke)
* **Description:** Changes the desktop window dimensions and position when expanding from Orb to Tray or collapsing.
* **Payload:**
```typescript
interface WindowResizePayload {
  width: number;
  height: number;
  mode: 'orb' | 'tray' | 'canvas' | 'custom';
  animate?: boolean;
}
```
* **Response:**
```typescript
interface WindowResizeResponse {
  success: boolean;
  currentBounds: { x: number; y: number; width: number; height: number };
}
```

#### `window:set-ignore-mouse`
* **Direction:** Renderer ➔ Main (Invoke)
* **Description:** Toggles click-through behavior. Used when the transparent canvas is active so clicks pass through to background apps.
* **Payload:** `{ ignore: boolean; forward?: boolean }`
* **Response:** `{ success: boolean }`

#### `window:minimize` & `window:close`
* **Direction:** Renderer ➔ Main (Send)
* **Description:** Minimizes to OS system tray or quits the application.

---

### 2.2. Operating System & Hardware Channels

#### `os:get-system-stats`
* **Direction:** Renderer ➔ Main (Invoke)
* **Description:** Returns real-time memory, CPU, and storage statistics without hallucinations.
* **Payload:** `void`
* **Response:**
```typescript
interface SystemStatsResponse {
  memory: {
    totalGB: number;
    usedGB: number;
    freeGB: number;
    usagePercent: number;
  };
  storage: {
    drive: string;
    totalGB: number;
    freeGB: number;
    usedGB: number;
  }[];
  platform: 'win32' | 'darwin' | 'linux';
  uptimeSeconds: number;
}
```

#### `os:launch-app`
* **Direction:** Renderer ➔ Main (Invoke)
* **Description:** Resolves application name against system aliases and launches the app or brings it to the foreground.
* **Payload:**
```typescript
interface LaunchAppPayload {
  target: string; // e.g., 'chrome', 'vscode', 'notepad', 'settings'
}
```
* **Response:**
```typescript
interface LaunchAppResponse {
  success: boolean;
  executablePath?: string;
  actionTaken: 'launched' | 'brought_to_foreground' | 'not_found';
  error?: string;
}
```

#### `os:type-text`
* **Direction:** Renderer ➔ Main (Invoke)
* **Description:** Simulates keystrokes or sends text via clipboard to the window currently active behind the Orb.
* **Payload:**
```typescript
interface TypeTextPayload {
  text: string;
  delayMs?: number;
}
```
* **Response:**
```typescript
interface TypeTextResponse {
  success: boolean;
  error?: string;
}
```

---

### 2.3. Focus Guardian & Distraction Channels

#### `focus:start-session`
* **Direction:** Renderer ➔ Main (Invoke)
* **Description:** Activates background window monitoring poller for distraction detection.
* **Payload:**
```typescript
interface StartFocusPayload {
  durationMinutes: number;
  taskTitle: string;
  distractionBlacklist?: string[]; // Overrides default list if provided
}
```
* **Response:** `{ success: boolean; sessionStartTimestamp: number }`

#### `focus:distraction-detected`
* **Direction:** Main ➔ Renderer (Event Broadcast)
* **Description:** Sent to UI when the poller detects a blacklisted window active.
* **Event Payload:**
```typescript
interface DistractionEvent {
  windowTitle: string;
  processName: string;
  matchedRule: string;
  timestamp: number;
}
```

#### `focus:stop-session`
* **Direction:** Renderer ➔ Main (Invoke)
* **Description:** Terminates the polling daemon and marks session end.

---

### 2.4. Secure Storage Channels

#### `store:get-secure-key`
* **Direction:** Renderer ➔ Main (Invoke)
* **Payload:** `{ keyName: 'groq' | 'gemini' | 'openai' }`
* **Response:** `{ key: string | null }`

#### `store:set-secure-key`
* **Direction:** Renderer ➔ Main (Invoke)
* **Payload:** `{ keyName: string; keyValue: string }`
* **Response:** `{ success: boolean }`

---

## 3. Error Codes & Handling Contract

```typescript
export enum IPCErrorCode {
  ERR_COMMAND_BLOCKED = 'ERR_COMMAND_BLOCKED', // Security kernel rejected command
  ERR_APP_NOT_FOUND = 'ERR_APP_NOT_FOUND',
  ERR_EXECUTION_TIMEOUT = 'ERR_EXECUTION_TIMEOUT',
  ERR_PERMISSION_DENIED = 'ERR_PERMISSION_DENIED',
  ERR_KEY_NOT_FOUND = 'ERR_KEY_NOT_FOUND'
}

export interface IPCErrorResponse {
  success: false;
  code: IPCErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
```
