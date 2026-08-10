import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as pricingApi from '@/api/pricing';
import type { PricingRuleFilters } from '@/api/pricing';

export const usePricingRulesList = (filters: PricingRuleFilters) =>
  useQuery({ queryKey: ['pricing-rules', filters], queryFn: () => pricingApi.fetchPricingRules(filters) });

export const useCreatePricingRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pricingApi.createPricingRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-rules'] }),
  });
};

export const useUpdatePricingRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pricingApi.updatePricingRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-rules'] }),
  });
};

export const useTogglePricingRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pricingApi.togglePricingRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-rules'] }),
  });
};

export const useDeletePricingRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pricingApi.deletePricingRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-rules'] }),
  });
};
