const { app, BrowserWindow, ipcMain, globalShortcut, screen, Tray, Menu, nativeImage, clipboard } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const { validateCommand } = require('./securityKernel.cjs');
const SecureStore = require('./secureStore.cjs');

let mainWindow = null;
let tray = null;
let currentMode = 'orb'; // 'orb' | 'tray' | 'canvas'
let lastOrbPosition = { x: 0, y: 0 };
let focusInterval = null;
let secureStore = null;

const ORB_SIZE = { width: 68, height: 68 };
const TRAY_SIZE = { width: 440, height: 620 };

const isDev = process.env.NODE_ENV !== 'production';

// Only enforce single-instance lock in production to prevent dev restarts from quitting
if (!isDev) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
}

function createMainWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const initialX = screenWidth - ORB_SIZE.width - 24;
  const initialY = screenHeight - ORB_SIZE.height - 40;
  lastOrbPosition = { x: initialX, y: initialY };

  mainWindow = new BrowserWindow({
    width: ORB_SIZE.width,
    height: ORB_SIZE.height,
    x: initialX,
    y: initialY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  const startUrl = isDev
    ? 'http://127.0.0.1:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Set window level to float seamlessly over normal applications
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function expandToTray() {
  if (!mainWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const currentBounds = mainWindow.getBounds();
  lastOrbPosition = { x: currentBounds.x, y: currentBounds.y };

  let newX = currentBounds.x + currentBounds.width - TRAY_SIZE.width;
  let newY = currentBounds.y + currentBounds.height - TRAY_SIZE.height;

  if (newX < 10) newX = 10;
  if (newX + TRAY_SIZE.width > screenWidth) newX = screenWidth - TRAY_SIZE.width - 10;
  if (newY < 10) newY = 10;
  if (newY + TRAY_SIZE.height > screenHeight) newY = screenHeight - TRAY_SIZE.height - 10;

  mainWindow.setBounds({
    x: Math.round(newX),
    y: Math.round(newY),
    width: TRAY_SIZE.width,
    height: TRAY_SIZE.height,
  });

  currentMode = 'tray';
  mainWindow.webContents.send('window:mode-changed', 'tray');
  mainWindow.focus();
}

function collapseToOrb() {
  if (!mainWindow) return;
  mainWindow.setBounds({
    x: Math.round(lastOrbPosition.x),
    y: Math.round(lastOrbPosition.y),
    width: ORB_SIZE.width,
    height: ORB_SIZE.height,
  });

  currentMode = 'orb';
  mainWindow.webContents.send('window:mode-changed', 'orb');
}

function toggleWindowMode() {
  if (!mainWindow) return;
  if (currentMode === 'orb') {
    expandToTray();
  } else {
    collapseToOrb();
  }
}

// App Lifecycle
app.whenReady().then(() => {
  secureStore = new SecureStore();
  createMainWindow();

  // Global Summon Hotkey: Ctrl+Shift+Space
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    toggleWindowMode();
  });

  // Safe tray setup
  try {
    const iconPath = path.join(__dirname, '../public/favicon.ico');
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      tray = new Tray(icon);
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Toggle FloatCompanion (Ctrl+Shift+Space)', click: toggleWindowMode },
        { type: 'separator' },
        { label: 'Reset to Screen Edge', click: collapseToOrb },
        { label: 'Quit FloatCompanion', click: () => app.quit() },
      ]);
      tray.setToolTip('FloatCompanion AI');
      tray.setContextMenu(contextMenu);
      tray.on('click', toggleWindowMode);
    }
  } catch (err) {
    // Non-fatal if icon missing
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (focusInterval) clearInterval(focusInterval);
});

// ==============================================================================
// 1. WINDOW MANAGEMENT CHANNELS (IPC_API.md Section 2.1)
// ==============================================================================

ipcMain.handle('window:expand', () => {
  expandToTray();
  return { success: true };
});

ipcMain.handle('window:collapse', () => {
  collapseToOrb();
  return { success: true };
});

ipcMain.handle('window:resize', (_event, payload) => {
  if (!mainWindow) return { success: false, currentBounds: { x: 0, y: 0, width: 0, height: 0 } };
  const { mode, width, height } = payload || {};

  if (width && width > 800) {
    // Fullscreen screen canvas mode
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: sw, height: sh } = primaryDisplay.workAreaSize;
    mainWindow.setBounds({ x: 0, y: 0, width: sw, height: sh });
    currentMode = 'canvas';
  } else if (mode === 'tray') {
    expandToTray();
  } else {
    collapseToOrb();
  }

  const bounds = mainWindow.getBounds();
  return {
    success: true,
    currentBounds: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    },
  };
});

ipcMain.handle('window:set-ignore-mouse', (_event, { ignore, forward }) => {
  if (!mainWindow) return { success: false };
  mainWindow.setIgnoreMouseEvents(Boolean(ignore), { forward: Boolean(forward) });
  return { success: true };
});

ipcMain.on('window:minimize', () => {
  collapseToOrb();
});

ipcMain.on('window:close', () => {
  collapseToOrb();
});

// ==============================================================================
// 2. OPERATING SYSTEM & HARDWARE CHANNELS (IPC_API.md Section 2.2)
// ==============================================================================

