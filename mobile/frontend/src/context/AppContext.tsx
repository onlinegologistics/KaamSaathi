import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, TranslationKey } from '../i18n/translations';
import { AccountType, CategoryMeta, EmployerProfile, Gender, KycProfile, User, WalletProfile, WorkerProfile } from '../types';
import {
  BackendUser,
  BackendNotification,
  TokenPair,
  AuthIdentifier,
  listCategories as apiListCategories,
  loginWithPassword as apiLoginWithPassword,
  oauthLogin as apiOauthLogin,
  oauthRegister as apiOauthRegister,
  OAuthProvider,
  sendOtp as apiSendOtp,
  toCategoryMeta,
  verifyOtp as apiVerifyOtp,
  updateProfile as apiUpdateProfile,
  requestAccountTypeChange as apiRequestAccountTypeChange,
  cancelAccountTypeChangeRequest as apiCancelAccountTypeChangeRequest,
  getProfile as apiGetProfile,
  applyToJob as apiApplyToJob,
  cancelAcceptedApplication as apiCancelAcceptedApplication,
  addWalletMoney as apiAddWalletMoney,
  withdrawWalletMoney as apiWithdrawWalletMoney,
  listNotifications as apiListNotifications,
  markNotificationRead as apiMarkNotificationRead,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
  setAuthTokens,
  setAuthHandlers,
  getAuthTokens,
} from '../services/api';
import { categories as fallbackCategories, categoryGroups as fallbackCategoryGroups } from '../data/categories';
import { RemoteSettings, fetchRemoteSettings } from '../services/settings';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { isKycComplete, isProfileComplete } from '../utils/profileCompletion';

// expo-notifications throws just from being imported under plain Expo Go on Android
// (SDK 53+) — its remote-push setup runs as a module-level side effect with no opt-out.
// `StoreClient` covers both Expo Go and a real expo-dev-client build, so the extra
// `expoVersion` check is what narrows it down to "actually Expo Go" specifically.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient && Constants.expoVersion != null;

type NotificationsModule = typeof import('expo-notifications');
// eslint-disable-next-line @typescript-eslint/no-var-requires -- must be a lazy require, not a
// static import, so Expo Go never evaluates this module at all.
const Notifications: NotificationsModule | null = isExpoGo ? null : require('expo-notifications');

// Foreground display config — without this, a notification received while the app is open
// never shows a banner (silently dropped). No remote/Expo-push token setup here: that needs
// an EAS project id this app doesn't have configured yet. This only covers notifications
// triggered locally (see the `notification:new` socket listener below), which is enough
// while the app process is alive but not while it's fully closed/killed.
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
  }
}

export type UserMode = 'worker' | 'employer';

const TOKENS_STORAGE_KEY = 'kaamsaathi_tokens';

type ProfilePayload = {
  name: string;
  avatar?: string;
  email?: string;
  password?: string;
  accountType?: AccountType;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  dateOfBirth?: string;
  gender?: Gender;
  languages?: string[];
  education?: string;
  currentAddress?: string;
  workerProfile?: WorkerProfile;
  employerProfile?: EmployerProfile;
  kyc?: KycProfile;
  wallet?: WalletProfile;
  location?: { latitude: number; longitude: number; label: string };
};

const toUser = (backendUser: BackendUser): User => ({
  id: backendUser._id,
  name: backendUser.name ?? '',
  phone: backendUser.phone,
  avatar: backendUser.photoUrl || undefined,
  email: backendUser.email || undefined,
  accountType: backendUser.accountType,
  dateOfBirth: backendUser.dateOfBirth || undefined,
  gender: backendUser.gender,
  languages: backendUser.languages,
  education: backendUser.education || undefined,
  currentAddress: backendUser.currentAddress || undefined,
  workerProfile: backendUser.workerProfile,
  employerProfile: backendUser.employerProfile,
  kyc: backendUser.kyc,
  wallet: backendUser.wallet,
  accountTypeChange: backendUser.accountTypeChange,
  verified: backendUser.aadhaarVerification?.isVerified ?? false,
  rating: backendUser.ratingAverage,
  jobsPosted: backendUser.jobsPostedCount,
  jobsCompleted: backendUser.jobsCompletedCount,
  location: backendUser.location?.coordinates
    ? {
        longitude: backendUser.location.coordinates[0],
        latitude: backendUser.location.coordinates[1],
        label: backendUser.location.address ?? '',
      }
    : undefined,
});

