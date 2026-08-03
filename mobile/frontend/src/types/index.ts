export type JobCategory =
  | 'homeRepair'
  | 'cleaning'
  | 'delivery'
  | 'construction'
  | 'electrician'
  | 'plumbing'
  | 'painting';

export interface User {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  email?: string;
  dateOfBirth?: string;
  education?: string;
  currentAddress?: string;
  verified: boolean;
  rating: number;
  jobsPosted: number;
  jobsCompleted: number;
  location?: {
    latitude: number;
    longitude: number;
    label: string;
  };
}

export interface Job {
  id: string;
  posterId: string;
  poster: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  title: string;
  description: string;
  category: JobCategory;
  pay: number;
  payType: 'day' | 'hour' | 'fixed';
  location: {
    latitude: number;
    longitude: number;
    label: string;
  };
  distanceKm: number;
  durationLabel: string;
  peopleNeeded: number;
  peopleApplied: number;
  postedAt: string; // ISO
  date: string; // ISO date for the job itself
  isToday: boolean;
}

export interface CategoryMeta {
  key: JobCategory;
  labelKey: JobCategory;
  icon: string;
  color: string;
}
