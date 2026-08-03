import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as jobsApi from '@/api/jobs';
import type { JobFilters } from '@/api/jobs';
import type { Job } from '@/types';

export const useJobsList = (filters: JobFilters) =>
  useQuery({ queryKey: ['jobs', filters], queryFn: () => jobsApi.fetchJobs(filters) });

export const useUpdateJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Job> }) => jobsApi.updateJob(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
};

export const useDeleteJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: jobsApi.deleteJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
};
