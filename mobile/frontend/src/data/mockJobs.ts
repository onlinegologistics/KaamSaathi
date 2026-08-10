import { Job } from '../types';
import { mockUsers } from './mockUsers';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const today = new Date().toISOString();
const inDays = (d: number) => new Date(Date.now() + d * 24 * 3600 * 1000).toISOString();

const posterOf = (u: (typeof mockUsers)[number]) => ({
  name: u.name,
  avatar: u.avatar as string,
  verified: u.verified,
});

// Derives the startAt/endAt/durationHours/startTimeLabel fields this fixture data didn't
// originally carry, from the same (durationLabel hours, date) pair each entry already used.
const deriveTiming = (hours: number, dateIso: string) => {
  const start = new Date(dateIso);
  return {
    durationHours: hours,
    startAt: dateIso,
    endAt: new Date(start.getTime() + hours * 3600 * 1000).toISOString(),
    startTimeLabel: start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
};

export const mockJobsBase: Job[] = [
  {
    id: 'j1',
    posterId: 'u1',
    poster: posterOf(mockUsers[0]),
    title: 'Need 3 people for loading & unloading truck',
    description:
      'Loading furniture into a truck at a warehouse. Heavy lifting involved. Tea and lunch provided.',
    category: 'homeRepair',
    pay: 600,
    payType: 'day',
    location: { latitude: 28.6139, longitude: 77.209, label: 'Connaught Place, Delhi' },
    distanceKm: 1.2,
    durationLabel: '6 hours',
    peopleNeeded: 3,
    peopleApplied: 5,
    postedAt: hoursAgo(2),
    date: today,
    isToday: true,
    ...deriveTiming(6, today),
  },
  {
    id: 'j2',
    posterId: 'u2',
    poster: posterOf(mockUsers[1]),
    title: 'Home tutor needed for 8th grade Maths',
    description:
      'Looking for a tutor to teach Maths to my daughter, 3 days a week, evenings. Must be patient and good at explaining.',
    category: 'painting',
    pay: 300,
    payType: 'hour',
    location: { latitude: 28.5355, longitude: 77.391, label: 'Noida Sector 62' },
    distanceKm: 3.5,
    durationLabel: '2 hours',
    peopleNeeded: 1,
    peopleApplied: 2,
    postedAt: hoursAgo(5),
    date: inDays(1),
    isToday: false,
    ...deriveTiming(2, inDays(1)),
  },
  {
    id: 'j3',
    posterId: 'u3',
    poster: posterOf(mockUsers[2]),
    title: 'Delivery boy needed - two wheeler',
    description:
      'Deliver food packages within 5km radius. Own two-wheeler required. Fuel allowance included.',
    category: 'delivery',
    pay: 450,
    payType: 'day',
    location: { latitude: 28.4595, longitude: 77.0266, label: 'Gurugram, Sector 29' },
    distanceKm: 6.8,
    durationLabel: '5 hours',
    peopleNeeded: 2,
    peopleApplied: 8,
    postedAt: hoursAgo(1),
    date: today,
    isToday: true,
    ...deriveTiming(5, today),
  },
  {
    id: 'j4',
    posterId: 'u4',
    poster: posterOf(mockUsers[3]),
    title: 'Waiters needed for wedding event',
    description:
      'Big wedding function, need experienced waiters for serving food and drinks. Uniform provided.',
    category: 'construction',
    pay: 1200,
    payType: 'fixed',
    location: { latitude: 28.7041, longitude: 77.1025, label: 'Rohini, Delhi' },
    distanceKm: 4.1,
    durationLabel: '8 hours',
    peopleNeeded: 6,
    peopleApplied: 3,
    postedAt: hoursAgo(8),
    date: inDays(2),
    isToday: false,
    ...deriveTiming(8, inDays(2)),
  },
  {
    id: 'j5',
    posterId: 'u5',
    poster: posterOf(mockUsers[4]),
    title: 'House deep cleaning - 3BHK',
    description:
      'Need a team for deep cleaning of a 3BHK apartment before Diwali. All cleaning equipment provided.',
    category: 'cleaning',
    pay: 800,
    payType: 'fixed',
    location: { latitude: 28.4817, longitude: 77.0873, label: 'DLF Phase 3, Gurugram' },
    distanceKm: 2.4,
    durationLabel: '4 hours',
    peopleNeeded: 2,
    peopleApplied: 1,
    postedAt: hoursAgo(12),
    date: today,
    isToday: true,
    ...deriveTiming(4, today),
  },
  {
    id: 'j6',
    posterId: 'u1',
    poster: posterOf(mockUsers[0]),
    title: 'Shop assistant needed for weekend',
    description:
      'Need someone to help manage the counter at a grocery store during weekend rush hours.',
    category: 'electrician',
    pay: 400,
    payType: 'day',
    location: { latitude: 28.6329, longitude: 77.2195, label: 'Karol Bagh, Delhi' },
    distanceKm: 5.6,
    durationLabel: '7 hours',
    peopleNeeded: 1,
    peopleApplied: 4,
    postedAt: hoursAgo(20),
    date: inDays(3),
    isToday: false,
    ...deriveTiming(7, inDays(3)),
  },
  {
    id: 'j7',
    posterId: 'u2',
    poster: posterOf(mockUsers[1]),
    title: 'Painters needed for 2BHK flat',
    description: 'Interior wall painting for a 2BHK flat. Experience with rollers and brushes needed.',
    category: 'homeRepair',
    pay: 700,
    payType: 'day',
    location: { latitude: 28.5672, longitude: 77.321, label: 'Sector 18, Noida' },
    distanceKm: 8.2,
    durationLabel: 'Full day',
    peopleNeeded: 4,
    peopleApplied: 6,
    postedAt: hoursAgo(30),
    date: inDays(1),
    isToday: false,
    ...deriveTiming(8, inDays(1)),
  },
  {
    id: 'j8',
    posterId: 'u3',
    poster: posterOf(mockUsers[2]),
    title: 'English speaking practice tutor',
    description: 'Looking for someone to help improve spoken English, 1 hour daily sessions online or in person.',
    category: 'painting',
    pay: 250,
    payType: 'hour',
    location: { latitude: 28.4646, longitude: 77.0299, label: 'Sector 14, Gurugram' },
    distanceKm: 7.0,
    durationLabel: '1 hour',
    peopleNeeded: 1,
    peopleApplied: 0,
    postedAt: hoursAgo(3),
    date: today,
    isToday: true,
    ...deriveTiming(1, today),
  },
  {
    id: 'j9',
    posterId: 'u4',
    poster: posterOf(mockUsers[3]),
    title: 'Grocery delivery - immediate start',
    description: 'Same-day grocery delivery within local neighborhood. Bicycle or two-wheeler both fine.',
    category: 'delivery',
    pay: 350,
    payType: 'day',
    location: { latitude: 28.699, longitude: 77.116, label: 'Pitampura, Delhi' },
    distanceKm: 3.0,
    durationLabel: '4 hours',
    peopleNeeded: 3,
    peopleApplied: 2,
    postedAt: hoursAgo(0.5),
    date: today,
    isToday: true,
    ...deriveTiming(4, today),
  },
  {
    id: 'j10',
    posterId: 'u5',
    poster: posterOf(mockUsers[4]),
    title: 'Office cleaning staff - night shift',
    description: 'Regular office cleaning after work hours. Long-term opportunity for reliable workers.',
    category: 'cleaning',
    pay: 500,
    payType: 'day',
    location: { latitude: 28.4949, longitude: 77.0891, label: 'Cyber City, Gurugram' },
    distanceKm: 9.4,
    durationLabel: '3 hours',
    peopleNeeded: 2,
    peopleApplied: 1,
    postedAt: hoursAgo(15),
    date: inDays(1),
    isToday: false,
    ...deriveTiming(3, inDays(1)),
  },
];

// Generate a larger paginated pool by cloning with slight variation for infinite scroll demo.
export const generateMockJobs = (): Job[] => {
  const extended: Job[] = [...mockJobsBase];
  for (let batch = 1; batch <= 2; batch++) {
    mockJobsBase.forEach((job, idx) => {
      extended.push({
        ...job,
        id: `${job.id}-b${batch}`,
        distanceKm: +(job.distanceKm + batch * 1.3 + idx * 0.2).toFixed(1),
        postedAt: hoursAgo(idx + batch * 6),
      });
    });
  }
  return extended;
};

export const mockJobs: Job[] = generateMockJobs();
