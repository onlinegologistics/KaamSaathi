import client from './client';
import type { MinimumPriceRule, Paginated } from '@/types';

export interface PricingRuleFilters {
  city?: string;
  area?: string;
  category?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export const fetchPricingRules = async (filters: PricingRuleFilters) => {
  const { data } = await client.get<{ success: true } & Paginated<MinimumPriceRule>>('/pricing', {
    params: filters,
  });
  return data;
};

export interface PricingRulePayload {
  city?: string;
  area?: string;
  category?: string;
  baseMinimumPrice: number;
  hourlyRate?: number;
  minimumDurationMinutes?: number;
  isActive?: boolean;
}

export const createPricingRule = async (payload: PricingRulePayload) => {
  const { data } = await client.post<{ success: true; rule: MinimumPriceRule }>('/pricing', payload);
  return data.rule;
};

export const updatePricingRule = async ({ id, payload }: { id: string; payload: Partial<PricingRulePayload> }) => {
  const { data } = await client.put<{ success: true; rule: MinimumPriceRule }>(`/pricing/${id}`, payload);
  return data.rule;
};

export const togglePricingRule = async (id: string) => {
  const { data } = await client.patch<{ success: true; rule: MinimumPriceRule }>(`/pricing/${id}/toggle`);
  return data.rule;
};

export const deletePricingRule = async (id: string) => {
  await client.delete(`/pricing/${id}`);
};
