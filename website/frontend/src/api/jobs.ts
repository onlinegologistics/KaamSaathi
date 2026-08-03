import client from './client';
import type { Job, Paginated } from '@/types';

export interface JobFilters {
  search?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export const fetchJobs = async (filters: JobFilters) => {
  const { data } = await client.get<{ success: true } & Paginated<Job>>('/jobs', { params: filters });
  return data;
};

export const fetchJob = async (id: string) => {
  const { data } = await client.get<{ success: true; job: Job }>(`/jobs/${id}`);
  return data.job;
};

export const updateJob = async (id: string, payload: Partial<Job>) => {
  const { data } = await client.put<{ success: true; job: Job }>(`/jobs/${id}`, payload);
  return data.job;
};

export const deleteJob = async (id: string) => {
  await client.delete(`/jobs/${id}`);
};
