import { useMutation, useQuery } from '@tanstack/react-query';
import * as transactionsApi from '@/api/transactions';
import type { TransactionFilters } from '@/api/transactions';

export const useTransactionsList = (filters: TransactionFilters) =>
  useQuery({ queryKey: ['transactions', filters], queryFn: () => transactionsApi.fetchTransactions(filters) });

export const useExportTransactionsCsv = () =>
  useMutation({ mutationFn: transactionsApi.exportTransactionsCsv });
