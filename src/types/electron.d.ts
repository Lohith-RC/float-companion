export interface SystemStatsResponse {
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

export interface LaunchAppResponse {
  success: boolean;
  executablePath?: string;
  actionTaken: 'launched' | 'brought_to_foreground' | 'not_found';
  error?: string;
  message?: string;
}

export interface CaptureScreenResponse {
  success: boolean;
  dataUrl?: string;
  base64Data?: string;
  mimeType?: string;
  error?: string;
}

export interface TypeTextResponse {
  success: boolean;
  error?: string;
}

export interface WindowResizeResponse {
  success: boolean;
  currentBounds: { x: number; y: number; width: number; height: number };
}

export interface DistractionEvent {
  windowTitle: string;
  processName: string;
  matchedRule: string;
  timestamp: number;
}

export interface FloatCompanionAPI {
  window: {
    resize: (payload: {
      width: number;
      height: number;
      mode: 'orb' | 'tray' | 'canvas' | 'custom';
      animate?: boolean;
    }) => Promise<WindowResizeResponse>;
    collapse: () => Promise<void>;
    expand: () => Promise<void>;
    minimize: () => Promise<void>;
    close: () => Promise<void>;
    setIgnoreMouse: (ignore: boolean, forward?: boolean) => Promise<{ success: boolean }>;
  };
  os: {
    getStats: () => Promise<SystemStatsResponse>;
    launchApp: (target: string) => Promise<LaunchAppResponse>;
    typeText: (text: string, delayMs?: number) => Promise<TypeTextResponse>;
    captureScreen: () => Promise<CaptureScreenResponse>;
  };
  focus: {
    startSession: (payload: {
      durationMinutes: number;
      taskTitle: string;
      distractionBlacklist?: string[];
    }) => Promise<{ success: boolean; sessionStartTimestamp: number }>;
    stopSession: () => Promise<{ success: boolean }>;
    onDistractionDetected: (callback: (data: DistractionEvent) => void) => () => void;
    // Backward compatibility aliases
    start: (durationMins: number, task: string) => Promise<{ success: boolean }>;
    stop: () => Promise<{ success: boolean }>;
    onDistraction: (callback: (data: DistractionEvent) => void) => () => void;
  };
  store: {
    getSecureKey: (keyName: 'groq' | 'gemini' | 'openai' | string) => Promise<{ key: string | null }>;
    setSecureKey: (keyName: string, keyValue: string) => Promise<{ success: boolean }>;
  };
}

declare global {
  interface Window {
    electronAPI?: FloatCompanionAPI;
  }
}
