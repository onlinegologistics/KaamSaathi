import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePayoutsList, useMarkPayoutPaid } from '@/hooks/usePayouts';
import type { Payout } from '@/types';

const STATUS_OPTIONS = ['pending', 'paid', 'all'];

export const PayoutsPage = () => {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [payoutToConfirm, setPayoutToConfirm] = useState<Payout | null>(null);

  const { data, isLoading } = usePayoutsList({
    status: status === 'all' ? undefined : status,
    page,
    limit: 20,
  });
  const markPaid = useMarkPayoutPaid();

  const columns: ColumnDef<Payout>[] = [
    {
      id: 'payee',
      header: 'Worker',
      cell: ({ row }) => {
        const payee = row.original.payee;
        return typeof payee === 'object' ? payee.name || payee.phone : payee;
      },
    },
    { id: 'amount', header: 'Amount', cell: ({ row }) => `₹${row.original.amount}` },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: 'paidAt',
      header: 'Paid At',
      cell: ({ row }) => (row.original.paidAt ? new Date(row.original.paidAt).toLocaleDateString() : '—'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'pending' ? (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setPayoutToConfirm(row.original)}>
              Mark as Paid
            </Button>
          </div>
        ) : null,
    },
  ];

  const handleConfirm = () => {
    if (!payoutToConfirm) return;
    markPaid.mutate(payoutToConfirm._id, {
      onSuccess: () => {
        toast.success('Payout marked as paid.');
        setPayoutToConfirm(null);
      },
      onError: () => toast.error('Failed to mark payout as paid.'),
    });
  };

  return (
    <div>
      <PageHeader title="Payout Management" description="Pending worker payouts." />

      <div className="mb-4">
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
        open={!!payoutToConfirm}
        onOpenChange={(open) => !open && setPayoutToConfirm(null)}
        title="Mark this payout as paid?"
        description={`This confirms ₹${payoutToConfirm?.amount} has been paid out manually.`}
        confirmLabel="Mark as Paid"
        loading={markPaid.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
