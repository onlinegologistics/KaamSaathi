export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'super-admin';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface AadhaarVerification {
  isVerified: boolean;
  maskedLast4?: string;
  providerReferenceId?: string;
}

export interface GeoPoint {
  type: 'Point';
  coordinates?: [number, number];
  address?: string;
}

export interface User {
  _id: string;
  name?: string;
  phone: string;
  photoUrl?: string;
  location?: GeoPoint;
  aadhaarVerification: AadhaarVerification;
  ratingAverage: number;
  ratingCount: number;
  jobsCompletedCount: number;
  jobsPostedCount: number;
  role: 'user' | 'admin';
  isBlocked: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplicant {
  userId: string | { _id: string; name?: string; phone: string; photoUrl?: string; ratingAverage: number };
  status: 'applied' | 'accepted' | 'rejected';
  appliedAt: string;
  updatedAt: string;
}

export interface Job {
  _id: string;
  postedBy: string | { _id: string; name?: string; phone: string; photoUrl?: string };
  category: string;
  title: string;
  description: string;
  location: GeoPoint;
  duration: string;
  payAmount: number;
  peopleNeeded: number;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
  applicants: JobApplicant[];
  scheduledFor: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  key: string;
  icon: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: string;
  job: string | { _id: string; title: string };
  payer: string | { _id: string; name?: string; phone: string };
  payee: string | { _id: string; name?: string; phone: string };
  amount: number;
  platformCommission: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  date: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  _id: string;
  payee: string | { _id: string; name?: string; phone: string };
  amount: number;
  status: 'pending' | 'paid';
  relatedTransactions: string[];
  paidAt: string | null;
  paidBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  _id: string;
  targetType: 'job' | 'user';
  targetId: string;
  reporterId: string | { _id: string; name?: string; phone: string };
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  _id: string;
  key: string;
  type: 'content' | 'toggle' | 'json';
  value: unknown;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginAnnouncement {
  enabled: boolean;
  title: string;
  body: string;
  imageUrl: string;
  buttonLabel: string;
  buttonUrl: string;
}

export interface OnboardingSlideFeature {
  icon?: string;
  title: string;
  body: string;
}

export interface OnboardingSlideContent {
  title: string;
  accent: string;
  subtitle: string;
  icon: string;
  tint: 'orange' | 'green';
  features: OnboardingSlideFeature[];
}

export interface AuthFlowContent {
  onboardingSlides: OnboardingSlideContent[];
  phoneEntry: {
    title: string;
    subtitle: string;
    sendOtpLabel: string;
  };
  otpVerification: {
    title: string;
    otpSentToLabel: string;
    resendLabel: string;
    verifyLabel: string;
  };
  profileSetup: {
    title: string;
    nameLabel: string;
    namePlaceholder: string;
    locationLabel: string;
    finishLabel: string;
  };
}

export interface DashboardStats {
  totalUsers: number;
  activeJobs: number;
  completedJobsToday: number;
  newSignupsThisWeek: number;
  totalRevenue: number;
  pendingReports: number;
  pendingPayouts: number;
}

export interface RevenueSeriesPoint {
  period: string;
  commission: number;
  volume: number;
  count: number;
}
