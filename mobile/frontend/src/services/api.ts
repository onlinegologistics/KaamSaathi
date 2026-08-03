import Constants from 'expo-constants';

const API_PORT = 5000;

// Last resort only: used for production builds, and for tunnels (which proxy
// Metro but not this server). Keep it pointing at wherever the API really runs.
const FALLBACK_API_BASE_URL = 'http://192.168.1.46:5000';

// Hosts that serve the JS bundle but cannot reach the API server.
const isTunnelHost = (host: string) =>
  host.endsWith('.exp.direct') || host.endsWith('.ngrok.io') || host.endsWith('.loca.lt');

/**
 * Reuses whatever host Expo loaded this bundle from, swapping in the API port.
 *
 * That keeps the API pointed at the dev machine automatically: a new DHCP lease,
 * a different Wi-Fi, or the Android emulator (which sees the host as 10.0.2.2)
 * all resolve correctly with no code edit.
 */
const deriveApiBaseUrl = (): string => {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (!host || isTunnelHost(host)) return FALLBACK_API_BASE_URL;
  return `http://${host}:${API_PORT}`;
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
  dateOfBirth?: string;
  education?: string;
  currentAddress?: string;
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

export const updateProfile = (
  accessToken: string,
  profile: {
    name: string;
    photoUrl?: string;
    email?: string;
    dateOfBirth?: string;
    education?: string;
    currentAddress?: string;
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
      ...(profile.dateOfBirth ? { dateOfBirth: profile.dateOfBirth } : {}),
      ...(profile.education ? { education: profile.education } : {}),
      ...(profile.currentAddress ? { currentAddress: profile.currentAddress } : {}),
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
  duration: number;
  payAmount: number;
  peopleNeeded: number;
  scheduledFor: string;
}

export const createJob = (accessToken: string, payload: CreateJobPayload) =>
  request<{ success: true; job: BackendJob }>('/jobs', {
    method: 'POST',
    accessToken,
    body: payload,
  });

export interface ListJobsQuery {
  category?: string;
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
