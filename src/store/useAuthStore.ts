import { create } from 'zustand';
import { AuthUserProfile } from '../types/electron';
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
  user: AuthUserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isPolling: boolean;
  isGoogleLoading: boolean;
  isMicrosoftLoading: boolean;
  isModalOpen: boolean;
  activeAuthTab: 'all' | 'github' | 'google' | 'microsoft';
  customClientId: string;
  customGoogleClientId: string;
  customMicrosoftClientId: string;
  deviceFlow: DeviceFlowState | null;

  // Actions
  init: () => Promise<void>;
  openModal: (initialTab?: 'all' | 'github' | 'google' | 'microsoft') => void;
  closeModal: () => void;
  setActiveAuthTab: (tab: 'all' | 'github' | 'google' | 'microsoft') => void;
  setCustomClientId: (clientId: string) => void;
  setCustomGoogleClientId: (clientId: string) => void;
  setCustomMicrosoftClientId: (clientId: string) => void;
  startDeviceFlow: () => Promise<void>;
  cancelDeviceFlow: () => void;
  loginWithToken: (token: string) => Promise<boolean>;
  startGoogleOAuth: () => Promise<boolean>;
  cancelGoogleOAuth: () => void;
  startMicrosoftOAuth: () => Promise<boolean>;
  cancelMicrosoftOAuth: () => void;
  logout: () => Promise<void>;
}

