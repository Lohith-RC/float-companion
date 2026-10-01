/**
 * FloatCompanion Hardware-Encrypted Key Store
 * Uses Electron's native safeStorage (Windows DPAPI / macOS Keychain).
 */

const { safeStorage, app } = require('electron');
const fs = require('fs');
const path = require('path');

class SecureStore {
  constructor() {
    this.storePath = path.join(app.getPath('userData'), 'vault.dat');
    this.cache = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath);
        if (safeStorage.isEncryptionAvailable()) {
          const decrypted = safeStorage.decryptString(raw);
          this.cache = JSON.parse(decrypted);
        } else {
          this.cache = JSON.parse(raw.toString('utf-8'));
        }
      }
    } catch (err) {
      console.warn('Secure store load warning:', err.message);
      this.cache = {};
    }
  }

  save() {
    try {
      const dataStr = JSON.stringify(this.cache);
      let payload;
      if (safeStorage.isEncryptionAvailable()) {
        payload = safeStorage.encryptString(dataStr);
      } else {
        payload = Buffer.from(dataStr, 'utf-8');
      }
      const tmpPath = `${this.storePath}.tmp`;
      fs.writeFileSync(tmpPath, payload);
      fs.renameSync(tmpPath, this.storePath);
      return true;
    } catch (err) {
      console.error('Failed to write to secure store:', err.message);
      return false;
    }
  }

  get(key) {
    return this.cache[key] || null;
  }

  set(key, value) {
    this.cache[key] = value;
    return this.save();
  }
}

module.exports = SecureStore;
