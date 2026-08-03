import client from './client';
import type { Paginated, Transaction } from '@/types';

export interface TransactionFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const fetchTransactions = async (filters: TransactionFilters) => {
  const { data } = await client.get<{ success: true } & Paginated<Transaction>>('/transactions', { params: filters });
  return data;
};

export const exportTransactionsCsv = async (filters: Omit<TransactionFilters, 'page' | 'limit'>) => {
  const response = await client.get('/transactions/export', {
    params: filters,
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `transactions-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
