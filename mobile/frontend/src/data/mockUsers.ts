import { User } from '../types';

// Local mock users. Avatars use DiceBear (deterministic, no backend needed).
const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}`;

export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    avatar: avatar('Ramesh'),
    verified: true,
    rating: 4.8,
    jobsPosted: 23,
    jobsCompleted: 41,
    location: { latitude: 28.6139, longitude: 77.209, label: 'Connaught Place, Delhi' },
  },
  {
    id: 'u2',
    name: 'Priya Sharma',
    phone: '+91 98123 45678',
    avatar: avatar('Priya'),
    verified: true,
    rating: 4.6,
    jobsPosted: 12,
    jobsCompleted: 8,
    location: { latitude: 28.5355, longitude: 77.391, label: 'Noida Sector 62' },
  },
  {
    id: 'u3',
    name: 'Amit Verma',
    phone: '+91 99887 66554',
    avatar: avatar('Amit'),
    verified: false,
    rating: 4.2,
    jobsPosted: 5,
    jobsCompleted: 19,
    location: { latitude: 28.4595, longitude: 77.0266, label: 'Gurugram, Sector 29' },
  },
  {
    id: 'u4',
    name: 'Sunita Devi',
    phone: '+91 97654 32109',
    avatar: avatar('Sunita'),
    verified: true,
    rating: 4.9,
    jobsPosted: 34,
    jobsCompleted: 5,
    location: { latitude: 28.7041, longitude: 77.1025, label: 'Rohini, Delhi' },
  },
  {
    id: 'u5',
    name: 'Vikram Singh',
    phone: '+91 96543 21098',
    avatar: avatar('Vikram'),
    verified: false,
    rating: 4.0,
    jobsPosted: 2,
    jobsCompleted: 27,
    location: { latitude: 28.4817, longitude: 77.0873, label: 'DLF Phase 3, Gurugram' },
  },
];
