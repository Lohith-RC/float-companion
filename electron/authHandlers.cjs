const { ipcMain, shell } = require('electron');

// Default public client ID for FloatCompanion (free GitHub OAuth device flow)
// Users can also supply their own GitHub OAuth App Client ID in Settings
const DEFAULT_CLIENT_ID = 'Ov23liZ08jT6F4zV2pQe'; // Public Desktop App Client ID fallback

/**
 * Registers GitHub OAuth and authentication IPC handlers.
 * Uses RFC 8628 Device Authorization Flow - 100% serverless, secure for desktop apps.
 */
function registerAuthHandlers() {
  // 1. Request Device Code from GitHub
  ipcMain.handle('auth:github-start-device-flow', async (_event, payload) => {
    try {
      const clientId = (payload && payload.clientId && payload.clientId.trim()) || DEFAULT_CLIENT_ID;
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

  // 2. Poll GitHub for user authorization
  ipcMain.handle('auth:github-poll-token', async (_event, payload) => {
    try {
      const { clientId, deviceCode } = payload || {};
      if (!deviceCode) {
        return { success: false, error: 'Device code is required' };
      }

      const activeClientId = clientId || DEFAULT_CLIENT_ID;
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

  // 3. Fetch authenticated GitHub user profile
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

  // 4. Safely open external link (e.g. github.com/login/device)
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
