const { ipcMain, screen, desktopCapturer, clipboard } = require('electron');
const { exec } = require('child_process');
const os = require('os');
const { validateCommand } = require('./securityKernel.cjs');
const { validateFocusSessionPayload, validateTypeTextPayload } = require('./ipcValidator.cjs');

let focusInterval = null;
let cachedStorageInfo = null;
let lastStorageQueryTime = 0;
let isCurrentlyDistracted = false;

/**
 * Registers OS and Focus Guardian IPC handlers.
 * Kept strictly modular to ensure main.cjs stays under 400 lines.
 */
function registerSystemHandlers(getMainWindow) {
  // 1. System Stats Channel
  ipcMain.handle('os:get-system-stats', async () => {
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;

    const totalGB = parseFloat((totalMemBytes / (1024 ** 3)).toFixed(2));
    const freeGB = parseFloat((freeMemBytes / (1024 ** 3)).toFixed(2));
    const usedGB = parseFloat((usedMemBytes / (1024 ** 3)).toFixed(2));
    const usagePercent = Math.round((usedMemBytes / totalMemBytes) * 100);

    let storageInfo = cachedStorageInfo || [{ drive: 'C:', totalGB: 512, freeGB: 180, usedGB: 332 }];

    if (process.platform === 'win32' && (!cachedStorageInfo || Date.now() - lastStorageQueryTime > 25000)) {
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
          cachedStorageInfo = storageInfo;
          lastStorageQueryTime = Date.now();
        }
      } catch {
        // Safe fallback
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

  // 2. Launch Application Channel with Security Sandbox Whitelist
  ipcMain.handle('os:launch-app', async (_event, payload) => {
    const targetRaw = (payload?.target || payload?.appName || '').trim();
    const normalized = targetRaw.toLowerCase();

    // Input sanitation: Enforce strict character whitelist and length bounds
    if (!targetRaw || !/^[a-zA-Z0-9_\-\.\:\s]{1,64}$/.test(targetRaw)) {
      return {
        success: false,
        actionTaken: 'not_found',
        error: 'Security Violation: Target app name contains illegal characters or exceeds length limits.',
      };
    }

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

  // 3. Background Typing Channel
  ipcMain.handle('os:type-text', async (_event, payload) => {
    const val = validateTypeTextPayload(payload || {});
    if (!val.valid) return { success: false, error: val.error };

    const { text, delayMs = 150 } = payload;
    clipboard.writeText(text);

    const win = getMainWindow();
    if (process.platform === 'win32' && win) {
      win.blur();
      setTimeout(() => {
        exec(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`, (err) => {
          if (err) console.warn('SendKeys warning:', err.message);
        });
      }, Math.max(50, Math.min(delayMs, 5000)));
    }

    return { success: true };
  });

  // 4. Desktop Multimodal Capture Channel
  ipcMain.handle('os:capture-screen', async () => {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.min(primaryDisplay.size.width || 1920, 1920),
          height: Math.min(primaryDisplay.size.height || 1080, 1080),
        },
      });

      if (sources && sources.length > 0) {
        const image = sources[0].thumbnail;
        const dataUrl = image.toDataURL();
        const base64Data = image.toJPEG(85).toString('base64');
        return {
          success: true,
          dataUrl,
          base64Data,
          mimeType: 'image/jpeg',
        };
      }
      return { success: false, error: 'No display source detected' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 5. Focus Guardian Session & Distraction Interceptor
  ipcMain.handle('focus:start-session', (_event, payload) => {
    if (focusInterval) clearInterval(focusInterval);

    const validation = validateFocusSessionPayload(payload || {});
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { distractionBlacklist } = payload || {};
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

    isCurrentlyDistracted = false;
    const sessionStartTimestamp = Date.now();

    focusInterval = setInterval(() => {
      const win = getMainWindow();
      if (process.platform === 'win32' && win) {
        // Lightweight standard query without in-memory C# compilation
        const psCommand = `Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object -Property MainWindowTitle, ProcessName | ConvertTo-Json -Compress`;

        exec(`powershell -NoProfile -Command "${psCommand}"`, { timeout: 1500 }, (err, stdout) => {
          if (!err && stdout) {
            try {
              const parsed = JSON.parse(stdout);
              const windows = Array.isArray(parsed) ? parsed : [parsed];
              let foundDistraction = false;

              for (const w of windows) {
                const title = (w?.MainWindowTitle || '').trim();
                const proc = (w?.ProcessName || '').trim();
                const lowerTitle = title.toLowerCase();

                for (const keyword of blacklistedKeywords) {
                  if (lowerTitle.includes(keyword.toLowerCase())) {
                    foundDistraction = true;
                    if (!isCurrentlyDistracted) {
                      isCurrentlyDistracted = true;
                      win.webContents.send('focus:distraction-detected', {
                        windowTitle: title,
                        processName: proc,
                        matchedRule: keyword,
                        timestamp: Date.now(),
                      });
                    }
                    break;
                  }
                }
                if (foundDistraction) break;
              }

              if (!foundDistraction && isCurrentlyDistracted) {
                isCurrentlyDistracted = false;
                win.webContents.send('focus:distraction-cleared');
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
    isCurrentlyDistracted = false;
    return { success: true };
  });
}

function stopFocusMonitoring() {
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }
  isCurrentlyDistracted = false;
}

module.exports = {
  registerSystemHandlers,
  stopFocusMonitoring,
};
