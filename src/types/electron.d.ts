export interface SystemStats {
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
  platform: string;
  uptimeSeconds: number;
}

export interface LaunchAppResult {
  success: boolean;
  actionTaken: 'launched' | 'brought_to_foreground' | 'not_found';
  message?: string;
  error?: string;
}

export interface FloatCompanionAPI {
  window: {
    resize: (mode: 'orb' | 'tray', width: number, height: number) => Promise<{ success: boolean }>;
    collapse: () => Promise<void>;
    expand: () => Promise<void>;
    minimize: () => Promise<void>;
    close: () => Promise<void>;
    setIgnoreMouse: (ignore: boolean) => Promise<void>;
  };
  os: {
    getStats: () => Promise<SystemStats>;
    launchApp: (appName: string) => Promise<LaunchAppResult>;
    typeText: (text: string) => Promise<{ success: boolean }>;
  };
  focus: {
    start: (durationMins: number, task: string) => Promise<{ success: boolean }>;
    stop: () => Promise<{ success: boolean }>;
    onDistraction: (callback: (data: { windowTitle: string; matchedKeyword: string }) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: FloatCompanionAPI;
  }
}
