import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { JobEditDialog } from '@/components/shared/JobEditDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useJobsList, useDeleteJob } from '@/hooks/useJobs';
import type { Job } from '@/types';

const STATUS_OPTIONS = ['all', 'open', 'in-progress', 'completed', 'cancelled'];

export const JobModerationPage = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);

  const { data, isLoading } = useJobsList({
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    page,
    limit: 20,
  });
  const deleteJob = useDeleteJob();

  const columns: ColumnDef<Job>[] = [
    { accessorKey: 'title', header: 'Title' },
    {
      id: 'poster',
      header: 'Poster',
      cell: ({ row }) => {
        const poster = row.original.postedBy;
        return typeof poster === 'object' ? poster.name || poster.phone : poster;
      },
    },
    { accessorKey: 'category', header: 'Category', cell: ({ row }) => <span className="capitalize">{row.original.category}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: 'postedDate',
      header: 'Posted Date',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setJobToEdit(row.original)}>
            View / Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setJobToDelete(row.original)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const handleDelete = () => {
    if (!jobToDelete) return;
    deleteJob.mutate(jobToDelete._id, {
      onSuccess: () => {
        toast.success('Job removed.');
        setJobToDelete(null);
      },
      onError: () => toast.error('Failed to delete job.'),
    });
  };

  return (
    <div>
      <PageHeader title="Job Moderation" description="Review, edit, or remove job posts." />

      <div className="mb-4 flex gap-3">
        <Input
          placeholder="Search by title, description, category…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageCount={data?.pagination.pages ?? 1}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!jobToDelete}
        onOpenChange={(open) => !open && setJobToDelete(null)}
        title="Delete this job post?"
        description={`"${jobToDelete?.title}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteJob.isPending}
        onConfirm={handleDelete}
      />

      <JobEditDialog job={jobToEdit} onOpenChange={(open) => !open && setJobToEdit(null)} />
    </div>
  );
};
