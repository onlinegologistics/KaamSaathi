import { BackendJob } from '../services/api';
import { Job, JobCategory } from '../types';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

const haversineKm = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number => {
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isSameCalendarDay = (isoDate: string) => {
  const d = new Date(isoDate);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  );
};

export const formatDurationHours = (hours: number): string => `${hours} hour${hours === 1 ? '' : 's'}`;

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
    pay: job.payAmount,
    payType: 'fixed',
    location: { latitude: lat, longitude: lng, label: job.location.address },
    distanceKm,
    durationLabel: formatDurationHours(job.duration),
    peopleNeeded: job.peopleNeeded,
    peopleApplied: job.applicants.length,
    postedAt: job.createdAt,
    date: job.scheduledFor,
    isToday: isSameCalendarDay(job.scheduledFor),
  };
};
