import Constants from 'expo-constants';
import type {
  AccountType,
  CategoryMeta,
  EmployerKind,
  Gender,
  JobCategory,
  KycProfile,
  WalletProfile,
  WalletTransaction,
} from '../types';

const API_PORT = 5000;

// Last resort only: used for production builds. Local dev should use the Expo host.
const FALLBACK_API_BASE_URL = 'https://app.smartdial.online';

const isTunnelHost = (host: string) =>
  host.endsWith('.exp.direct') || host.endsWith('.ngrok.io') || host.endsWith('.loca.lt');

const parseHostUri = (hostUri: string) => {
  const uri = hostUri.includes('://') ? hostUri : `http://${hostUri}`;
  try {
    const parsed = new URL(uri);
    return parsed.hostname;
  } catch {
    return undefined;
  }
};

const deriveApiBaseUrl = (): string => {
  const explicitApiBaseUrl = (Constants.expoConfig as any)?.extra?.apiBaseUrl;
  if (explicitApiBaseUrl) return explicitApiBaseUrl;

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.manifest as any)?.debuggerHost ||
    (Constants as any).manifest2?.hostUri;

  const host = hostUri ? parseHostUri(hostUri) : undefined;
  if (host && !isTunnelHost(host)) {
    return `http://${host}:${API_PORT}`;
  }

  return FALLBACK_API_BASE_URL;
};

export const API_BASE_URL = deriveApiBaseUrl();

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  details?: { path: string; message: string }[];

  constructor(status: number, message: string, code?: string, details?: { path: string; message: string }[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  accessToken?: string;
  query?: object;
}

const toQueryString = (query?: RequestOptions['query']) => {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query as Record<string, string | number | boolean | undefined>).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}${toQueryString(options.query)}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    throw new ApiRequestError(
      res.status,
      data.error?.message ?? data.message ?? 'Something went wrong',
      data.error?.code ?? data.code,
      data.error?.details
    );
  }

  return data as T;
}