ipcMain.handle('os:get-system-stats', async () => {
  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const usedMemBytes = totalMemBytes - freeMemBytes;

  const totalGB = parseFloat((totalMemBytes / (1024 ** 3)).toFixed(2));
  const freeGB = parseFloat((freeMemBytes / (1024 ** 3)).toFixed(2));
  const usedGB = parseFloat((usedMemBytes / (1024 ** 3)).toFixed(2));
  const usagePercent = Math.round((usedMemBytes / totalMemBytes) * 100);

  let storageInfo = [{ drive: 'C:', totalGB: 512, freeGB: 180, usedGB: 332 }];

  if (process.platform === 'win32') {
    try {
      const psDisk = `Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID, Size, FreeSpace | ConvertTo-Json`;
      const stdout = await new Promise((res) => {
        exec(`powershell -NoProfile -Command "${psDisk}"`, { timeout: 2000 }, (_err, out) => res(out));
      });
      if (stdout) {
        const parsed = JSON.parse(stdout);
        const disks = Array.isArray(parsed) ? parsed : [parsed];
        storageInfo = disks.map((d) => {
          const sizeGB = Math.round(Number(d.Size) / (1024 ** 3));
          const freeSpaceGB = Math.round(Number(d.FreeSpace) / (1024 ** 3));
          return {
            drive: d.DeviceID,
            totalGB: sizeGB,
            freeGB: freeSpaceGB,
            usedGB: sizeGB - freeSpaceGB,
          };
        });
      }
    } catch {
      // Fallback
    }
  }

  return {
    memory: {
      totalGB,
      usedGB,
      freeGB,
      usagePercent,
    },
    storage: storageInfo,
    platform: process.platform === 'win32' ? 'win32' : process.platform === 'darwin' ? 'darwin' : 'linux',
    uptimeSeconds: Math.round(os.uptime()),
  };
});

ipcMain.handle('os:launch-app', async (_event, payload) => {
  const targetRaw = (payload?.target || payload?.appName || '').trim();
  const normalized = targetRaw.toLowerCase();

  // Validate command against security kernel
  const sec = validateCommand(targetRaw);
  if (!sec.safe) {
    return {
      success: false,
      actionTaken: 'not_found',
      error: sec.error,
    };
  }

  const appAliases = {
    vscode: 'code',
    'vs code': 'code',
    notepad: 'notepad.exe',
    calc: 'calc.exe',
    calculator: 'calc.exe',
    chrome: 'chrome.exe',
    edge: 'msedge.exe',
    cmd: 'cmd.exe',
    terminal: 'wt.exe',
    explorer: 'explorer.exe',
    spotify: 'spotify.exe',
    settings: 'ms-settings:',
  };

  const target = appAliases[normalized] || targetRaw;

  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? `start "" "${target}"`
      : `open -a "${target}"`;

    exec(cmd, (error) => {
      if (error) {
        resolve({
          success: false,
          actionTaken: 'not_found',
          error: error.message,
        });
      } else {
        resolve({
          success: true,
          executablePath: target,
          actionTaken: 'launched',
          message: `Opened ${targetRaw}`,
        });
      }
    });
  });
});

ipcMain.handle('os:type-text', async (_event, { text, delayMs = 150 }) => {
  if (!text) return { success: false, error: 'Empty text payload' };

  clipboard.writeText(text);

  if (process.platform === 'win32' && mainWindow) {
    mainWindow.blur();
    setTimeout(() => {
      exec(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`, (err) => {
        if (err) console.warn('SendKeys warning:', err.message);
      });
    }, delayMs);
  }

  return { success: true };
});

// ==============================================================================
// 3. FOCUS GUARDIAN & DISTRACTION CHANNELS (IPC_API.md Section 2.3)
// ==============================================================================

ipcMain.handle('focus:start-session', (_event, payload) => {
  if (focusInterval) clearInterval(focusInterval);

  const { durationMinutes = 25, taskTitle = 'Focus Sprint', distractionBlacklist } = payload || {};
  const blacklistedKeywords = distractionBlacklist || [
    'youtube',
    'netflix',
    'reddit',
    'twitter',
    'x.com',
    'instagram',
    'twitch',
    'tiktok',
    'facebook',
  ];

  const sessionStartTimestamp = Date.now();

  focusInterval = setInterval(() => {
    if (process.platform === 'win32' && mainWindow) {
      const psCommand = `(Get-Process | Where-Object { $_.MainWindowHandle -eq (Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();' -Name 'Win32' -Namespace 'Native' -PassThru)::GetForegroundWindow() }) | Select-Object -Property MainWindowTitle, ProcessName | ConvertTo-Json`;

      exec(`powershell -NoProfile -Command "${psCommand}"`, { timeout: 1500 }, (err, stdout) => {
        if (!err && stdout) {
          try {
            const parsed = JSON.parse(stdout);
            const title = (parsed?.MainWindowTitle || '').trim();
            const proc = (parsed?.ProcessName || '').trim();
            const lowerTitle = title.toLowerCase();

            for (const keyword of blacklistedKeywords) {
              if (lowerTitle.includes(keyword.toLowerCase())) {
                mainWindow.webContents.send('focus:distraction-detected', {
                  windowTitle: title,
                  processName: proc,
                  matchedRule: keyword,
                  timestamp: Date.now(),
                });
                break;
              }
            }
          } catch {
            // Ignore non-json stdout
          }
        }
      });
    }
  }, 3000);

  return {
    success: true,
    sessionStartTimestamp,
  };
});

ipcMain.handle('focus:stop-session', () => {
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }
  return { success: true };
});

// ==============================================================================
// 4. SECURE STORAGE CHANNELS (IPC_API.md Section 2.4)
// ==============================================================================

ipcMain.handle('store:get-secure-key', async (_event, { keyName }) => {
  if (!secureStore) return { key: null };
  const val = secureStore.get(keyName);
  return { key: val };
});

ipcMain.handle('store:set-secure-key', async (_event, { keyName, keyValue }) => {
  if (!secureStore) return { success: false };
  const res = secureStore.set(keyName, keyValue);
  return { success: Boolean(res) };
});
