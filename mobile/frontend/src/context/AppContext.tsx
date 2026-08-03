import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, TranslationKey } from '../i18n/translations';
import { User } from '../types';
import {
  BackendUser,
  TokenPair,
  sendOtp as apiSendOtp,
  verifyOtp as apiVerifyOtp,
  updateProfile as apiUpdateProfile,
  applyToJob as apiApplyToJob,
  cancelAcceptedApplication as apiCancelAcceptedApplication,
} from '../services/api';
import { RemoteSettings, fetchRemoteSettings } from '../services/settings';
import { connectSocket, disconnectSocket } from '../services/socket';

export type UserMode = 'worker' | 'employer';

type ProfilePayload = {
  name: string;
  avatar?: string;
  email?: string;
  dateOfBirth?: string;
  education?: string;
  currentAddress?: string;
  location?: { latitude: number; longitude: number; label: string };
};

const toUser = (backendUser: BackendUser): User => ({
  id: backendUser._id,
  name: backendUser.name ?? '',
  phone: backendUser.phone,
  avatar: backendUser.photoUrl || undefined,
  email: backendUser.email || undefined,
  dateOfBirth: backendUser.dateOfBirth || undefined,
  education: backendUser.education || undefined,
  currentAddress: backendUser.currentAddress || undefined,
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
  dateOfBirth: profile.dateOfBirth,
  education: profile.education,
  currentAddress: profile.currentAddress,
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

  requestOtp: (phone: string) => Promise<{ demoOtp: string }>;
  startRegistration: (phone: string, profile: ProfilePayload) => Promise<{ demoOtp: string }>;
  confirmOtp: (otp: string) => Promise<void>;
  updateProfile: (profile: ProfilePayload) => Promise<void>;
  logout: () => void;

  bookmarkedJobIds: string[];
  toggleBookmark: (jobId: string) => void;

  appliedJobIds: string[];
  applyToJob: (jobId: string) => Promise<void>;
  cancelAcceptedJob: (jobId: string) => Promise<void>;

  remoteSettings: RemoteSettings;
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
  const [announcementSeen, setAnnouncementSeen] = useState(true);
  const [welcome, setWelcome] = useState<{ name: string; isNewUser: boolean } | null>(null);

  useEffect(() => {
    fetchRemoteSettings().then(setRemoteSettings);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem('kaamsaathi_lang', lang).catch(() => {});
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[language][key] ?? translations.en[key] ?? key,
    [language]
  );

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
      const res = await apiApplyToJob(tokens.accessToken, jobId);
      const myId = currentUser?.id;
      const stillApplied = res.job.applicants.some((a) => a.userId._id === myId);
      setAppliedJobIds((prev) => (stillApplied && !prev.includes(jobId) ? [...prev, jobId] : prev));
    },
    [tokens, currentUser?.id]
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
      requestOtp,
      startRegistration,
      confirmOtp,
      updateProfile,
      logout,
      bookmarkedJobIds,
      toggleBookmark,
      appliedJobIds,
      applyToJob,
      cancelAcceptedJob,
      remoteSettings,
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
      requestOtp,
      startRegistration,
      confirmOtp,
      updateProfile,
      logout,
      bookmarkedJobIds,
      toggleBookmark,
      appliedJobIds,
      applyToJob,
      cancelAcceptedJob,
      remoteSettings,
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