let pollTimer: ReturnType<typeof setTimeout> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isPolling: false,
  isGoogleLoading: false,
  isMicrosoftLoading: false,
  isModalOpen: false,
  activeAuthTab: 'all',
  customClientId: '',
  customGoogleClientId: '',
  customMicrosoftClientId: '',
  deviceFlow: null,

  init: async () => {
    try {
      const settings = await loadSettings();
      if (settings.githubClientId) set({ customClientId: settings.githubClientId });
      if (settings.googleClientId) set({ customGoogleClientId: settings.googleClientId });
      if (settings.microsoftClientId) set({ customMicrosoftClientId: settings.microsoftClientId });

      // Check for cached profile
      const cachedProfile = settings.authUser || (settings.githubUser ? {
        provider: 'github' as const,
        id: settings.githubUser.login,
        login: settings.githubUser.login,
        name: settings.githubUser.name,
        avatarUrl: settings.githubUser.avatarUrl,
        htmlUrl: settings.githubUser.htmlUrl,
        bio: settings.githubUser.bio,
        publicRepos: settings.githubUser.publicRepos,
        email: settings.githubUser.email,
      } : null);

      let token: string | null = null;
      if (window.electronAPI?.store?.getSecureKey && cachedProfile) {
        if (cachedProfile.provider === 'google') {
          const res = await window.electronAPI.store.getSecureKey('google_token');
          token = res.key || null;
        } else if (cachedProfile.provider === 'microsoft') {
          const res = await window.electronAPI.store.getSecureKey('microsoft_token');
          token = res.key || null;
        } else {
          const res = await window.electronAPI.store.getSecureKey('github_token');
          token = res.key || null;
        }
      }

      if (!token && typeof localStorage !== 'undefined') {
        token = localStorage.getItem('fc_auth_token');
      }

      if (cachedProfile) {
        set({ user: cachedProfile, accessToken: token, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  openModal: (initialTab = 'all') => {
    set({ isModalOpen: true, activeAuthTab: initialTab });
  },

  closeModal: () => {
    get().cancelDeviceFlow();
    get().cancelGoogleOAuth();
    get().cancelMicrosoftOAuth();
    set({ isModalOpen: false, isGoogleLoading: false, isMicrosoftLoading: false });
  },

  setActiveAuthTab: (tab) => {
    set({ activeAuthTab: tab });
  },

  setCustomClientId: async (clientId: string) => {
    const trimmed = clientId.trim();
    set({ customClientId: trimmed });
    const settings = await loadSettings();
    await saveSettings({ ...settings, githubClientId: trimmed });
  },

  setCustomGoogleClientId: async (clientId: string) => {
    const trimmed = clientId.trim();
    set({ customGoogleClientId: trimmed });
    const settings = await loadSettings();
    await saveSettings({ ...settings, googleClientId: trimmed });
  },

  setCustomMicrosoftClientId: async (clientId: string) => {
    const trimmed = clientId.trim();
    set({ customMicrosoftClientId: trimmed });
    const settings = await loadSettings();
    await saveSettings({ ...settings, microsoftClientId: trimmed });
  },

  cancelDeviceFlow: () => {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    set({ isPolling: false, deviceFlow: null, isLoading: false });
  },

  cancelGoogleOAuth: () => {
    if (window.electronAPI?.auth?.cancelGoogleOAuth) {
      window.electronAPI.auth.cancelGoogleOAuth().catch(() => {});
    }
    set({ isGoogleLoading: false });
  },

  cancelMicrosoftOAuth: () => {
    if (window.electronAPI?.auth?.cancelMicrosoftOAuth) {
      window.electronAPI.auth.cancelMicrosoftOAuth().catch(() => {});
    }
    set({ isMicrosoftLoading: false });
  },

  // ==========================================================================
  // MICROSOFT OAUTH FLOW
  // ==========================================================================
  startMicrosoftOAuth: async () => {
    const { customMicrosoftClientId } = get();
    set({ isMicrosoftLoading: true });

    try {
      if (!window.electronAPI?.auth?.startMicrosoftOAuth) {
        set({ isMicrosoftLoading: false });
        useToastStore.getState().showToast(
          'Microsoft OAuth loopback is native to desktop. Run npm run dev in Electron.',
          'info'
        );
        return false;
      }

      useToastStore.getState().showToast('Opening Microsoft sign-in in your browser...', 'info');
      sounds.playClick();

      const res = await window.electronAPI.auth.startMicrosoftOAuth(customMicrosoftClientId || undefined);

      if (!res.success || !res.profile) {
        set({ isMicrosoftLoading: false });
        useToastStore.getState().showToast(
          res.error || 'Microsoft sign-in was cancelled or encountered an error',
          'error'
        );
        return false;
      }

      const profile: AuthUserProfile = {
        provider: 'microsoft',
        id: res.profile.id,
        login: res.profile.login || 'ms_user',
        name: res.profile.name,
        avatarUrl: res.profile.avatarUrl,
        email: res.profile.email,
      };

      if (res.accessToken && window.electronAPI?.store?.setSecureKey) {
        await window.electronAPI.store.setSecureKey('microsoft_token', res.accessToken);
      }
      if (res.accessToken && typeof localStorage !== 'undefined') {
        localStorage.setItem('fc_auth_token', res.accessToken);
      }

      const settings = await loadSettings();
      await saveSettings({ ...settings, authUser: profile });

      set({
        user: profile,
        accessToken: res.accessToken || null,
        isMicrosoftLoading: false,
        isModalOpen: false,
      });

      sounds.playChime();
      useToastStore.getState().showToast(
        `Signed in as ${profile.name} via Microsoft!`,
        'success'
      );
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microsoft authentication failed';
      set({ isMicrosoftLoading: false });
      useToastStore.getState().showToast(msg, 'error');
      return false;
    }
  },

  // ==========================================================================
  // GOOGLE OAUTH FLOW
  // ==========================================================================
  startGoogleOAuth: async () => {
    const { customGoogleClientId } = get();
    set({ isGoogleLoading: true });

    try {
      if (!window.electronAPI?.auth?.startGoogleOAuth) {
        set({ isGoogleLoading: false });
        useToastStore.getState().showToast(
          'Google OAuth loopback is native to desktop. Run npm run dev in Electron.',
          'info'
        );
        return false;
      }

      useToastStore.getState().showToast('Opening Google sign-in in your browser...', 'info');
      sounds.playClick();

      const res = await window.electronAPI.auth.startGoogleOAuth(customGoogleClientId || undefined);

      if (!res.success || !res.profile) {
        set({ isGoogleLoading: false });
        useToastStore.getState().showToast(
          res.error || 'Google sign-in was cancelled or encountered an error',
          'error'
        );
        return false;
      }

      const profile: AuthUserProfile = {
        provider: 'google',
        id: res.profile.id,
        login: res.profile.login || 'google_user',
        name: res.profile.name,
        avatarUrl: res.profile.avatarUrl,
        email: res.profile.email,
      };

      if (res.accessToken && window.electronAPI?.store?.setSecureKey) {
        await window.electronAPI.store.setSecureKey('google_token', res.accessToken);
      }
      if (res.accessToken && typeof localStorage !== 'undefined') {
        localStorage.setItem('fc_auth_token', res.accessToken);
      }

      const settings = await loadSettings();
      await saveSettings({ ...settings, authUser: profile });

      set({
        user: profile,
        accessToken: res.accessToken || null,
        isGoogleLoading: false,
        isModalOpen: false,
      });

      sounds.playChime();
      useToastStore.getState().showToast(
        `Signed in as ${profile.name} via Google!`,
        'success'
      );
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      set({ isGoogleLoading: false });
      useToastStore.getState().showToast(msg, 'error');
      return false;
    }
  },

  // ==========================================================================
  // GITHUB OAUTH FLOW
  // ==========================================================================
  startDeviceFlow: async () => {
    get().cancelDeviceFlow();
    set({ isLoading: true });
    const { customClientId } = get();

    try {
      if (!window.electronAPI?.auth?.startGithubDeviceFlow) {
        set({ isLoading: false });
        useToastStore.getState().showToast(
          'GitHub OAuth Device Flow is native to desktop. Enter token below.',
          'info'
        );
        return;
      }

      const res = await window.electronAPI.auth.startGithubDeviceFlow(customClientId || undefined);

      if (!res.success || !res.deviceCode || !res.userCode) {
        set({ isLoading: false });
        useToastStore.getState().showToast(
          res.error || 'To use Device Flow, configure your Client ID or use 1-Click Token below.',
          'info'
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
          get().cancelDeviceFlow();
          await get().loginWithToken(pollRes.accessToken);
          return;
        }

        if (pollRes.pending) {
          const nextInterval = (pollRes.slowDown ? state.deviceFlow.interval + 5 : state.deviceFlow.interval) * 1000;
          pollTimer = setTimeout(poll, nextInterval);
          return;
        }

        get().cancelDeviceFlow();
        useToastStore.getState().showToast(pollRes.error || 'GitHub authorization failed', 'error');
      };

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
      let profile: AuthUserProfile | null = null;

      if (window.electronAPI?.auth?.getGithubProfile) {
        const res = await window.electronAPI.auth.getGithubProfile(cleanToken);
        if (res.success && res.profile) {
          profile = {
            ...res.profile,
            provider: 'github',
          };
        } else {
          throw new Error(res.error || 'Failed to fetch GitHub profile');
        }
      } else {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (!res.ok) throw new Error(`GitHub error (${res.status})`);
        const data = await res.json();
        profile = {
          provider: 'github',
          id: String(data.id || data.login),
          login: data.login,
          name: data.name || data.login,
          avatarUrl: data.avatar_url,
          htmlUrl: data.html_url,
          bio: data.bio || '',
          publicRepos: data.public_repos || 0,
          email: data.email || '',
        };
      }

      if (window.electronAPI?.store?.setSecureKey) {
        await window.electronAPI.store.setSecureKey('github_token', cleanToken);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fc_auth_token', cleanToken);
      }

      const settings = await loadSettings();
      await saveSettings({ ...settings, authUser: profile, githubUser: profile as any });

      set({
        user: profile,
        accessToken: cleanToken,
        isLoading: false,
        isModalOpen: false,
      });

      sounds.playChime();
      useToastStore.getState().showToast(
        `Welcome, @${profile.login}! GitHub connected.`,
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
    get().cancelGoogleOAuth();
    get().cancelMicrosoftOAuth();

    if (window.electronAPI?.store?.setSecureKey) {
      await window.electronAPI.store.setSecureKey('github_token', '');
      await window.electronAPI.store.setSecureKey('google_token', '');
      await window.electronAPI.store.setSecureKey('microsoft_token', '');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('fc_auth_token');
    }

    const settings = await loadSettings();
    await saveSettings({ ...settings, authUser: null, githubUser: null });

    set({
      user: null,
      accessToken: null,
      isLoading: false,
      isGoogleLoading: false,
      isMicrosoftLoading: false,
      isModalOpen: false,
    });

    sounds.playClick();
    useToastStore.getState().showToast('Disconnected account', 'info');
  },
}));
