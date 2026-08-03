import client from './client';
import type { Paginated, Payout } from '@/types';

export interface PayoutFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export const fetchPayouts = async (filters: PayoutFilters) => {
  const { data } = await client.get<{ success: true } & Paginated<Payout>>('/payouts', { params: filters });
  return data;
};

export const markPayoutPaid = async (id: string) => {
  const { data } = await client.put<{ success: true; payout: Payout }>(`/payouts/${id}/pay`);
  return data.payout;
};
