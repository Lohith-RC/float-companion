import { create } from 'zustand';
import { GitHubUserProfile } from '../types/electron';
import { loadSettings, saveSettings } from '../db/indexedDB';
import { useToastStore } from './useToastStore';
import { sounds } from '../services/soundEffects';

interface DeviceFlowState {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
  expiresAt: number;
}

interface AuthState {
  user: GitHubUserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isPolling: boolean;
  isModalOpen: boolean;
  customClientId: string;
  deviceFlow: DeviceFlowState | null;

  // Actions
  init: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  setCustomClientId: (clientId: string) => void;
  startDeviceFlow: () => Promise<void>;
  cancelDeviceFlow: () => void;
  loginWithToken: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

let pollTimer: ReturnType<typeof setTimeout> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isPolling: false,
  isModalOpen: false,
  customClientId: '',
  deviceFlow: null,

  init: async () => {
    try {
      const settings = await loadSettings();
      if (settings.githubClientId) {
        set({ customClientId: settings.githubClientId });
      }

      // Check Electron safeStorage DPAPI vault for cached token
      let token: string | null = null;
      if (window.electronAPI?.store?.getSecureKey) {
        const res = await window.electronAPI.store.getSecureKey('github_token');
        token = res.key || null;
      }

      // Fallback: check localStorage for web simulator mode
      if (!token && typeof localStorage !== 'undefined') {
        token = localStorage.getItem('fc_github_token');
      }

      if (token && window.electronAPI?.auth?.getGithubProfile) {
        set({ isLoading: true, accessToken: token });
        const res = await window.electronAPI.auth.getGithubProfile(token);
        if (res.success && res.profile) {
          set({ user: res.profile, isLoading: false });
          // Save hydrated profile to local settings
          await saveSettings({ ...settings, githubUser: res.profile });
          return;
        }
      }

      // If token verification failed or no token, fall back to cached profile
      if (settings.githubUser) {
        set({ user: settings.githubUser, accessToken: token, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  openModal: () => {
    set({ isModalOpen: true });
    // Automatically trigger device flow when modal opens if not already authenticated
    if (!get().user && !get().deviceFlow && !get().isPolling) {
      get().startDeviceFlow();
    }
  },

  closeModal: () => {
    get().cancelDeviceFlow();
    set({ isModalOpen: false });
  },

  setCustomClientId: async (clientId: string) => {
    const trimmed = clientId.trim();
    set({ customClientId: trimmed });
    const settings = await loadSettings();
    await saveSettings({ ...settings, githubClientId: trimmed });
  },

  cancelDeviceFlow: () => {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    set({ isPolling: false, deviceFlow: null, isLoading: false });
  },

  startDeviceFlow: async () => {
    get().cancelDeviceFlow();

    set({ isLoading: true });
    const { customClientId } = get();

    try {
      if (!window.electronAPI?.auth?.startGithubDeviceFlow) {
        // Web simulator mode notice
        set({ isLoading: false });
        useToastStore.getState().showToast(
          'GitHub OAuth Device Flow is native to the desktop app. Enter Personal Access Token below.',
          'info'
        );
        return;
      }

      const res = await window.electronAPI.auth.startGithubDeviceFlow(customClientId || undefined);

      if (!res.success || !res.deviceCode || !res.userCode) {
        set({ isLoading: false });
        useToastStore.getState().showToast(
          res.error || 'Failed to start GitHub authorization flow',
          'error'
        );
        return;
      }

      const flowState: DeviceFlowState = {
        deviceCode: res.deviceCode,
        userCode: res.userCode,
        verificationUri: res.verificationUri || 'https://github.com/login/device',
        expiresIn: res.expiresIn || 900,
        interval: Math.max(5, res.interval || 5),
        expiresAt: Date.now() + (res.expiresIn || 900) * 1000,
      };

      set({
        deviceFlow: flowState,
        isLoading: false,
        isPolling: true,
      });

      sounds.playChime();

      // Begin polling for user approval
      const poll = async () => {
        const state = get();
        if (!state.isPolling || !state.deviceFlow) return;

        if (Date.now() > state.deviceFlow.expiresAt) {
          get().cancelDeviceFlow();
          useToastStore.getState().showToast('GitHub authorization timed out. Please try again.', 'warning');
          return;
        }

        const pollRes = await window.electronAPI!.auth!.pollGithubToken(
          customClientId || '',
          state.deviceFlow.deviceCode
        );

        if (pollRes.success && pollRes.accessToken) {
          // Authorized!
          get().cancelDeviceFlow();
          await get().loginWithToken(pollRes.accessToken);
          return;
        }

        if (pollRes.pending) {
          const nextInterval = (pollRes.slowDown ? state.deviceFlow.interval + 5 : state.deviceFlow.interval) * 1000;
          pollTimer = setTimeout(poll, nextInterval);
          return;
        }

        // An explicit error occurred
        get().cancelDeviceFlow();
        useToastStore.getState().showToast(pollRes.error || 'GitHub authorization failed', 'error');
      };

      // Initial poll delay
      pollTimer = setTimeout(poll, flowState.interval * 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error starting GitHub authorization';
      set({ isLoading: false });
      useToastStore.getState().showToast(msg, 'error');
    }
  },

  loginWithToken: async (token: string) => {
    const cleanToken = token.trim();
    if (!cleanToken) return false;

    set({ isLoading: true });

    try {
      let profile: GitHubUserProfile | null = null;

      if (window.electronAPI?.auth?.getGithubProfile) {
        const res = await window.electronAPI.auth.getGithubProfile(cleanToken);
        if (res.success && res.profile) {
          profile = res.profile;
        } else {
          throw new Error(res.error || 'Failed to fetch GitHub user profile');
        }
      } else {
        // Fallback for web simulator: direct browser fetch
        const res = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (!res.ok) throw new Error(`GitHub error (${res.status})`);
        const data = await res.json();
        profile = {
          login: data.login,
          name: data.name || data.login,
          avatarUrl: data.avatar_url,
          htmlUrl: data.html_url,
          bio: data.bio || '',
          publicRepos: data.public_repos || 0,
          email: data.email || '',
        };
      }

      // Persist token in DPAPI hardware vault
      if (window.electronAPI?.store?.setSecureKey) {
        await window.electronAPI.store.setSecureKey('github_token', cleanToken);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fc_github_token', cleanToken);
      }

      // Persist profile in IndexedDB
      const settings = await loadSettings();
      await saveSettings({ ...settings, githubUser: profile });

      set({
        user: profile,
        accessToken: cleanToken,
        isLoading: false,
        isModalOpen: false,
      });

      sounds.playChime();
      useToastStore.getState().showToast(
        `Welcome, @${profile.login}! GitHub account connected.`,
        'success'
      );
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to authenticate with GitHub';
      set({ isLoading: false });
      useToastStore.getState().showToast(msg, 'error');
      return false;
    }
  },

  logout: async () => {
    get().cancelDeviceFlow();

    // Clear DPAPI safeStorage
    if (window.electronAPI?.store?.setSecureKey) {
      await window.electronAPI.store.setSecureKey('github_token', '');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('fc_github_token');
    }

    // Clear IndexedDB profile
    const settings = await loadSettings();
    await saveSettings({ ...settings, githubUser: null });

    set({
      user: null,
      accessToken: null,
      isLoading: false,
      isModalOpen: false,
    });

    sounds.playClick();
    useToastStore.getState().showToast('Disconnected from GitHub', 'info');
  },
}));