const toApiProfile = (profile: ProfilePayload) => ({
  name: profile.name,
  photoUrl: profile.avatar,
  email: profile.email,
  password: profile.password,
  accountType: profile.accountType,
  termsAccepted: profile.termsAccepted,
  termsAcceptedAt: profile.termsAcceptedAt,
  dateOfBirth: profile.dateOfBirth,
  gender: profile.gender,
  languages: profile.languages,
  education: profile.education,
  currentAddress: profile.currentAddress,
  workerProfile: profile.workerProfile,
  employerProfile: profile.employerProfile,
  kyc: profile.kyc,
  wallet: profile.wallet,
  location: profile.location
    ? { latitude: profile.location.latitude, longitude: profile.location.longitude, address: profile.location.label }
    : undefined,
});

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;

  mode: UserMode;
  setMode: (mode: UserMode) => void;

  isAuthenticated: boolean;
  isBootstrapping: boolean;
  needsRegistration: boolean;
  currentUser: User | null;
  /** The phone number or email the current OTP flow (send/resend/verify) is for. */
  authIdentifierValue: string;
  authIdentifierType: 'phone' | 'email';
  accessToken: string | null;

  loginWithPassword: (identifier: AuthIdentifier, password: string) => Promise<void>;
  loginWithOAuth: (provider: OAuthProvider, token: string) => Promise<void>;
  registerWithOAuth: (provider: OAuthProvider, token: string, phone: string, accountType: AccountType) => Promise<void>;
  requestOtp: (identifier: AuthIdentifier) => Promise<{ demoOtp: string }>;
  startRegistration: (phone: string, profile: ProfilePayload) => Promise<{ demoOtp: string }>;
  confirmOtp: (otp: string) => Promise<void>;
  updateProfile: (profile: ProfilePayload) => Promise<void>;
  refreshProfile: () => Promise<void>;
  requestAccountTypeChange: (requestedType: AccountType) => Promise<void>;
  cancelAccountTypeChangeRequest: () => Promise<void>;
  addWalletMoney: (amount: number) => Promise<void>;
  withdrawWalletMoney: (amount: number) => Promise<void>;
  logout: () => void;

  bookmarkedJobIds: string[];
  toggleBookmark: (jobId: string) => void;

  appliedJobIds: string[];
  applyToJob: (jobId: string) => Promise<void>;
  cancelAcceptedJob: (jobId: string) => Promise<void>;

  remoteSettings: RemoteSettings;
  categories: CategoryMeta[];
  categoryGroups: { key: string; name: string }[];
  refreshCategories: () => Promise<void>;
  shouldShowAnnouncement: boolean;
  dismissAnnouncement: () => void;

  /** Set once right after a successful OTP verify, cleared when the greeting is dismissed. */
  welcome: { name: string; isNewUser: boolean } | null;
  dismissWelcome: () => void;

  notifications: BackendNotification[];
  unreadNotificationCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [mode, setMode] = useState<UserMode>('worker');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // True only until the stored-session restore attempt (below) finishes — RootNavigator
  // holds on a splash screen for this rather than flashing the login screen on every cold
  // start before flipping to Main once a saved session turns out to still be valid.
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authIdentifierValue, setAuthIdentifierValue] = useState('');
  const [authIdentifierType, setAuthIdentifierType] = useState<'phone' | 'email'>('phone');
  const [tokens, setTokens] = useState<TokenPair | null>(null);
  const [pendingRegistrationProfile, setPendingRegistrationProfile] = useState<ProfilePayload | null>(null);
  const [bookmarkedJobIds, setBookmarkedJobIds] = useState<string[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [remoteSettings, setRemoteSettings] = useState<RemoteSettings>({});
  const [categories, setCategories] = useState<CategoryMeta[]>(fallbackCategories);
  const [announcementSeen, setAnnouncementSeen] = useState(true);
  const [welcome, setWelcome] = useState<{ name: string; isNewUser: boolean } | null>(null);
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    fetchRemoteSettings().then(setRemoteSettings);
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const res = await apiListCategories();
      const mapped = res.categories.map(toCategoryMeta);
      setCategories(mapped.length ? mapped : fallbackCategories);
    } catch {
      setCategories(fallbackCategories);
    }
  }, []);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem('kaamsaathi_lang', lang).catch(() => {});
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[language][key] ?? translations.en[key] ?? key,
    [language]
  );

  const loginWithPassword = useCallback(async (identifier: AuthIdentifier, password: string) => {
    setAuthIdentifierValue(identifier.phone ?? identifier.email ?? '');
    setAuthIdentifierType(identifier.email ? 'email' : 'phone');
    setPendingRegistrationProfile(null);
    const res = await apiLoginWithPassword(identifier, password);
    setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    const user = toUser(res.user);
    setCurrentUser(user);
    try {
      connectSocket(res.accessToken);
    } catch {
      // Chat is secondary; password login should not depend on socket connection.
    }
    setNeedsRegistration(false);
    setIsAuthenticated(true);
    setAnnouncementSeen(false);
    setWelcome({ name: user.name, isNewUser: false });
  }, []);

  const loginWithOAuth = useCallback(async (provider: OAuthProvider, token: string) => {
    setPendingRegistrationProfile(null);
    const res = await apiOauthLogin(provider, token);
    setAuthIdentifierValue(res.user.email || '');
    setAuthIdentifierType('email');
    setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    const user = toUser(res.user);
    setCurrentUser(user);
    try {
      connectSocket(res.accessToken);
    } catch {
      // Chat is secondary; OAuth login should not depend on socket connection.
    }
    setNeedsRegistration(false);
    setIsAuthenticated(true);
    setAnnouncementSeen(false);
    setWelcome({ name: user.name, isNewUser: false });
  }, []);

  const registerWithOAuth = useCallback(async (provider: OAuthProvider, token: string, phone: string, accountType: AccountType) => {
    setPendingRegistrationProfile(null);
    const res = await apiOauthRegister(provider, token, phone, accountType);
    setAuthIdentifierValue(phone);
    setAuthIdentifierType('phone');
    setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    const user = toUser(res.user);
    setCurrentUser(user);
    try {
      connectSocket(res.accessToken);
    } catch {
      // Chat is secondary; OAuth registration should not depend on socket connection.
    }
    setNeedsRegistration(false);
    setIsAuthenticated(true);
    setAnnouncementSeen(false);
    setWelcome({ name: user.name, isNewUser: true });
  }, []);

  const requestOtp = useCallback(async (identifier: AuthIdentifier) => {
    setAuthIdentifierValue(identifier.phone ?? identifier.email ?? '');
    setAuthIdentifierType(identifier.email ? 'email' : 'phone');
    setPendingRegistrationProfile(null);
    const res = await apiSendOtp(identifier, 'login');
    return { demoOtp: res.otp };
  }, []);

  const startRegistration = useCallback(async (phone: string, profile: ProfilePayload) => {
    setAuthIdentifierValue(phone);
    setAuthIdentifierType('phone');
    setPendingRegistrationProfile(profile);
    const res = await apiSendOtp({ phone }, 'register');
    return { demoOtp: res.otp };
  }, []);

  const confirmOtp = useCallback(
    async (otp: string) => {
      const isNewUser = !!pendingRegistrationProfile;
      const intent = isNewUser ? 'register' : 'login';
      const identifier: AuthIdentifier =
        authIdentifierType === 'email' ? { email: authIdentifierValue } : { phone: authIdentifierValue };
      const res = await apiVerifyOtp(identifier, otp, intent);
      setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });

      let user = toUser(res.user);
      setCurrentUser(user);
      try {
        connectSocket(res.accessToken);
      } catch {
        // Chat is secondary; OTP success should not depend on socket connection.
      }

      if (pendingRegistrationProfile) {
        const profileRes = await apiUpdateProfile(res.accessToken, toApiProfile(pendingRegistrationProfile));
        user = toUser(profileRes.user);
        setCurrentUser(user);
        setPendingRegistrationProfile(null);
      }

      setNeedsRegistration(false);
      setIsAuthenticated(true);
      setAnnouncementSeen(false);
      // Read from `user` rather than state — setCurrentUser hasn't flushed yet.
      setWelcome({ name: user.name, isNewUser });
    },
    [authIdentifierValue, authIdentifierType, pendingRegistrationProfile]
  );

  const updateProfile = useCallback(
    async (profile: ProfilePayload) => {
      if (!tokens) throw new Error('Not authenticated');
      const res = await apiUpdateProfile(tokens.accessToken, toApiProfile(profile));
      setCurrentUser(toUser(res.user));
    },
    [tokens]
  );

  const requestAccountTypeChange = useCallback(
    async (requestedType: AccountType) => {
      if (!tokens) throw new Error('Not authenticated');
      const res = await apiRequestAccountTypeChange(tokens.accessToken, requestedType);
      setCurrentUser(toUser(res.user));
    },
    [tokens]
  );

  const cancelAccountTypeChangeRequest = useCallback(async () => {
    if (!tokens) throw new Error('Not authenticated');
    const res = await apiCancelAccountTypeChangeRequest(tokens.accessToken);
    setCurrentUser(toUser(res.user));
  }, [tokens]);

  // KYC/wallet approvals happen server-side (an admin acting outside the app), so without
  // this, currentUser silently goes stale until the user's next profile edit or re-login.
  const refreshProfile = useCallback(async () => {
    if (!tokens) return;
    try {
      const res = await apiGetProfile(tokens.accessToken);
      setCurrentUser(toUser(res.user));
    } catch {
      // best-effort — keep whatever we already have rather than blocking the screen
    }
  }, [tokens]);

  const fetchNotifications = useCallback(async () => {
    if (!tokens) return;
    try {
      const res = await apiListNotifications(tokens.accessToken, { limit: 50 });
      setNotifications(res.data);
      setUnreadNotificationCount(res.unreadCount);
    } catch {
      // best-effort — the notifications screen can retry via pull-to-refresh
    }
  }, [tokens]);

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      if (!tokens) return;
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
      try {
        await apiMarkNotificationRead(tokens.accessToken, notificationId);
      } catch {
        // local state already flipped; a stale unread badge is a minor inconsistency,
        // not worth re-fetching/reverting for
      }
    },
    [tokens]
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!tokens) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotificationCount(0);
    try {
      await apiMarkAllNotificationsRead(tokens.accessToken);
    } catch {
      // see markNotificationRead
    }
  }, [tokens]);

  // Fetch on login + push new ones in live via the same per-user socket room chat already
  // uses (`user:{userId}`, see mobile/backend/src/socket/index.js). Also fires a local OS
  // notification so it's visible even if the user isn't looking at the app right now.
  useEffect(() => {
    if (!tokens) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      return;
    }

    Notifications?.requestPermissionsAsync().catch(() => {});
    fetchNotifications();

    const socket = getSocket();
    if (!socket) return;

    const onNewNotification = (notification: BackendNotification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadNotificationCount((prev) => prev + 1);
      Notifications?.scheduleNotificationAsync({
        content: { title: notification.title, body: notification.body, data: notification.data },
        trigger: null,
      }).catch(() => {});
    };

    socket.on('notification:new', onNewNotification);
    return () => {
      socket.off('notification:new', onNewNotification);
    };
  }, [tokens, fetchNotifications]);

  const addWalletMoney = useCallback(
    async (amount: number) => {
      if (!tokens) throw new Error('Not authenticated');
      const res = await apiAddWalletMoney(tokens.accessToken, amount);
      setCurrentUser(toUser(res.user));
    },
    [tokens]
  );

  const withdrawWalletMoney = useCallback(
    async (amount: number) => {
      if (!tokens) throw new Error('Not authenticated');
      const res = await apiWithdrawWalletMoney(tokens.accessToken, amount);
      setCurrentUser(toUser(res.user));
    },
    [tokens]
  );

  const logout = useCallback(() => {
    disconnectSocket();
    setIsAuthenticated(false);
    setNeedsRegistration(false);
    setCurrentUser(null);
    setAuthIdentifierValue('');
    setTokens(null);
    setPendingRegistrationProfile(null);
    setAnnouncementSeen(true);
    setWelcome(null);
  }, []);

  // Keeps api.ts's module-level token copy in sync so request() can silently refresh an
  // expired access token and retry, mid-request, without every call site needing to care.
  useEffect(() => {
    setAuthTokens(tokens);
  }, [tokens]);

  useEffect(() => {
    setAuthHandlers({
      onTokensRefreshed: (fresh) => setTokens(fresh),
      onAuthExpired: () => logout(),
    });
  }, [logout]);

  // Persists whatever's needed to skip the login screen on the next cold start. Guarded on
  // isBootstrapping so this can't fire with the initial `tokens=null` and wipe out a
  // still-unread saved session before the restore effect below gets a chance to read it.
  useEffect(() => {
    if (isBootstrapping) return;
    if (tokens) {
      AsyncStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens)).catch(() => {});
    } else {
      AsyncStorage.removeItem(TOKENS_STORAGE_KEY).catch(() => {});
    }
  }, [tokens, isBootstrapping]);

  // Runs once on mount: if a session was saved from a previous app launch, restore it
  // instead of forcing the user to log in again every time the app is closed and reopened.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKENS_STORAGE_KEY);
        if (!stored || cancelled) return;
        const parsed = JSON.parse(stored) as TokenPair;
        setAuthTokens(parsed);

        const res = await apiGetProfile(parsed.accessToken);
        if (cancelled) return;

        // request() may have silently rotated the token pair mid-call (see
        // refreshAccessToken in api.ts) if the saved access token had expired while the
        // app was closed — read back whichever pair is now authoritative, not the
        // possibly-stale one we started with.
        setTokens(getAuthTokens() ?? parsed);
        setCurrentUser(toUser(res.user));
        try {
          connectSocket((getAuthTokens() ?? parsed).accessToken);
        } catch {
          // Chat is secondary; restoring a session should not depend on socket connection.
        }
        setIsAuthenticated(true);
      } catch {
        // Nothing restorable (never logged in, or the refresh token itself has expired) —
        // clear anything stale so we don't keep retrying it on every future launch.
        setAuthTokens(null);
        await AsyncStorage.removeItem(TOKENS_STORAGE_KEY).catch(() => {});
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissAnnouncement = useCallback(() => {
    setAnnouncementSeen(true);
  }, []);

  const dismissWelcome = useCallback(() => {
    setWelcome(null);
  }, []);

  const toggleBookmark = useCallback((jobId: string) => {
    setBookmarkedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  }, []);

  const applyToJob = useCallback(
    async (jobId: string) => {
      if (!tokens) throw new Error('Not authenticated');
      if (currentUser?.accountType === 'employer') {
        throw new Error('Employer accounts cannot apply to jobs.');
      }
      if (!isProfileComplete(currentUser)) {
        throw new Error('Please complete your profile before accepting or applying to jobs.');
      }
      if (!isKycComplete(currentUser)) {
        if (currentUser?.kyc?.status === 'submitted') {
          throw new Error('Your KYC is under admin review. Please wait up to 24 hours.');
        }
        if (currentUser?.kyc?.status === 'rejected') {
          throw new Error('Your KYC was rejected. Please update and submit KYC again.');
        }
        throw new Error('Please complete KYC before accepting or applying to jobs.');
      }
      const res = await apiApplyToJob(tokens.accessToken, jobId);
      const myId = currentUser?.id;
      const stillApplied = res.job.applicants.some((a) => a.userId._id === myId);
      setAppliedJobIds((prev) => (stillApplied && !prev.includes(jobId) ? [...prev, jobId] : prev));
    },
    [tokens, currentUser]
  );

  const cancelAcceptedJob = useCallback(
    async (jobId: string) => {
      if (!tokens) throw new Error('Not authenticated');
      await apiCancelAcceptedApplication(tokens.accessToken, jobId);
      setAppliedJobIds((prev) => prev.filter((id) => id !== jobId));
    },
    [tokens]
  );

  // Queued behind the welcome greeting so the two never stack on top of each other.
  const shouldShowAnnouncement =
    !announcementSeen && !welcome && !!remoteSettings['mobile.loginAnnouncement']?.enabled;
  const categoryGroups = fallbackCategoryGroups;

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      mode,
      setMode,
      isAuthenticated,
      isBootstrapping,
      needsRegistration,
      currentUser,
      authIdentifierValue,
      authIdentifierType,
      accessToken: tokens?.accessToken ?? null,
      loginWithPassword,
      loginWithOAuth,
      registerWithOAuth,
      requestOtp,
      startRegistration,
      confirmOtp,
      updateProfile,
      refreshProfile,
      requestAccountTypeChange,
      cancelAccountTypeChangeRequest,
      addWalletMoney,
      withdrawWalletMoney,
      logout,
      bookmarkedJobIds,
      toggleBookmark,
      appliedJobIds,
      applyToJob,
      cancelAcceptedJob,
      remoteSettings,
      categories,
      categoryGroups,
      refreshCategories,
      shouldShowAnnouncement,
      dismissAnnouncement,
      welcome,
      dismissWelcome,
      notifications,
      unreadNotificationCount,
      fetchNotifications,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      language,
      setLanguage,
      t,
      mode,
      isAuthenticated,
      isBootstrapping,
      needsRegistration,
      currentUser,
      authIdentifierValue,
      authIdentifierType,
      tokens,
      loginWithPassword,
      loginWithOAuth,
      registerWithOAuth,
      requestOtp,
      startRegistration,
      confirmOtp,
      updateProfile,
      refreshProfile,
      requestAccountTypeChange,
      cancelAccountTypeChangeRequest,
      addWalletMoney,
      withdrawWalletMoney,
      logout,
      bookmarkedJobIds,
      toggleBookmark,
      appliedJobIds,
      applyToJob,
      cancelAcceptedJob,
      remoteSettings,
      categories,
      categoryGroups,
      refreshCategories,
      shouldShowAnnouncement,
      dismissAnnouncement,
      welcome,
      dismissWelcome,
      notifications,
      unreadNotificationCount,
      fetchNotifications,
      markNotificationRead,
      markAllNotificationsRead,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
