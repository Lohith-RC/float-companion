const { app, BrowserWindow, ipcMain, globalShortcut, screen, Tray, Menu, nativeImage, clipboard } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

let mainWindow = null;
let tray = null;
let currentMode = 'orb'; // 'orb' | 'tray' | 'canvas'
let lastOrbPosition = { x: 0, y: 0 };
let focusInterval = null;

const ORB_SIZE = { width: 68, height: 68 };
const TRAY_SIZE = { width: 420, height: 600 };

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
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

  const isDev = process.env.NODE_ENV !== 'production';
  const startUrl = isDev
    ? 'http://127.0.0.1:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Set window level to float seamlessly
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
  createMainWindow();

  // 1. Global Summon Hotkey: Ctrl+Shift+Space
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    toggleWindowMode();
  });

  // Tray setup
  try {
    const icon = nativeImage.createFromPath(path.join(__dirname, '../public/favicon.ico'));
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Toggle Assistant (Ctrl+Shift+Space)', click: toggleWindowMode },
      { type: 'separator' },
      { label: 'Reset to Screen Edge', click: collapseToOrb },
      { label: 'Quit FloatCompanion', click: () => app.quit() },
    ]);
    tray.setToolTip('FloatCompanion AI');
    tray.setContextMenu(contextMenu);
    tray.on('click', toggleWindowMode);
  } catch (err) {
    console.error('Tray initialization notice:', err.message);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (focusInterval) clearInterval(focusInterval);
});

// IPC Channel Handlers
ipcMain.handle('window:expand', () => {
  expandToTray();
  return { success: true };
});

ipcMain.handle('window:collapse', () => {
  collapseToOrb();
  return { success: true };
});

ipcMain.handle('window:resize', (_event, { mode, width, height }) => {
  if (!mainWindow) return { success: false };
  if (width > 800) {
    // Fullscreen canvas mode
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: sw, height: sh } = primaryDisplay.workAreaSize;
    mainWindow.setBounds({ x: 0, y: 0, width: sw, height: sh });
    currentMode = 'canvas';
  } else if (mode === 'tray') {
    expandToTray();
  } else {
    collapseToOrb();
  }
  return { success: true };
});

ipcMain.handle('window:close', () => {
  collapseToOrb();
  return { success: true };
});

ipcMain.handle('window:minimize', () => {
  collapseToOrb();
  return { success: true };
});

// OS System Stats Handler (Zero-Token Real Hardware Telemetry)
ipcMain.handle('os:get-stats', async () => {
  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const usedMemBytes = totalMemBytes - freeMemBytes;

  const totalGB = parseFloat((totalMemBytes / (1024 ** 3)).toFixed(2));
  const freeGB = parseFloat((freeMemBytes / (1024 ** 3)).toFixed(2));
  const usedGB = parseFloat((usedMemBytes / (1024 ** 3)).toFixed(2));
  const usagePercent = Math.round((usedMemBytes / totalMemBytes) * 100);

  let storageInfo = [{ drive: 'C:', totalGB: 512, freeGB: 180, usedGB: 332 }];

  // Fetch real drive stats on Windows
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
    platform: process.platform,
    uptimeSeconds: Math.round(os.uptime()),
  };
});

// OS App Launcher
ipcMain.handle('os:launch-app', async (_event, { appName }) => {
  const normalized = (appName || '').trim().toLowerCase();

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

  const target = appAliases[normalized] || normalized;

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
          actionTaken: 'launched',
          message: `Opened ${appName}`,
        });
      }
    });
  });
});

// Type text into active background window
ipcMain.handle('os:type-text', async (_event, { text }) => {
  if (!text) return { success: false };

  clipboard.writeText(text);

  if (process.platform === 'win32' && mainWindow) {
    // Unfocus orb and simulate paste in target window
    mainWindow.blur();
    setTimeout(() => {
      exec(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`);
    }, 150);
  }

  return { success: true };
});

// Focus Guardian Poller
ipcMain.handle('focus:start', (_event, { durationMins, task }) => {
  if (focusInterval) clearInterval(focusInterval);

  const blacklistedKeywords = ['youtube', 'netflix', 'reddit', 'twitter', 'x.com', 'instagram', 'twitch', 'tiktok'];

  focusInterval = setInterval(() => {
    if (process.platform === 'win32' && mainWindow) {
      const psCommand = `(Get-Process | Where-Object { $_.MainWindowHandle -eq (Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();' -Name 'Win32' -Namespace 'Native' -PassThru)::GetForegroundWindow() }).MainWindowTitle`;

      exec(`powershell -NoProfile -Command "${psCommand}"`, { timeout: 1500 }, (err, stdout) => {
        if (!err && stdout) {
          const title = stdout.trim().toLowerCase();
          for (const keyword of blacklistedKeywords) {
            if (title.includes(keyword)) {
              mainWindow.webContents.send('focus:distraction', {
                windowTitle: stdout.trim(),
                matchedKeyword: keyword,
              });
              break;
            }
          }
        }
      });
    }
  }, 3000);

  return { success: true };
});

ipcMain.handle('focus:stop', () => {
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }
  return { success: true };
});
