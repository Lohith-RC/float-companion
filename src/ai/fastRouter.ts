export interface RouterResult {
  handled: boolean;
  reply?: string;
  action?: 'launched_app' | 'showed_stats' | 'local_time' | 'task_summary';
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
  if (
    p === 'ram' ||
    p.includes('ram in use') ||
    p.includes('memory') ||
    p.includes('ram usage') ||
    p.includes('hardware stats')
  ) {
    if (window.electronAPI?.os?.getStats) {
      try {
        const stats = await window.electronAPI.os.getStats();
        return {
          handled: true,
          action: 'showed_stats',
          reply: `📊 **Native System Hardware Status:**\n- **Memory In Use:** \`${stats.memory.usedGB} GB\` / \`${stats.memory.totalGB} GB\` (${stats.memory.usagePercent}%)\n- **Free RAM Available:** \`${stats.memory.freeGB} GB\`\n- **OS Platform:** \`${stats.platform}\`\n*(Zero-Token Native Hardware Query)*`,
        };
      } catch (err: any) {
        return {
          handled: true,
          reply: `⚠️ Failed to fetch native hardware stats: ${err.message}`,
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

  // 4. Quick Help
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
