/**
 * FloatCompanion Production IPC Validation Layer
 * Enforces strict runtime schema validation on all messages crossing the contextBridge boundary.
 * Prevents main-process crashes, payload corruption, and prototype pollution.
 */

function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Validates window resize payloads
 */
function validateResizePayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, error: 'Resize payload must be an object' };
  }
  const { width, height, mode } = payload;
  if (width !== undefined && (typeof width !== 'number' || width < 0 || width > 7680)) {
    return { valid: false, error: 'Invalid width dimension' };
  }
  if (height !== undefined && (typeof height !== 'number' || height < 0 || height > 4320)) {
    return { valid: false, error: 'Invalid height dimension' };
  }
  if (mode !== undefined && !['orb', 'tray', 'canvas', 'custom'].includes(mode)) {
    return { valid: false, error: 'Invalid window mode' };
  }
  return { valid: true };
}

/**
 * Validates focus session initiation payloads
 */
function validateFocusSessionPayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, error: 'Focus session payload must be an object' };
  }
  const { durationMinutes, taskTitle, distractionBlacklist } = payload;

  if (typeof durationMinutes !== 'number' || durationMinutes < 1 || durationMinutes > 240) {
    return { valid: false, error: 'durationMinutes must be between 1 and 240' };
  }
  if (typeof taskTitle !== 'string' || taskTitle.length > 120) {
    return { valid: false, error: 'taskTitle must be string under 120 characters' };
  }
  if (distractionBlacklist !== undefined) {
    if (!Array.isArray(distractionBlacklist) || distractionBlacklist.length > 100) {
      return { valid: false, error: 'distractionBlacklist must be an array of at most 100 items' };
    }
    for (const item of distractionBlacklist) {
      if (typeof item !== 'string' || item.length > 64) {
        return { valid: false, error: 'Blacklist items must be strings under 64 characters' };
      }
    }
  }
  return { valid: true };
}

/**
 * Validates secure key storage payloads
 */
function validateSecureKeyPayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, error: 'Key payload must be an object' };
  }
  const { keyName, keyValue } = payload;
  if (!keyName || typeof keyName !== 'string' || !/^[a-zA-Z0-9_\-]{1,32}$/.test(keyName)) {
    return { valid: false, error: 'Invalid keyName format (alphanumeric, max 32 chars)' };
  }
  if (keyValue !== undefined && (typeof keyValue !== 'string' || keyValue.length > 1024)) {
    return { valid: false, error: 'keyValue exceeds maximum length of 1024 chars' };
  }
  return { valid: true };
}

module.exports = {
  validateResizePayload,
  validateFocusSessionPayload,
  validateSecureKeyPayload,
};
