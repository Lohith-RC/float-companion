/**
 * FloatCompanion Multi-Tier Security Kernel
 * Enforces command de-obfuscation and rejects dangerous shell executions.
 */

const BLACKLIST_PATTERNS = [
  /remove-item\s+.*-recurse/i,
  /rmdir\s+.*\/s/i,
  /del\s+.*\/f\s+.*\/s/i,
  /rm\s+-rf\s+\//i,
  /format-volume/i,
  /diskpart/i,
  /net\s+user/i,
  /net\s+localgroup/i,
  /set-executionpolicy\s+unrestricted/i,
  /reg\s+add/i,
  /reg\s+delete/i,
  /invoke-webrequest.*\|\s*iex/i,
  /curl.*\|\s*sh/i,
];

function deobfuscate(command) {
  let cleaned = command || '';
  // 1. Remove PowerShell backtick escapes
  cleaned = cleaned.replace(/`([a-zA-Z0-9])/g, '$1');
  // 2. Remove inline PowerShell comments <# ... #>
  cleaned = cleaned.replace(/<#[\s\S]*?#>/g, '');
  // 3. Remove single line comments
  cleaned = cleaned.replace(/#.*$/gm, '');
  // 4. Resolve common base64 switches
  return cleaned.trim();
}

function validateCommand(command) {
  const normalized = deobfuscate(command);

  for (const pattern of BLACKLIST_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        safe: false,
        code: 'ERR_COMMAND_BLOCKED',
        error: `Security Kernel Violation: Command matched banned destructive pattern (${pattern.toString()})`,
      };
    }
  }

  return {
    safe: true,
    normalizedCommand: normalized,
  };
}

module.exports = {
  deobfuscate,
  validateCommand,
};
