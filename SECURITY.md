# Security Policy & Defense-in-Depth Kernel — FloatCompanion

**Document Version:** 1.0.0  
**Scope:** Threat Model, Shell Command Sanitization, Whitelist Rules & Credential Storage  

---

## 1. Threat Model & Attack Vectors

Because FloatCompanion has native operating system execution capabilities, it must defend against:
1. **Prompt Injection:** Malicious inputs from external websites or documents attempting to trick the LLM into generating destructive shell commands (`rmdir /s /q C:\`).
2. **Command Obfuscation:** Shell scripts utilizing variable expansion, base64 encoding, or backtick escaping to disguise dangerous commands.
3. **Privilege Escalation:** Running commands that attempt to alter system security policies (`Set-ExecutionPolicy Unrestricted`) or modify credentials.

---

## 2. Multi-Tier Security Inspection Pipeline

```
Raw AI Suggested Command
         │
         ▼
[ Stage 1: De-obfuscation Engine ]
  • Remove backtick escapes (`)
  • Strip PowerShell inline comments (<# ... #>, #)
  • Resolve environment variables (%TEMP%, $env:APPDATA)
  • Decode nested Base64 encoded flags (-enc, -encodedCommand)
         │
         ▼
[ Stage 2: Dangerous Command Blacklist Filter ]
  • Immediate rejection if any blacklist keyword is matched
         │
         ▼
[ Stage 3: Whitelist & Parameter Validation ]
  • Command must match an approved action template
         │
         ▼
[ User Explicit Confirmation Modal ]
  • User sees exact command and must click "Execute"
         │
         ▼
[ OS PowerShell Stdin Execution ]
```

---

## 3. Blacklist of Explicitly Banned Patterns

Any command matching any pattern below is **aborted immediately with an IPC security alert**:

* **Filesystem Destruction:**
  * `Remove-Item -Recurse`, `rmdir /s /q`, `del /f /s /q`, `rm -rf /`
  * `Format-Volume`, `diskpart`, `clean`
* **Account & Permission Alterations:**
  * `net user`, `net localgroup administrators`
  * `Set-ExecutionPolicy`, `chown`, `chmod 777`
* **Network & Registry Modification:**
  * `reg add`, `reg delete`, `New-ItemProperty HKLM:`
  * `Invoke-WebRequest -OutFile ... | iex`
  * Piping untrusted web content directly to execution (`curl ... | sh`).

---

## 4. Approved Whitelist Action Templates

Only specific, pre-verified commands are allowed for programmatic automation:

1. **System Hardware Telemetry:**
   * `Get-CimInstance Win32_OperatingSystem`
   * `Get-CimInstance Win32_LogicalDisk`
   * `Get-Process` (read-only)
2. **Application Launchers:**
   * `Start-Process <verified_executable_path>`
3. **Window Focus Management:**
   * Win32 `SetForegroundWindow` API calls via embedded C# interop.

---

## 5. Credential & Key Storage Security

* **No Plaintext Environment Commits:** `.env` is permanently included in `.gitignore`.
* **Renderer Isolation:** The Renderer process never has access to the filesystem where keys are stored. Keys are requested on-demand through secured IPC channels or held in OS secure credential storage (Windows Credential Manager / macOS Keychain).
