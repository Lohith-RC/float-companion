const { app, BrowserWindow, ipcMain, globalShortcut, screen, Tray, Menu, nativeImage, shell, session, clipboard } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const { validateResizePayload, validateSecureKeyPayload, checkRateLimit } = require('./ipcValidator.cjs');
const { registerSystemHandlers, stopFocusMonitoring } = require('./systemHandlers.cjs');
const { registerAuthHandlers } = require('./authHandlers.cjs');
const SecureStore = require('./secureStore.cjs');

let mainWindow = null;
let tray = null;
let currentMode = 'orb'; // 'orb' | 'tray' | 'canvas'
let lastOrbPosition = { x: 0, y: 0 };
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
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  const startUrl = isDev
    ? 'http://127.0.0.1:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Enterprise Security: Intercept external navigation inside the Electron shell
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const cleanNav = navigationUrl.split('#')[0].split('?')[0];
      const cleanStart = startUrl.split('#')[0].split('?')[0];
      if (cleanNav !== cleanStart) {
        event.preventDefault();
        if (navigationUrl.startsWith('https:') || navigationUrl.startsWith('http:')) {
          shell.openExternal(navigationUrl);
        }
      }
    } catch {
      event.preventDefault();
    }
  });

  // Enterprise Security: Intercept window.open / target="_blank" and open safely in external system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Set window level to float seamlessly over normal applications
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function expandToTray() {
  if (!mainWindow) return;
  const currentBounds = mainWindow.getBounds();
  lastOrbPosition = { x: currentBounds.x, y: currentBounds.y };

  const targetDisplay = screen.getDisplayMatching(currentBounds);
  const { x: dx, y: dy, width: dw, height: dh } = targetDisplay.workArea;

  let newX = currentBounds.x + currentBounds.width - TRAY_SIZE.width;
  let newY = currentBounds.y + currentBounds.height - TRAY_SIZE.height;

  if (newX < dx + 10) newX = dx + 10;
  if (newX + TRAY_SIZE.width > dx + dw - 10) newX = dx + dw - TRAY_SIZE.width - 10;
  if (newY < dy + 10) newY = dy + 10;
  if (newY + TRAY_SIZE.height > dy + dh - 10) newY = dy + dh - TRAY_SIZE.height - 10;

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

// ponytail: SendKeys ^c selection capture; native C++ Windows Accessibility UIAutomation API if foreground apps block synthetic keystrokes
function triggerHighlightToAsk() {
  if (!mainWindow) return;

  const captureAndExpand = () => {
    let text = '';
    try {
      text = clipboard.readText().trim();
    } catch {}

    expandToTray();
    if (text) {
      mainWindow.webContents.send('chat:inject-prompt', {
        text,
        prompt: `Explain this code or text:\n\n\`\`\`\n${text.slice(0, 3000)}\n\`\`\``,
      });
    }
  };

  if (process.platform === 'win32') {
    exec(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')"`,
      () => {
        setTimeout(captureAndExpand, 80);
      }
    );
  } else {
    captureAndExpand();
  }
}

// App Lifecycle
app.whenReady().then(() => {
  secureStore = new SecureStore();
  createMainWindow();
  registerSystemHandlers(() => mainWindow);
  registerAuthHandlers();

  // Explicit permission allowlist: allow audioCapture/media only for trusted local app origin
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const requestingUrl = webContents?.getURL?.() || '';
    const isAppOrigin = isDev
      ? requestingUrl.startsWith('http://127.0.0.1:5173') || requestingUrl.startsWith('http://localhost:5173')
      : requestingUrl.startsWith('file://');

    if (isAppOrigin && (permission === 'media' || permission === 'audioCapture')) {
      callback(true);
    } else {
      callback(false);
    }
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'media' || permission === 'audioCapture';
  });

  // Global Summon Hotkey: Ctrl+Shift+Space
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    toggleWindowMode();
  });

  // Global Highlight-to-Ask Hotkey: Ctrl+Shift+E
  globalShortcut.register('CommandOrControl+Shift+E', () => {
    triggerHighlightToAsk();
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
  stopFocusMonitoring();
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
  
  const validation = validateResizePayload(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error, currentBounds: mainWindow.getBounds() };
  }

  const { mode, width } = payload || {};

  if (width && width > 800) {
    // Fullscreen screen canvas mode on active display
    const targetDisplay = screen.getDisplayMatching(mainWindow.getBounds());
    const { x: dx, y: dy, width: dw, height: dh } = targetDisplay.bounds;
    mainWindow.setBounds({ x: dx, y: dy, width: dw, height: dh });
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

ipcMain.handle('window:set-ignore-mouse', (_event, payload) => {
  if (!mainWindow) return { success: false };
  const { ignore, forward } = payload || {};
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
// 2. SECURE STORAGE CHANNELS (IPC_API.md Section 2.4)
// ==============================================================================

ipcMain.handle('store:get-secure-key', async (_event, payload) => {
  if (!secureStore) return { key: null };
  const val = validateSecureKeyPayload(payload || {});
  if (!val.valid) return { key: null, error: val.error };
  const stored = secureStore.get(payload.keyName);
  return { key: stored };
});

ipcMain.handle('store:set-secure-key', async (_event, payload) => {
  if (!secureStore) return { success: false };
  const rate = checkRateLimit('store:set-secure-key');
  if (!rate.allowed) return { success: false, error: rate.error };
  const val = validateSecureKeyPayload(payload || {});
  if (!val.valid) return { success: false, error: val.error };
  const res = secureStore.set(payload.keyName, payload.keyValue);
  return { success: Boolean(res) };
});
