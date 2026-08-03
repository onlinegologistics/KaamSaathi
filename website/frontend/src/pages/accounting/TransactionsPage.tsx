import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTransactionsList, useExportTransactionsCsv } from '@/hooks/useTransactions';
import type { Transaction } from '@/types';

const STATUS_OPTIONS = ['all', 'pending', 'completed', 'failed', 'refunded'];

const personLabel = (value: Transaction['payer']) =>
  typeof value === 'object' ? value.name || value.phone : value;

export const TransactionsPage = () => {
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const filters = {
    status: status === 'all' ? undefined : status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading } = useTransactionsList({ ...filters, page, limit: 20 });
  const exportCsv = useExportTransactionsCsv();

  const columns: ColumnDef<Transaction>[] = [
    {
      id: 'jobId',
      header: 'Job',
      cell: ({ row }) => {
        const job = row.original.job;
        return typeof job === 'object' ? job.title : job;
      },
    },
    { id: 'payer', header: 'Payer', cell: ({ row }) => personLabel(row.original.payer) },
    { id: 'payee', header: 'Payee', cell: ({ row }) => personLabel(row.original.payee) },
    { id: 'amount', header: 'Amount', cell: ({ row }) => `₹${row.original.amount}` },
    {
      id: 'commission',
      header: 'Platform Commission',
      cell: ({ row }) => `₹${row.original.platformCommission}`,
    },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  ];

  const handleExport = () => {
    exportCsv.mutate(filters, {
      onError: () => toast.error('Failed to export CSV.'),
    });
  };

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="All platform payments and commissions."
        actions={
          <Button variant="outline" onClick={handleExport} disabled={exportCsv.isPending}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
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
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="w-44"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="w-44"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageCount={data?.pagination.pages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
};
