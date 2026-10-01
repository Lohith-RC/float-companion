const { ipcMain, screen, desktopCapturer, clipboard } = require('electron');
const { exec, spawn } = require('child_process');
const os = require('os');
const { validateCommand } = require('./securityKernel.cjs');
const { validateFocusSessionPayload, validateTypeTextPayload } = require('./ipcValidator.cjs');

let focusProcess = null;
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
      const parts = target.split(' ');
      const executable = parts[0];
      const args = parts.slice(1).join(' ');

      const cmd = process.platform === 'win32'
        ? (args ? `start "" "${executable}" ${args}` : `start "" "${executable}"`)
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

  // 5. Focus Guardian Session & Persistent Foreground Window Poller
  ipcMain.handle('focus:start-session', (_event, payload) => {
    stopFocusMonitoring();

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

    if (process.platform === 'win32') {
      const psScript = `
$code = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Diagnostics;
public class FocusTracker {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

  public static string GetActive() {
    IntPtr h = GetForegroundWindow();
    if (h == IntPtr.Zero) return "";
    StringBuilder sb = new StringBuilder(512);
    GetWindowText(h, sb, 512);
    string title = sb.ToString();
    uint pid = 0;
    GetWindowThreadProcessId(h, out pid);
    string proc = "";
    try { if (pid > 0) proc = Process.GetProcessById((int)pid).ProcessName; } catch {}
    return title + "|||" + proc;
  }
}
'@
Add-Type -TypeDefinition $code

while ($true) {
  $info = [FocusTracker]::GetActive()
  if ($info) { Write-Output $info }
  Start-Sleep -Seconds 3
}
`;
      focusProcess = spawn('powershell.exe', ['-NoProfile', '-Command', psScript]);

      let stdoutBuffer = '';
      focusProcess.stdout.on('data', (chunk) => {
        stdoutBuffer += chunk.toString();
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || '';

        const win = getMainWindow();
        if (!win) return;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const parts = trimmed.split('|||');
          const title = (parts[0] || '').trim();
          const proc = (parts[1] || '').trim();
          const lowerTitle = title.toLowerCase();
          const lowerProc = proc.toLowerCase();

          let matchedKeyword = null;
          for (const kw of blacklistedKeywords) {
            const lowerKw = kw.toLowerCase();
            if (lowerTitle.includes(lowerKw) || lowerProc.includes(lowerKw)) {
              matchedKeyword = kw;
              break;
            }
          }

          if (matchedKeyword) {
            if (!isCurrentlyDistracted) {
              isCurrentlyDistracted = true;
              win.webContents.send('focus:distraction-detected', {
                windowTitle: title,
                processName: proc,
                matchedRule: matchedKeyword,
                timestamp: Date.now(),
              });
            }
          } else if (isCurrentlyDistracted) {
            isCurrentlyDistracted = false;
            win.webContents.send('focus:distraction-cleared');
          }
        }
      });

      focusProcess.on('error', () => {
        stopFocusMonitoring();
      });
    }

    return {
      success: true,
      sessionStartTimestamp,
    };
  });

  ipcMain.handle('focus:stop-session', () => {
    stopFocusMonitoring();
    return { success: true };
  });
}

function stopFocusMonitoring() {
  if (focusProcess) {
    try {
      focusProcess.kill();
    } catch {
      // Ignore
    }
    focusProcess = null;
  }
  isCurrentlyDistracted = false;
}

module.exports = {
  registerSystemHandlers,
  stopFocusMonitoring,
};
