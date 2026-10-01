import { getErrorMessage } from '../utils/errorUtils';

export interface RouterResult {
  handled: boolean;
  reply?: string;
  action?: 'launched_app' | 'showed_stats' | 'local_time' | 'task_summary' | 'clear_chat';
}

export async function matchLocalIntent(prompt: string): Promise<RouterResult> {
  const p = prompt.trim().toLowerCase();

  // 1. Time & Date (Sub-5ms)
  if (
    p === 'time' ||
    p === 'date' ||
    p.includes('what time is it') ||
    p.includes('current time') ||
    p.includes('what is the time') ||
    p.includes('what day is it')
  ) {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formattedDate = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    return {
      handled: true,
      action: 'local_time',
      reply: `🕒 **Local Machine Time:** \`${formattedTime}\`\n📅 **Date:** ${formattedDate}\n*(Zero-Token Local Clock)*`,
    };
  }

  // 2. Hardware / Memory Stats (Sub-50ms via IPC)
  const isMemoryQuery =
    /^(?:what\s+is\s+the\s+)?(?:how\s+much\s+)?(?:ram|system\s+memory)(?:\s+(?:is\s+free|in\s+use|usage))?$/i.test(p) ||
    p === 'ram' ||
    p === 'memory' ||
    p === 'hardware stats';

  if (isMemoryQuery) {
    if (window.electronAPI?.os?.getStats) {
      try {
        const stats = await window.electronAPI.os.getStats();
        return {
          handled: true,
          action: 'showed_stats',
          reply: `📊 **Native System Hardware Status:**\n- **Memory In Use:** \`${stats.memory.usedGB} GB\` / \`${stats.memory.totalGB} GB\` (${stats.memory.usagePercent}%)\n- **Free RAM Available:** \`${stats.memory.freeGB} GB\`\n- **OS Platform:** \`${stats.platform}\`\n*(Zero-Token Native Hardware Query)*`,
        };
      } catch (err: unknown) {
        return {
          handled: true,
          reply: `⚠️ Failed to fetch native hardware stats: ${getErrorMessage(err)}`,
        };
      }
    }
  }

  // 3. Storage / Disk Drive Telemetry (Sub-50ms via IPC)
  const isStorageQuery =
    /^(?:how\s+much\s+)?(?:disk|storage|drive|hard\s+drive)(?:\s+(?:space|is\s+free|usage))?$/i.test(p) ||
    p === 'disk' ||
    p === 'storage';

  if (isStorageQuery) {
    if (window.electronAPI?.os?.getStats) {
      try {
        const stats = await window.electronAPI.os.getStats();
        const primaryDrive = stats.storage?.[0];
        const driveInfo = primaryDrive
          ? `\`${primaryDrive.drive}\` — \`${primaryDrive.freeGB} GB\` free of \`${primaryDrive.totalGB} GB\` (\`${primaryDrive.usedGB} GB\` in use)`
          : 'Storage information unavailable';
        return {
          handled: true,
          action: 'showed_stats',
          reply: `💾 **Storage Drive Telemetry:**\n- **Primary Disk:** ${driveInfo}\n- **Drives Detected:** ${stats.storage?.length || 1}\n*(Zero-Token Native Hardware Query)*`,
        };
      } catch (err: unknown) {
        return {
          handled: true,
          reply: `⚠️ Failed to fetch storage telemetry: ${getErrorMessage(err)}`,
        };
      }
    }
  }

  // 3. Application Launcher (Sub-20ms)
  const launchMatch = p.match(/^(?:open|launch|start)\s+([a-zA-Z0-9\s_-]+)$/i);
  if (launchMatch) {
    const appTarget = launchMatch[1].trim();
    if (window.electronAPI?.os?.launchApp) {
      const res = await window.electronAPI.os.launchApp(appTarget);
      if (res.success) {
        return {
          handled: true,
          action: 'launched_app',
          reply: `🚀 **App Launcher:** Successfully triggered **${appTarget}**.\n*(Zero-Token OS Process Dispatch)*`,
        };
      } else {
        return {
          handled: true,
          reply: `⚠️ Could not find or launch **${appTarget}**: ${res.error || 'Executable alias not recognized'}.`,
        };
      }
    }
  }

  // 4. Clear Chat History
  if (p === 'clear' || p === '/clear' || p === 'cls') {
    return {
      handled: true,
      action: 'clear_chat',
      reply: '🧹 Chat history cleared.',
    };
  }

  // 5. Quick Help
  if (p === 'help' || p === '/help') {
    return {
      handled: true,
      reply: `🤖 **FloatCompanion Commands:**\n- \`time\` or \`date\` — Instant machine clock\n- \`ram\` or \`memory\` — Real-time memory consumption\n- \`open <app>\` — Launch app (e.g. \`open vscode\`, \`open notepad\`)\n- \`clear\` — Reset chat history\n- Press \`Ctrl + Shift + Space\` anywhere to toggle.`,
    };
  }

  // 5. Unmatched: Forward to Cloud / Local AI
  return {
    handled: false,
  };
}
