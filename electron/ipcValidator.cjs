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
  const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
  if (
    !keyName ||
    typeof keyName !== 'string' ||
    !/^[a-zA-Z0-9_\-]{1,32}$/.test(keyName) ||
    DANGEROUS_KEYS.includes(keyName.toLowerCase())
  ) {
    return { valid: false, error: 'Invalid or prohibited keyName format' };
  }
  if (keyValue !== undefined && (typeof keyValue !== 'string' || keyValue.length > 1024)) {
    return { valid: false, error: 'keyValue exceeds maximum length of 1024 chars' };
  }
  return { valid: true };
}

/**
 * Validates background text typing payloads
 */
function validateTypeTextPayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, error: 'typeText payload must be an object' };
  }
  const { text, delayMs } = payload;
  if (typeof text !== 'string' || text.length === 0 || text.length > 20000) {
    return { valid: false, error: 'text must be non-empty string under 20,000 characters' };
  }
  if (delayMs !== undefined && (typeof delayMs !== 'number' || delayMs < 0 || delayMs > 5000)) {
    return { valid: false, error: 'delayMs must be number between 0 and 5000' };
  }
  return { valid: true };
}

}

/**
 * High-Performance Token Bucket Rate Limiter
 * Guards high-privilege IPC channels against DoS, screen capture spam, and disk thrashing.
 */
class TokenBucketLimiter {
  constructor(capacity, refillTokensPerSec) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillTokensPerSec;
    this.lastRefill = Date.now();
  }

  tryConsume(tokens = 1) {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillRate);
    this.lastRefill = now;

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }
}

// 2 bursts, 0.67 tokens/sec (max 1 screenshot every 1.5s after burst)
const screenCaptureLimiter = new TokenBucketLimiter(2, 0.67);
// 10 bursts, 2 tokens/sec
const secureStoreLimiter = new TokenBucketLimiter(10, 2);
// 5 bursts, 1 token/sec
const appLaunchLimiter = new TokenBucketLimiter(5, 1);

function checkRateLimit(channel) {
  if (channel === 'os:capture-screen') {
    if (!screenCaptureLimiter.tryConsume(1)) {
      return { allowed: false, error: 'Rate limit: screen capture throttled to prevent GPU memory thrashing' };
    }
  } else if (channel === 'store:set-secure-key') {
    if (!secureStoreLimiter.tryConsume(1)) {
      return { allowed: false, error: 'Rate limit: secure credential storage operations throttled' };
    }
  } else if (channel === 'os:open-app') {
    if (!appLaunchLimiter.tryConsume(1)) {
      return { allowed: false, error: 'Rate limit: application launching throttled' };
    }
  }
  return { allowed: true };
}

module.exports = {
  validateResizePayload,
  validateFocusSessionPayload,
  validateSecureKeyPayload,
  validateTypeTextPayload,
  validateIgnoreMousePayload,
  checkRateLimit,
};

