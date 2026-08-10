import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, TranslationKey } from '../i18n/translations';
import { AccountType, CategoryMeta, EmployerProfile, Gender, KycProfile, User, WalletProfile, WorkerProfile } from '../types';
import {
  BackendUser,
  TokenPair,
  listCategories as apiListCategories,
  loginWithPassword as apiLoginWithPassword,
  sendOtp as apiSendOtp,
  toCategoryMeta,
  verifyOtp as apiVerifyOtp,
  updateProfile as apiUpdateProfile,
  getProfile as apiGetProfile,
  applyToJob as apiApplyToJob,
  cancelAcceptedApplication as apiCancelAcceptedApplication,
  addWalletMoney as apiAddWalletMoney,
  withdrawWalletMoney as apiWithdrawWalletMoney,
} from '../services/api';
import { categories as fallbackCategories, categoryGroups as fallbackCategoryGroups } from '../data/categories';
import { RemoteSettings, fetchRemoteSettings } from '../services/settings';
import { connectSocket, disconnectSocket } from '../services/socket';
import { isKycComplete, isProfileComplete } from '../utils/profileCompletion';

export type UserMode = 'worker' | 'employer';

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
  needsRegistration: boolean;
  currentUser: User | null;
  phoneNumber: string;
  accessToken: string | null;

  loginWithPassword: (phone: string, password: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<{ demoOtp: string }>;
  startRegistration: (phone: string, profile: ProfilePayload) => Promise<{ demoOtp: string }>;
  confirmOtp: (otp: string) => Promise<void>;
  updateProfile: (profile: ProfilePayload) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [mode, setMode] = useState<UserMode>('worker');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tokens, setTokens] = useState<TokenPair | null>(null);
  const [pendingRegistrationProfile, setPendingRegistrationProfile] = useState<ProfilePayload | null>(null);
  const [bookmarkedJobIds, setBookmarkedJobIds] = useState<string[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [remoteSettings, setRemoteSettings] = useState<RemoteSettings>({});
  const [categories, setCategories] = useState<CategoryMeta[]>(fallbackCategories);
  const [announcementSeen, setAnnouncementSeen] = useState(true);
  const [welcome, setWelcome] = useState<{ name: string; isNewUser: boolean } | null>(null);

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

  const loginWithPassword = useCallback(async (phone: string, password: string) => {
    setPhoneNumber(phone);
    setPendingRegistrationProfile(null);
    const res = await apiLoginWithPassword(phone, password);
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

  const requestOtp = useCallback(async (phone: string) => {
    setPhoneNumber(phone);
    setPendingRegistrationProfile(null);
    const res = await apiSendOtp(phone, 'login');
    return { demoOtp: res.otp };
  }, []);

  const startRegistration = useCallback(async (phone: string, profile: ProfilePayload) => {
    setPhoneNumber(phone);
    setPendingRegistrationProfile(profile);
    const res = await apiSendOtp(phone, 'register');
    return { demoOtp: res.otp };
  }, []);

  const confirmOtp = useCallback(
    async (otp: string) => {
      const isNewUser = !!pendingRegistrationProfile;
      const intent = isNewUser ? 'register' : 'login';
      const res = await apiVerifyOtp(phoneNumber, otp, intent);
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
    [phoneNumber, pendingRegistrationProfile]
  );

  const updateProfile = useCallback(
    async (profile: ProfilePayload) => {
      if (!tokens) throw new Error('Not authenticated');
      const res = await apiUpdateProfile(tokens.accessToken, toApiProfile(profile));
      setCurrentUser(toUser(res.user));
    },
    [tokens]
  );

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
    setPhoneNumber('');
    setTokens(null);
    setPendingRegistrationProfile(null);
    setAnnouncementSeen(true);
    setWelcome(null);
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
      needsRegistration,
      currentUser,
      phoneNumber,
      accessToken: tokens?.accessToken ?? null,
      loginWithPassword,
      requestOtp,
      startRegistration,
      confirmOtp,
      updateProfile,
      refreshProfile,
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
    }),
    [
      language,
      setLanguage,
      t,
      mode,
      isAuthenticated,
      needsRegistration,
      currentUser,
      phoneNumber,
      tokens,
      loginWithPassword,
      requestOtp,
      startRegistration,
      confirmOtp,
      updateProfile,
      refreshProfile,
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
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
