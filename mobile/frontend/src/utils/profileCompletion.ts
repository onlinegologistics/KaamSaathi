import type { JobCategory, User } from '../types';

const hasText = (value?: string) => !!value?.trim();

export interface CategoryDocumentRequirement {
  category: JobCategory;
  label: string;
}

export const getRequiredCategoryDocuments = (categories?: JobCategory[]): CategoryDocumentRequirement[] =>
  Array.from(new Set(categories ?? [])).map((category) => ({
    category,
    label: 'Work Document',
  }));

const hasCategoryDocument = (user: User, requirement: CategoryDocumentRequirement) =>
  (user.kyc?.categoryDocuments ?? []).some(
    (document) => document.category === requirement.category && hasText(document.documentUrl)
  ) ||
  (['delivery', 'driver'].includes(requirement.category) && hasText(user.kyc?.drivingLicenseUrl));

export const isProfileComplete = (user: User | null) => {
  if (!user) return false;
  const baseComplete =
    hasText(user.name) &&
    hasText(user.avatar) &&
    hasText(user.dateOfBirth) &&
    hasText(user.gender) &&
    (user.languages?.length ?? 0) > 0 &&
    hasText(user.currentAddress);

  const isWorker = user.accountType === 'worker' || user.accountType === 'both';
  const isEmployer = user.accountType === 'employer' || user.accountType === 'both';
  const workerComplete =
    !isWorker ||
    ((user.workerProfile?.skills?.length ?? 0) > 0 &&
      typeof user.workerProfile?.experienceYears === 'number' &&
      hasText(user.education) &&
      (user.workerProfile?.preferredWorkCategories?.length ?? 0) > 0 &&
      typeof user.workerProfile?.workRadiusKm === 'number');

  const employerComplete =
    !isEmployer ||
    (hasText(user.employerProfile?.kind) &&
      (user.employerProfile?.kind !== 'company' || hasText(user.employerProfile?.companyName)) &&
      hasText(user.employerProfile?.officeAddress));

  return baseComplete && workerComplete && employerComplete;
};

export const isKycComplete = (user: User | null) => {
  if (!user) return false;
  const docsReady = hasText(user.kyc?.aadhaarCardUrl) && hasText(user.kyc?.selfieUrl);
  const categoryDocsReady = getRequiredCategoryDocuments(user.workerProfile?.preferredWorkCategories).every(
    (requirement) => hasCategoryDocument(user, requirement)
  );
  return docsReady && categoryDocsReady && user.kyc?.status === 'verified';
};

export const isWalletSetupComplete = (user: User | null) => {
  if (!user) return false;
  const hasUpi = hasText(user.wallet?.upiId);
  const hasBank =
    hasText(user.wallet?.bankAccountNumber) &&
    hasText(user.wallet?.bankAccountHolderName) &&
    hasText(user.wallet?.ifscCode);
  return (hasUpi || hasBank) && user.wallet?.status === 'verified';
};

export const getProfileCompletionPercent = (user: User | null): number => {
  if (!user) return 0;

  const isWorker = user.accountType === 'worker' || user.accountType === 'both';
  const isEmployer = user.accountType === 'employer' || user.accountType === 'both';

  const checks: boolean[] = [
    hasText(user.name),
    hasText(user.avatar),
    hasText(user.dateOfBirth),
    hasText(user.gender),
    (user.languages?.length ?? 0) > 0,
    hasText(user.currentAddress),
  ];

  if (isWorker) {
    checks.push(
      (user.workerProfile?.skills?.length ?? 0) > 0,
      typeof user.workerProfile?.experienceYears === 'number',
      hasText(user.education),
      (user.workerProfile?.preferredWorkCategories?.length ?? 0) > 0,
      typeof user.workerProfile?.workRadiusKm === 'number'
    );
  }

  if (isEmployer) {
    checks.push(
      hasText(user.employerProfile?.kind),
      user.employerProfile?.kind !== 'company' || hasText(user.employerProfile?.companyName),
      hasText(user.employerProfile?.officeAddress)
    );
  }

  const completedCount = checks.filter(Boolean).length;
  return Math.round((completedCount / checks.length) * 100);
};

export const getProfileCompletionTasks = (user: User | null) => [
  {
    key: 'profile',
    title: 'Complete Profile',
    description: 'Personal, professional and employer details',
    complete: isProfileComplete(user),
    icon: 'account-check-outline' as const,
  },
  {
    key: 'kyc',
    title: 'KYC',
    description: 'Aadhaar, selfie and required work documents',
    complete: isKycComplete(user),
    icon: 'shield-check-outline' as const,
  },
  {
    key: 'wallet',
    title: 'Wallet Setup',
    description: 'UPI or bank account for withdrawals',
    complete: isWalletSetupComplete(user),
    icon: 'wallet-outline' as const,
  },
];
