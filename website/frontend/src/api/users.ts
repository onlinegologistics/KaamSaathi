import client from './client';
import type { Job, Paginated, User } from '@/types';

export interface UserFilters {
  search?: string;
  isBlocked?: boolean;
  isVerified?: boolean;
  minRating?: number;
  location?: string;
  page?: number;
  limit?: number;
}

export const fetchUsers = async (filters: UserFilters) => {
  const { data } = await client.get<{ success: true } & Paginated<User>>('/users', { params: filters });
  return data;
};

export interface UserDetailResponse {
  user: User;
  jobsPosted: Job[];
  jobsWorked: Job[];
  ratingsReceived: Array<{
    _id: string;
    score: number;
    comment: string;
    createdAt: string;
    ratedBy: { _id: string; name?: string; photoUrl?: string };
  }>;
}

export const fetchUserDetail = async (id: string) => {
  const { data } = await client.get<{ success: true } & UserDetailResponse>(`/users/${id}`);
  return data;
};

export const blockUser = async (id: string) => {
  const { data } = await client.put<{ success: true; user: User }>(`/users/${id}/block`);
  return data.user;
};

export const unblockUser = async (id: string) => {
  const { data } = await client.put<{ success: true; user: User }>(`/users/${id}/unblock`);
  return data.user;
};

export const verifyUser = async (id: string) => {
  const { data } = await client.put<{ success: true; user: User }>(`/users/${id}/verify`);
  return data.user;
};
