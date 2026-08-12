import client from './client';
import type { Ad } from '@/types';

export const fetchAds = async () => {
  const { data } = await client.get<{ success: true; ads: Ad[] }>('/ads');
  return data.ads;
};

export interface AdPayload {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  targetAccountType: 'worker' | 'employer' | 'both' | 'all';
  isActive?: boolean;
  sortOrder?: number;
}

export const createAd = async (payload: AdPayload) => {
  const { data } = await client.post<{ success: true; ad: Ad }>('/ads', payload);
  return data.ad;
};

export const updateAd = async (id: string, payload: Partial<AdPayload>) => {
  const { data } = await client.put<{ success: true; ad: Ad }>(`/ads/${id}`, payload);
  return data.ad;
};

export const toggleAd = async (id: string) => {
  const { data } = await client.patch<{ success: true; ad: Ad }>(`/ads/${id}/toggle`);
  return data.ad;
};

export const deleteAd = async (id: string) => {
  await client.delete(`/ads/${id}`);
};
