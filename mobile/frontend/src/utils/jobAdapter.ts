import { BackendJob } from '../services/api';
import { Job, JobCategory } from '../types';
import { haversineKm } from './geo';

const isSameCalendarDay = (isoDate: string) => {
  const d = new Date(isoDate);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  );
};

export const formatDurationHours = (hours: number): string => `${hours} hour${hours === 1 ? '' : 's'}`;

export const formatTimeLabel = (isoDate: string): string =>
  new Date(isoDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// Older jobs (posted before endAt existed) never got one persisted — derive it the same way
// the backend does (scheduledFor + duration hours) so the UI never shows a blank end time.
const HOUR_MS = 60 * 60 * 1000;
const resolveEndAt = (job: BackendJob): string =>
  job.endAt ?? new Date(new Date(job.scheduledFor).getTime() + job.duration * HOUR_MS).toISOString();

/**
 * Maps a real BackendJob into the Job shape screens already render. The real
 * Job model has no per-day/per-hour pay distinction, so payType is always
 * 'fixed' here — the UI shows a flat "₹{amount}" instead of a "/day" suffix.
 */
export const toJobViewModel = (
  job: BackendJob,
  userLocation?: { latitude: number; longitude: number }
): Job => {
  const [lng, lat] = job.location.coordinates;
  const distanceKm = userLocation ? Number(haversineKm(userLocation, { latitude: lat, longitude: lng }).toFixed(1)) : 0;

  return {
    id: job._id,
    posterId: job.postedBy._id,
    poster: {
      name: job.postedBy.name || 'User',
      avatar: job.postedBy.photoUrl || '',
      verified: job.postedBy.aadhaarVerification?.isVerified ?? false,
    },
    title: job.title,
    description: job.description,
    category: job.category as JobCategory,
    categoryGroup: job.categoryGroup,
    pay: job.payAmount,
    payType: 'fixed',
    location: { latitude: lat, longitude: lng, label: job.location.address },
    distanceKm,
    durationHours: job.duration,
    durationLabel: formatDurationHours(job.duration),
    peopleNeeded: job.peopleNeeded,
    peopleApplied: job.applicants.length,
    postedAt: job.createdAt,
    date: job.scheduledFor,
    isToday: isSameCalendarDay(job.scheduledFor),
    startAt: job.scheduledFor,
    endAt: resolveEndAt(job),
    startTimeLabel: formatTimeLabel(job.scheduledFor),
    suggestedMinimumPrice: job.suggestedMinimumPrice,
  };
};
