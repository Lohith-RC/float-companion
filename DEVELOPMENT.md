# Development Guide & Tooling — FloatCompanion

**Document Version:** 1.0.0  
**Scope:** Local Development Environment, Transparent Window Debugging & Packaging  

---

## 1. Local Environment Setup

### Prerequisites
* **Node.js:** v20+ LTS recommended.
* **Package Manager:** `npm` or `pnpm`.
* **Platform Tools:**
  * Windows: PowerShell 5.1+ (built-in) or PowerShell 7 Core.
  * macOS: Xcode Command Line Tools.

### Initial Installation
```bash
# In the project directory
npm install
```

---

## 2. Running in Development Mode

FloatCompanion requires both Vite (for hot-module-reloading UI) and Electron (for the desktop shell) to run concurrently:

```bash
# Start both Vite dev server and Electron
npm run dev
```

### What Happens Under the Hood:
1. Vite starts on `http://localhost:5173`.
2. A utility (like `wait-on`) checks when port 5173 is accessible.
3. Electron launches pointing to `http://localhost:5173` with DevTools openable in detached mode.

---

## 3. Transparent Window Debugging Tips

Developing transparent, frameless Electron windows has several unique challenges:

### 1. Opening DevTools Without Breaking Window Geometry
Because the window is transparent and shaped as an Orb, docking DevTools inside the window will distort its shape. **Always open DevTools detached**:
```javascript
// In electron/main.cjs
mainWindow.webContents.openDevTools({ mode: 'detach' });
```

### 2. Preventing Black / White Window Resizing Glitches
When resizing an Electron transparent window on Windows, Chromium can temporarily paint black frames. Ensure you use these flags in `main.cjs`:
```javascript
app.commandLine.appendSwitch('enable-transparent-visuals');
app.disableHardwareAcceleration(); // Or configure background color '#00000000'
```

### 3. Click-Through Behavior for Transparent Canvas
To test click-through on the screen annotation canvas:
```typescript
window.electronAPI.window.setIgnoreMouse(true, { forward: true });
```

---

## 4. Useful Development Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "wait-on http://localhost:5173 && electron .",
    "build": "tsc && vite build",
    "pack:win": "npm run build && electron-builder --win",
    "pack:mac": "npm run build && electron-builder --mac",
    "lint": "eslint src/ --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## 5. Packaging & Distribution

To create standalone installers:
* **Windows NSIS Installer (`.exe`):**
  ```bash
  npm run pack:win
  ```
  Generates `dist/FloatCompanion-Setup-1.0.0.exe`.
* **macOS Disk Image (`.dmg`):**
  ```bash
  npm run pack:mac
  ```
  Generates `dist/FloatCompanion-1.0.0.dmg`.
