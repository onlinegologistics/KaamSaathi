import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as adsApi from '@/api/ads';
import type { AdPayload } from '@/api/ads';

export const useAdsList = () => useQuery({ queryKey: ['ads'], queryFn: adsApi.fetchAds });

export const useCreateAd = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdPayload) => adsApi.createAd(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ads'] }),
  });
};

export const useUpdateAd = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AdPayload> }) => adsApi.updateAd(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ads'] }),
  });
};

export const useToggleAd = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adsApi.toggleAd,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ads'] }),
  });
};

export const useDeleteAd = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adsApi.deleteAd,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ads'] }),
  });
};