export interface BackendUser {
  _id: string;
  name?: string;
  phone: string;
  photoUrl?: string;
  email?: string;
  accountType?: AccountType;
  dateOfBirth?: string;
  gender?: Gender;
  languages?: string[];
  education?: string;
  currentAddress?: string;
  workerProfile?: {
    skills?: string[];
    experienceYears?: number;
    preferredWorkCategories?: JobCategory[];
    workRadiusKm?: number;
  };
  employerProfile?: {
    kind?: EmployerKind;
    companyName?: string;
    gstNumber?: string;
    officeAddress?: string;
    companyLogoUrl?: string;
    companyVerificationRequested?: boolean;
  };
  kyc?: KycProfile;
  wallet?: WalletProfile;
  location?: {
    type: 'Point';
    coordinates?: [number, number];
    address?: string;
  };
  ratingAverage: number;
  ratingCount: number;
  jobsCompletedCount: number;
  jobsPostedCount: number;
  aadhaarVerification?: { isVerified: boolean };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface BackendCategory {
  _id: string;
  key: string;
  name: string;
  groupKey: string;
  groupName: string;
  icon: string;
  color: string;
  kycDocumentLabel?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const toCategoryMeta = (category: BackendCategory): CategoryMeta => ({
  key: category.key,
  label: category.name,
  groupKey: category.groupKey,
  groupName: category.groupName,
  icon: category.icon,
  color: category.color,
  kycDocumentLabel: category.kycDocumentLabel,
  sortOrder: category.sortOrder,
  isActive: category.isActive,
});

export const listCategories = () =>
  request<{ success: true; categories: BackendCategory[] }>('/categories');

export const listAdminCategories = (accessToken: string, includeInactive = true) =>
  request<{ success: true; categories: BackendCategory[] }>('/admin/categories', {
    accessToken,
    query: { includeInactive },
  });

export const createAdminCategory = (accessToken: string, category: Omit<CategoryMeta, 'labelKey'>) =>
  request<{ success: true; category: BackendCategory }>('/admin/categories', {
    method: 'POST',
    accessToken,
    body: {
      key: category.key,
      name: category.label,
      groupKey: category.groupKey,
      groupName: category.groupName,
      icon: category.icon,
      color: category.color,
      kycDocumentLabel: category.kycDocumentLabel,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    },
  });

export const updateAdminCategory = (accessToken: string, key: string, category: Partial<Omit<CategoryMeta, 'key' | 'labelKey'>>) =>
  request<{ success: true; category: BackendCategory }>(`/admin/categories/${key}`, {
    method: 'PUT',
    accessToken,
    body: {
      ...(category.label !== undefined ? { name: category.label } : {}),
      ...(category.groupKey !== undefined ? { groupKey: category.groupKey } : {}),
      ...(category.groupName !== undefined ? { groupName: category.groupName } : {}),
      ...(category.icon !== undefined ? { icon: category.icon } : {}),
      ...(category.color !== undefined ? { color: category.color } : {}),
      ...(category.kycDocumentLabel !== undefined ? { kycDocumentLabel: category.kycDocumentLabel } : {}),
      ...(category.sortOrder !== undefined ? { sortOrder: category.sortOrder } : {}),
      ...(category.isActive !== undefined ? { isActive: category.isActive } : {}),
    },
  });

export const sendOtp = (phone: string, intent: 'login' | 'register' = 'login') =>
  request<{ success: true; otp: string; message: string }>('/auth/send-otp', {
    method: 'POST',
    body: { phone, intent },
  });

export const verifyOtp = (phone: string, otp: string, intent: 'login' | 'register' = 'login') =>
  request<{ success: true; user: BackendUser; isNewUser: boolean } & TokenPair>('/auth/verify-otp', {
    method: 'POST',
    body: { phone, otp, intent },
  });

export const loginWithPassword = (phone: string, password: string) =>
  request<{ success: true; user: BackendUser; isNewUser: false } & TokenPair>('/auth/login', {
    method: 'POST',
    body: { phone, password },
  });

export const getProfile = (accessToken: string) =>
  request<{ success: true; user: BackendUser }>('/users/profile', {
    accessToken,
  });

export const updateProfile = (
  accessToken: string,
  profile: {
    name: string;
    photoUrl?: string;
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
    workerProfile?: {
      skills?: string[];
      experienceYears?: number;
      preferredWorkCategories?: JobCategory[];
      workRadiusKm?: number;
    };
    employerProfile?: {
      kind?: EmployerKind;
      companyName?: string;
      gstNumber?: string;
      officeAddress?: string;
      companyLogoUrl?: string;
      companyVerificationRequested?: boolean;
    };
    kyc?: {
      aadhaarCardUrl?: string;
      selfieUrl?: string;
      drivingLicenseUrl?: string;
      categoryDocuments?: KycProfile['categoryDocuments'];
    };
    wallet?: {
      upiId?: string;
      bankAccountNumber?: string;
      bankAccountHolderName?: string;
      ifscCode?: string;
      panNumber?: string;
    };
    location?: { latitude: number; longitude: number; address: string };
  }
) =>
  request<{ success: true; user: BackendUser }>('/users/profile', {
    method: 'PUT',
    accessToken,
    body: {
      name: profile.name,
      ...(profile.photoUrl ? { photoUrl: profile.photoUrl } : {}),
      ...(profile.email ? { email: profile.email } : {}),
      ...(profile.password ? { password: profile.password } : {}),
      ...(profile.accountType ? { accountType: profile.accountType } : {}),
      ...(profile.termsAccepted !== undefined ? { termsAccepted: profile.termsAccepted } : {}),
      ...(profile.termsAcceptedAt ? { termsAcceptedAt: profile.termsAcceptedAt } : {}),
      ...(profile.dateOfBirth ? { dateOfBirth: profile.dateOfBirth } : {}),
      ...(profile.gender ? { gender: profile.gender } : {}),
      ...(profile.languages ? { languages: profile.languages } : {}),
      ...(profile.education ? { education: profile.education } : {}),
      ...(profile.currentAddress ? { currentAddress: profile.currentAddress } : {}),
      ...(profile.workerProfile ? { workerProfile: profile.workerProfile } : {}),
      ...(profile.employerProfile ? { employerProfile: profile.employerProfile } : {}),
      ...(profile.kyc ? { kyc: profile.kyc } : {}),
      ...(profile.wallet ? { wallet: profile.wallet } : {}),
      ...(profile.location
        ? {
            location: {
              lat: profile.location.latitude,
              lng: profile.location.longitude,
              address: profile.location.address,
            },
          }
        : {}),
    },
  });

// ---- Wallet ----

export const addWalletMoney = (accessToken: string, amount: number) =>
  request<{ success: true; user: BackendUser; transaction: WalletTransaction }>('/users/wallet/add-money', {
    method: 'POST',
    accessToken,
    body: { amount },
  });

export const withdrawWalletMoney = (accessToken: string, amount: number) =>
  request<{ success: true; user: BackendUser; transaction: WalletTransaction }>('/users/wallet/withdraw', {
    method: 'POST',
    accessToken,
    body: { amount },
  });

export const listWalletTransactions = (accessToken: string, query: { page?: number; limit?: number } = {}) =>
  request<{ success: true; data: WalletTransaction[]; pagination: PaginationMeta }>('/users/wallet/transactions', {
    accessToken,
    query,
  });

// ---- Jobs ----

export interface BackendJobApplicant {
  userId: BackendUser;
  status: 'applied' | 'accepted' | 'rejected' | 'cancelled';
  appliedAt: string;
  updatedAt: string;
}

export interface BackendJob {
  _id: string;
  postedBy: BackendUser;
  category: string;
  categoryGroup?: string;
  title: string;
  description: string;
  location: { type: 'Point'; coordinates: [number, number]; address: string };
  duration: number;
  payAmount: number;
  peopleNeeded: number;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
  applicants: BackendJobApplicant[];
  acceptedApplicant?: BackendUser;
  workerOtp?: {
    code?: string;
    verifiedAt?: string;
    verifiedBy?: string;
  };
  scheduledFor: string;
  endAt?: string;
  suggestedMinimumPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateJobPayload {
  category: string;
  title: string;
  description: string;
  location: { lat: number; lng: number; address: string };
  city?: string;
  area?: string;
  duration: number;
  payAmount: number;
  peopleNeeded: number;
  scheduledFor: string;
}

export interface PriceSuggestion {
  suggestedMinimum: number;
  currency: string;
  source: string;
}

export const getPriceSuggestion = (
  accessToken: string,
  query: { city?: string; area?: string; category?: string; durationMinutes: number }
) =>
  request<{ success: true; data: PriceSuggestion }>('/jobs/price-suggestion', {
    method: 'POST',
    accessToken,
    body: query,
  });

export const createJob = (accessToken: string, payload: CreateJobPayload) =>
  request<{ success: true; job: BackendJob }>('/jobs', {
    method: 'POST',
    accessToken,
    body: payload,
  });

export interface ListJobsQuery {
  category?: string;
  categoryGroup?: string;
  status?: string;
  mine?: boolean;
  applied?: boolean;
  search?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  payMin?: number;
  payMax?: number;
  date?: string;
  page?: number;
  limit?: number;
}

export const listJobs = (accessToken: string, query: ListJobsQuery = {}) =>
  request<{ success: true; data: BackendJob[]; pagination: PaginationMeta }>('/jobs', {
    accessToken,
    query,
  });

export const getJob = (accessToken: string, jobId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}`, { accessToken });

export const updateJob = (accessToken: string, jobId: string, payload: Partial<CreateJobPayload>) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}`, {
    method: 'PUT',
    accessToken,
    body: payload,
  });

export const deleteJob = (accessToken: string, jobId: string) =>
  request<{ success: true; message: string }>(`/jobs/${jobId}`, {
    method: 'DELETE',
    accessToken,
  });

export const applyToJob = (accessToken: string, jobId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/apply`, {
    method: 'POST',
    accessToken,
  });

export const cancelAcceptedApplication = (accessToken: string, jobId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/application/cancel`, {
    method: 'POST',
    accessToken,
  });

export const getCallInfo = (accessToken: string, jobId: string) =>
  request<{ success: true; name: string; phone: string }>(`/jobs/${jobId}/call-info`, {
    accessToken,
  });

export interface JobLocationShare {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
}

export const getJobLocations = (accessToken: string, jobId: string) =>
  request<{ success: true; data: JobLocationShare[] }>(`/jobs/${jobId}/location`, {
    accessToken,
  });

export const acceptApplicant = (accessToken: string, jobId: string, userId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/applicants/${userId}/accept`, {
    method: 'POST',
    accessToken,
  });

export const rejectApplicant = (accessToken: string, jobId: string, userId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/applicants/${userId}/reject`, {
    method: 'POST',
    accessToken,
  });

export const completeJob = (accessToken: string, jobId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/complete`, {
    method: 'POST',
    accessToken,
  });

export const getJobChat = (accessToken: string, jobId: string, applicantId?: string) =>
  request<{ success: true; chat: BackendChat | null }>(`/jobs/${jobId}/chat`, {
    accessToken,
    query: applicantId ? { applicantId } : undefined,
  });

export const verifyWorkerOtp = (accessToken: string, jobId: string, otp: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/worker-otp/verify`, {
    method: 'POST',
    accessToken,
    body: { otp },
  });

// ---- Chat ----

export interface BackendChat {
  _id: string;
  job: { _id: string; title: string; status: string } | string;
  poster: BackendUser | string;
  applicant: BackendUser | string;
  otherUser?: BackendUser;
  unreadCount: number | { poster: number; applicant: number };
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSender?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendMessage {
  _id: string;
  chat: string;
  sender: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export const listThreads = (accessToken: string, query: { page?: number; limit?: number } = {}) =>
  request<{ success: true; data: BackendChat[]; pagination: PaginationMeta }>('/chats', {
    accessToken,
    query,
  });

export const getThreadMessages = (
  accessToken: string,
  chatId: string,
  query: { before?: string; page?: number; limit?: number } = {}
) =>
  request<{ success: true; data: BackendMessage[]; pagination: PaginationMeta }>(`/chats/${chatId}/messages`, {
    accessToken,
    query,
  });

export const sendMessage = (accessToken: string, chatId: string, text: string) =>
  request<{ success: true; message: BackendMessage }>(`/chats/${chatId}/messages`, {
    method: 'POST',
    accessToken,
    body: { text },
  });

export const markThreadRead = (accessToken: string, chatId: string) =>
  request<{ success: true; chat: BackendChat }>(`/chats/${chatId}/read`, {
    method: 'POST',
    accessToken,
  });

// ---- AI Assistant ----

export interface BackendAiChatMessage {
  _id: string;
  user: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  updatedAt: string;
}

export const getAiChatMessages = (accessToken: string, query: { limit?: number } = {}) =>
  request<{ success: true; data: BackendAiChatMessage[] }>('/ai-chat', {
    accessToken,
    query,
  });

export const sendAiChatMessage = (accessToken: string, text: string) =>
  request<{ success: true; message: BackendAiChatMessage }>('/ai-chat', {
    method: 'POST',
    accessToken,
    body: { text },
  });

// ---- Places (location search) ----

export interface PlaceSuggestion {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
}

export const placesAutocomplete = (
  accessToken: string,
  query: { input: string; lat?: number; lng?: number; sessionToken?: string }
) =>
  request<{ success: true; data: PlaceSuggestion[] }>('/places/autocomplete', {
    accessToken,
    query,
  });

export const getPlaceLocation = (accessToken: string, placeId: string, sessionToken?: string) =>
  request<{ success: true; location: { latitude: number; longitude: number; address: string } }>(
    `/places/${placeId}`,
    {
      accessToken,
      query: sessionToken ? { sessionToken } : undefined,
    }
  );

// ---- Reports ----

export const REPORT_REASONS = [
  'Spam / Fake job',
  'Fraud / Scam',
  'Abusive behavior',
  'Unsafe behavior',
  'Incorrect information',
  'Payment issue',
  'Harassment',
  'Other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export interface BackendReport {
  _id: string;
  targetType: 'job' | 'user';
  targetId: string;
  reporterId: string;
  reason: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const submitReport = (
  accessToken: string,
  payload: { targetType: 'job' | 'user'; targetId: string; reason: ReportReason; description?: string }
) =>
  request<{ success: true; report: BackendReport }>('/reports', {
    method: 'POST',
    accessToken,
    body: payload,
  });
