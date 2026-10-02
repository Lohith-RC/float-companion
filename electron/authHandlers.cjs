const { ipcMain, shell } = require('electron');
const http = require('http');
const crypto = require('crypto');
const { URL, URLSearchParams } = require('url');

// Default public client ID for FloatCompanion (free GitHub OAuth device flow)
const DEFAULT_GITHUB_CLIENT_ID = 'Ov23liZ08jT6F4zV2pQe';

// Default Google OAuth Client ID fallback (for Desktop App / Installed Application)
const DEFAULT_GOOGLE_CLIENT_ID = '60136653249-1t8c567jckhsd19v9qf47f2hnd688qg5.apps.googleusercontent.com';

// Default Microsoft Identity Client ID fallback (for Desktop / Mobile Application)
const DEFAULT_MICROSOFT_CLIENT_ID = '9ba1c9d2-45e0-47b2-a42e-13c5ee7e5f9a';

let activeGoogleServer = null;
let googleTimeout = null;

let activeMicrosoftServer = null;
let microsoftTimeout = null;

/**
 * Registers multi-provider OAuth (GitHub + Google + Microsoft) IPC handlers.
 * 100% Free, serverless, and privacy-first desktop authentication.
 */
function registerAuthHandlers() {
  // ============================================================================
  // 1. GITHUB OAUTH (Device Authorization Flow RFC 8628)
  // ============================================================================

  ipcMain.handle('auth:github-start-device-flow', async (_event, payload) => {
    try {
      const clientId = (payload && payload.clientId && payload.clientId.trim()) || DEFAULT_GITHUB_CLIENT_ID;
      const response = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FloatCompanion-Desktop-App',
        },
        body: JSON.stringify({
          client_id: clientId,
          scope: 'read:user user:email',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `GitHub API error (${response.status}): ${errorText}` };
      }

      const data = await response.json();
      return {
        success: true,
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri || 'https://github.com/login/device',
        expiresIn: data.expires_in,
        interval: data.interval || 5,
        clientId: clientId,
      };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to initiate GitHub Device Flow' };
    }
  });

  ipcMain.handle('auth:github-poll-token', async (_event, payload) => {
    try {
      const { clientId, deviceCode } = payload || {};
      if (!deviceCode) {
        return { success: false, error: 'Device code is required' };
      }

      const activeClientId = clientId || DEFAULT_GITHUB_CLIENT_ID;
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FloatCompanion-Desktop-App',
        },
        body: JSON.stringify({
          client_id: activeClientId,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Polling HTTP error: ${response.status}` };
      }

      const data = await response.json();

      if (data.access_token) {
        return {
          success: true,
          accessToken: data.access_token,
          tokenType: data.token_type,
          scope: data.scope,
        };
      }

      if (data.error === 'authorization_pending') {
        return { success: true, pending: true };
      }

      if (data.error === 'slow_down') {
        return { success: true, pending: true, slowDown: true };
      }

      if (data.error === 'expired_token') {
        return { success: false, error: 'Authorization code has expired. Please try again.' };
      }

      if (data.error === 'access_denied') {
        return { success: false, error: 'Authorization was cancelled by user.' };
      }

      return { success: false, error: data.error_description || data.error || 'Unknown authorization state' };
    } catch (err) {
      return { success: false, error: err.message || 'Error polling GitHub authorization token' };
    }
  });

  ipcMain.handle('auth:github-get-profile', async (_event, payload) => {
    try {
      const token = payload && payload.token;
      if (!token) {
        return { success: false, error: 'Access token is required' };
      }

      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'FloatCompanion-Desktop-App',
        },
      });

      if (!response.ok) {
        return { success: false, error: `GitHub profile error: ${response.status}` };
      }

      const user = await response.json();
      return {
        success: true,
        profile: {
          provider: 'github',
          id: String(user.id || user.login),
          login: user.login,
          name: user.name || user.login,
          avatarUrl: user.avatar_url,
          htmlUrl: user.html_url,
          bio: user.bio || '',
          publicRepos: user.public_repos || 0,
          email: user.email || '',
        },
      };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch GitHub profile' };
    }
  });

  // ============================================================================
  // 2. GOOGLE OAUTH 2.0 (RFC 8252 Loopback Flow with PKCE)
  // ============================================================================

  ipcMain.handle('auth:google-start-flow', async (_event, payload) => {
    return new Promise((resolve) => {
      try {
        if (activeGoogleServer) {
          try { activeGoogleServer.close(); } catch {}
          activeGoogleServer = null;
        }
        if (googleTimeout) {
          clearTimeout(googleTimeout);
          googleTimeout = null;
        }

        const clientId = (payload && payload.clientId && payload.clientId.trim()) || DEFAULT_GOOGLE_CLIENT_ID;
        const codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

        const server = http.createServer(async (req, res) => {
          try {
            const reqUrl = new URL(req.url, `http://${req.headers.host}`);
            if (reqUrl.pathname !== '/callback') {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Not Found');
              return;
            }

            const error = reqUrl.searchParams.get('error');
            const code = reqUrl.searchParams.get('code');

            if (error) {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <!DOCTYPE html>
                <html>
                <body style="background:#090d16;color:#f87171;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                  <div style="text-align:center;padding:32px;background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(255,255,255,0.1);max-width:400px;">
                    <h2>❌ Google Authorization Cancelled</h2>
                    <p style="color:#94a3b8;font-size:13px;">${error}</p>
                    <p style="color:#64748b;font-size:12px;">You can close this tab and return to FloatCompanion.</p>
                  </div>
                </body>
                </html>
              `);
              server.close();
              activeGoogleServer = null;
              resolve({ success: false, error: `Google OAuth error: ${error}` });
              return;
            }

            if (!code) {
              res.writeHead(400, { 'Content-Type': 'text/plain' });
              res.end('Missing code parameter');
              server.close();
              activeGoogleServer = null;
              resolve({ success: false, error: 'No authorization code received' });
              return;
            }

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"><title>FloatCompanion - Authorized</title></head>
              <body style="background:#090d16;color:#38bdf8;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                <div style="text-align:center;padding:40px 32px;background:rgba(15,23,42,0.85);border-radius:20px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 50px rgba(0,0,0,0.5);max-width:440px;">
                  <div style="font-size:36px;margin-bottom:12px;">✨</div>
                  <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fff;">Connected with Google</h2>
                  <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0 0 16px;">
                    Your Google account is now linked to <strong>FloatCompanion</strong>.
                  </p>
                  <span style="font-size:11px;color:#38bdf8;background:rgba(56,189,248,0.1);padding:4px 12px;border-radius:20px;border:1px solid rgba(56,189,248,0.25);">
                    ✓ Secure Handshake Complete
                  </span>
                  <p style="color:#64748b;font-size:11px;margin-top:20px;">You can safely close this browser window.</p>
                </div>
                <script>setTimeout(function(){ window.close(); }, 2500);</script>
              </body>
              </html>
            `);

            server.close();
            activeGoogleServer = null;

            const redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
            const tokenParams = new URLSearchParams({
              client_id: clientId,
              code: code,
              code_verifier: codeVerifier,
              grant_type: 'authorization_code',
              redirect_uri: redirectUri,
            });

            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: tokenParams.toString(),
            });

            if (!tokenRes.ok) {
              const errBody = await tokenRes.text();
              resolve({ success: false, error: `Google Token exchange failed (${tokenRes.status}): ${errBody}` });
              return;
            }

            const tokenData = await tokenRes.json();
            const accessToken = tokenData.access_token;

            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { 'Authorization': `Bearer ${accessToken}` },
            });

            if (!userRes.ok) {
              resolve({ success: false, error: `Failed to fetch Google user profile (${userRes.status})` });
              return;
            }

            const userData = await userRes.json();
            resolve({
              success: true,
              accessToken: accessToken,
              profile: {
                provider: 'google',
                id: userData.sub,
                name: userData.name || userData.given_name || 'Google User',
                email: userData.email || '',
                avatarUrl: userData.picture || '',
                login: userData.email ? userData.email.split('@')[0] : 'google_user',
              },
            });
          } catch (err) {
            resolve({ success: false, error: err.message || 'Error processing Google callback' });
          }
        });

        server.listen(0, '127.0.0.1', async () => {
          const port = server.address().port;
          activeGoogleServer = server;

          const redirectUri = `http://127.0.0.1:${port}/callback`;
          const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('openid profile email')}&` +
            `code_challenge=${encodeURIComponent(codeChallenge)}&` +
            `code_challenge_method=S256&` +
            `access_type=offline&` +
            `prompt=consent`;

          await shell.openExternal(googleAuthUrl);

          googleTimeout = setTimeout(() => {
            if (activeGoogleServer) {
              try { activeGoogleServer.close(); } catch {}
              activeGoogleServer = null;
              resolve({ success: false, error: 'Google sign-in timed out. Please try again.' });
            }
          }, 300000);
        });

        server.on('error', (err) => {
          resolve({ success: false, error: `Local loopback server error: ${err.message}` });
        });
      } catch (err) {
        resolve({ success: false, error: err.message || 'Failed to start Google sign-in' });
      }
    });
  });

  ipcMain.handle('auth:google-cancel', async () => {
    if (activeGoogleServer) {
      try { activeGoogleServer.close(); } catch {}
      activeGoogleServer = null;
    }
    if (googleTimeout) {
      clearTimeout(googleTimeout);
      googleTimeout = null;
    }
    return { success: true };
  });

  // ============================================================================
  // 3. MICROSOFT OAUTH 2.0 (RFC 8252 Loopback Flow with PKCE)
  // ============================================================================

  ipcMain.handle('auth:microsoft-start-flow', async (_event, payload) => {
    return new Promise((resolve) => {
      try {
        if (activeMicrosoftServer) {
          try { activeMicrosoftServer.close(); } catch {}
          activeMicrosoftServer = null;
        }
        if (microsoftTimeout) {
          clearTimeout(microsoftTimeout);
          microsoftTimeout = null;
        }

        const clientId = (payload && payload.clientId && payload.clientId.trim()) || DEFAULT_MICROSOFT_CLIENT_ID;
        const codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

        const server = http.createServer(async (req, res) => {
          try {
            const reqUrl = new URL(req.url, `http://${req.headers.host}`);
            if (reqUrl.pathname !== '/callback') {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Not Found');
              return;
            }

            const error = reqUrl.searchParams.get('error');
            const code = reqUrl.searchParams.get('code');

            if (error) {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <!DOCTYPE html>
                <html>
                <body style="background:#090d16;color:#f87171;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                  <div style="text-align:center;padding:32px;background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(255,255,255,0.1);max-width:400px;">
                    <h2>❌ Microsoft Authorization Cancelled</h2>
                    <p style="color:#94a3b8;font-size:13px;">${error}</p>
                    <p style="color:#64748b;font-size:12px;">You can close this tab and return to FloatCompanion.</p>
                  </div>
                </body>
                </html>
              `);
              server.close();
              activeMicrosoftServer = null;
              resolve({ success: false, error: `Microsoft OAuth error: ${error}` });
              return;
            }

            if (!code) {
              res.writeHead(400, { 'Content-Type': 'text/plain' });
              res.end('Missing code parameter');
              server.close();
              activeMicrosoftServer = null;
              resolve({ success: false, error: 'No authorization code received' });
              return;
            }

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"><title>FloatCompanion - Authorized</title></head>
              <body style="background:#090d16;color:#38bdf8;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                <div style="text-align:center;padding:40px 32px;background:rgba(15,23,42,0.85);border-radius:20px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 50px rgba(0,0,0,0.5);max-width:440px;">
                  <div style="font-size:36px;margin-bottom:12px;">🪟</div>
                  <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fff;">Connected with Microsoft</h2>
                  <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0 0 16px;">
                    Your Microsoft account is now linked to <strong>FloatCompanion</strong>.
                  </p>
                  <span style="font-size:11px;color:#0078d4;background:rgba(0,120,212,0.15);padding:4px 12px;border-radius:20px;border:1px solid rgba(0,120,212,0.3);">
                    ✓ Microsoft Identity Verified
                  </span>
                  <p style="color:#64748b;font-size:11px;margin-top:20px;">You can safely close this browser window.</p>
                </div>
                <script>setTimeout(function(){ window.close(); }, 2500);</script>
              </body>
              </html>
            `);

            server.close();
            activeMicrosoftServer = null;

            const redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
            const tokenParams = new URLSearchParams({
              client_id: clientId,
              code: code,
              code_verifier: codeVerifier,
              grant_type: 'authorization_code',
              redirect_uri: redirectUri,
            });

            const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: tokenParams.toString(),
            });

            if (!tokenRes.ok) {
              const errBody = await tokenRes.text();
              resolve({ success: false, error: `Microsoft Token exchange failed (${tokenRes.status}): ${errBody}` });
              return;
            }

            const tokenData = await tokenRes.json();
            const accessToken = tokenData.access_token;

            // Fetch Microsoft Graph Profile (/v1.0/me)
            const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
              headers: { 'Authorization': `Bearer ${accessToken}` },
            });

            if (!userRes.ok) {
              resolve({ success: false, error: `Failed to fetch Microsoft profile (${userRes.status})` });
              return;
            }

            const msUser = await userRes.json();
            const displayName = msUser.displayName || `${msUser.givenName || ''} ${msUser.surname || ''}`.trim() || 'Microsoft User';
            const email = msUser.mail || msUser.userPrincipalName || '';
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0078d4&color=fff&bold=true`;

            resolve({
              success: true,
              accessToken: accessToken,
              profile: {
                provider: 'microsoft',
                id: msUser.id,
                name: displayName,
                email: email,
                avatarUrl: avatarUrl,
                login: email ? email.split('@')[0] : 'ms_user',
              },
            });
          } catch (err) {
            resolve({ success: false, error: err.message || 'Error processing Microsoft callback' });
          }
        });

        server.listen(0, '127.0.0.1', async () => {
          const port = server.address().port;
          activeMicrosoftServer = server;

          const redirectUri = `http://127.0.0.1:${port}/callback`;
          const msAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_mode=query&` +
            `scope=${encodeURIComponent('openid profile email User.Read')}&` +
            `code_challenge=${encodeURIComponent(codeChallenge)}&` +
            `code_challenge_method=S256&` +
            `prompt=select_account`;

          await shell.openExternal(msAuthUrl);

          microsoftTimeout = setTimeout(() => {
            if (activeMicrosoftServer) {
              try { activeMicrosoftServer.close(); } catch {}
              activeMicrosoftServer = null;
              resolve({ success: false, error: 'Microsoft sign-in timed out. Please try again.' });
            }
          }, 300000);
        });

        server.on('error', (err) => {
          resolve({ success: false, error: `Microsoft loopback server error: ${err.message}` });
        });
      } catch (err) {
        resolve({ success: false, error: err.message || 'Failed to start Microsoft sign-in' });
      }
    });
  });

  ipcMain.handle('auth:microsoft-cancel', async () => {
    if (activeMicrosoftServer) {
      try { activeMicrosoftServer.close(); } catch {}
      activeMicrosoftServer = null;
    }
    if (microsoftTimeout) {
      clearTimeout(microsoftTimeout);
      microsoftTimeout = null;
    }
    return { success: true };
  });

  // ============================================================================
  // 4. COMMON UTILITIES
  // ============================================================================

  ipcMain.handle('auth:open-external', async (_event, payload) => {
    try {
      const url = payload && payload.url;
      if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: 'Invalid URL scheme' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = {
  registerAuthHandlers,
};
