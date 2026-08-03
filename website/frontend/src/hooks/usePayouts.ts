import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as payoutsApi from '@/api/payouts';
import type { PayoutFilters } from '@/api/payouts';

export const usePayoutsList = (filters: PayoutFilters) =>
  useQuery({ queryKey: ['payouts', filters], queryFn: () => payoutsApi.fetchPayouts(filters) });

export const useMarkPayoutPaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payoutsApi.markPayoutPaid,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payouts'] }),
  });
};
