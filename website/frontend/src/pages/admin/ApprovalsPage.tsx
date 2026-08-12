import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Banknote, CheckCircle2, Eye, ShieldCheck, UserCog, Wallet, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useApproveAccountTypeChange,
  useApproveKyc,
  useApproveWallet,
  useRejectAccountTypeChange,
  useRejectKyc,
  useRejectWallet,
  useUsersList,
} from '@/hooks/useUsers';
import { useApproveWithdrawal, useRejectWithdrawal, useWithdrawalsList } from '@/hooks/useWallet';
import type { User, WalletTransaction } from '@/types';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const withdrawalUserName = (user: WalletTransaction['user']) =>
  typeof user === 'string' ? user : user.name || user.phone;

const mergeUsers = (...lists: Array<User[] | undefined>) => {
  const byId = new Map<string, User>();
  lists.flatMap((list) => list ?? []).forEach((user) => byId.set(user._id, user));
  return Array.from(byId.values());
};

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : 'Not submitted');

export const ApprovalsPage = () => {
  const navigate = useNavigate();
  const kycPending = useUsersList({ kycStatus: 'submitted', page: 1, limit: 100 });
  const walletPending = useUsersList({ walletStatus: 'submitted', page: 1, limit: 100 });
  const accountTypePending = useUsersList({ accountTypeStatus: 'pending', page: 1, limit: 100 });
  const withdrawalsPending = useWithdrawalsList({ status: 'pending', page: 1, limit: 100 });
  const approveKyc = useApproveKyc();
  const rejectKyc = useRejectKyc();
  const approveWallet = useApproveWallet();
  const rejectWallet = useRejectWallet();
  const approveAccountType = useApproveAccountTypeChange();
  const rejectAccountType = useRejectAccountTypeChange();
  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();

  const users = useMemo(
    () => mergeUsers(kycPending.data?.data, walletPending.data?.data, accountTypePending.data?.data),
    [kycPending.data?.data, walletPending.data?.data, accountTypePending.data?.data]
  );
  const isLoading = kycPending.isLoading || walletPending.isLoading || accountTypePending.isLoading;
  const actionPending =
    approveKyc.isPending ||
    rejectKyc.isPending ||
    approveWallet.isPending ||
    rejectWallet.isPending ||
    approveAccountType.isPending ||
    rejectAccountType.isPending;
  const withdrawals = withdrawalsPending.data?.data ?? [];
  const withdrawalActionPending = approveWithdrawal.isPending || rejectWithdrawal.isPending;

  const handleApproveKyc = (user: User) => {
    approveKyc.mutate(user._id, {
      onSuccess: () => toast.success('KYC approved.'),
      onError: () => toast.error('Failed to approve KYC.'),
    });
  };

  const handleRejectKyc = (user: User) => {
    const reason = window.prompt('KYC reject reason', user.kyc?.rejectionReason || '');
    if (reason === null) return;
    rejectKyc.mutate(
      { id: user._id, reason },
      {
        onSuccess: () => toast.success('KYC rejected.'),
        onError: () => toast.error('Failed to reject KYC.'),
      }
    );
  };

  const handleApproveWallet = (user: User) => {
    approveWallet.mutate(user._id, {
      onSuccess: () => toast.success('Wallet approved.'),
      onError: () => toast.error('Failed to approve wallet.'),
    });
  };

  const handleRejectWallet = (user: User) => {
    const reason = window.prompt('Wallet reject reason', user.wallet?.rejectionReason || '');
    if (reason === null) return;
    rejectWallet.mutate(
      { id: user._id, reason },
      {
        onSuccess: () => toast.success('Wallet rejected.'),
        onError: () => toast.error('Failed to reject wallet.'),
      }
    );
  };

  const handleApproveAccountType = (user: User) => {
    approveAccountType.mutate(user._id, {
      onSuccess: () => toast.success('Account type change approved.'),
      onError: () => toast.error('Failed to approve account type change.'),
    });
  };

  const handleRejectAccountType = (user: User) => {
    const reason = window.prompt('Account type reject reason', user.accountTypeChange?.rejectionReason || '');
    if (reason === null) return;
    rejectAccountType.mutate(
      { id: user._id, reason },
      {
        onSuccess: () => toast.success('Account type change rejected.'),
        onError: () => toast.error('Failed to reject account type change.'),
      }
    );
  };

  const handleApproveWithdrawal = (transaction: WalletTransaction) => {
    approveWithdrawal.mutate(transaction._id, {
      onSuccess: () => toast.success('Withdrawal approved.'),
      onError: () => toast.error('Failed to approve withdrawal.'),
    });
  };

  const handleRejectWithdrawal = (transaction: WalletTransaction) => {
    const reason = window.prompt('Withdrawal reject reason', '');
    if (reason === null) return;
    rejectWithdrawal.mutate(
      { id: transaction._id, reason },
      {
        onSuccess: () => toast.success('Withdrawal rejected and balance refunded.'),
        onError: () => toast.error('Failed to reject withdrawal.'),
      }
    );
  };

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Review submitted KYC, wallet setup, and account type change requests."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending KYC</CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{kycPending.data?.pagination.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Wallet</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{walletPending.data?.pagination.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Account Type</CardTitle>
            <UserCog className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{accountTypePending.data?.pagination.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Withdrawals</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{withdrawalsPending.data?.pagination.total ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading approvals...</p>
      ) : users.length ? (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user._id}>
              <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.1fr_1fr_1fr_1fr_auto] lg:items-center">
                <div>
                  <p className="font-semibold">{user.name || 'Unnamed user'}</p>
                  <p className="text-sm text-muted-foreground">{user.phone}</p>
                  {user.email ? <p className="text-xs text-muted-foreground">{user.email}</p> : null}
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">KYC</span>
                    <StatusBadge status={user.kyc?.status ?? 'not_started'} />
                  </div>
                  <p className="text-xs text-muted-foreground">Submitted: {formatDateTime(user.kyc?.submittedAt)}</p>
                  {user.kyc?.status === 'submitted' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleApproveKyc(user)} disabled={actionPending}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRejectKyc(user)} disabled={actionPending}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Wallet</span>
                    <StatusBadge status={user.wallet?.status ?? 'not_started'} />
                  </div>
                  <p className="text-xs text-muted-foreground">Submitted: {formatDateTime(user.wallet?.submittedAt)}</p>
                  {user.wallet?.status === 'submitted' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleApproveWallet(user)} disabled={actionPending}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRejectWallet(user)} disabled={actionPending}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  ) : null}
                </div>

                {user.accountTypeChange?.status === 'pending' ? (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Account Type</span>
                      <StatusBadge status={user.accountTypeChange.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(user.accountType ?? 'worker')} &rarr; {user.accountTypeChange.requestedType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested: {formatDateTime(user.accountTypeChange.requestedAt)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleApproveAccountType(user)} disabled={actionPending}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectAccountType(user)}
                        disabled={actionPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div />
                )}

                <Button variant="outline" size="sm" onClick={() => navigate(`/users/${user._id}`)}>
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No KYC, wallet, or account type approvals are pending.
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Pending Withdrawals</h2>
      {withdrawalsPending.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading withdrawals...</p>
      ) : withdrawals.length ? (
        <div className="space-y-3">
          {withdrawals.map((transaction) => (
            <Card key={transaction._id}>
              <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                <div>
                  <p className="font-semibold">{withdrawalUserName(transaction.user)}</p>
                  <p className="text-sm text-muted-foreground">Requested: {formatDateTime(transaction.createdAt)}</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{formatCurrency(transaction.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    Balance after: {formatCurrency(transaction.balanceAfter)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleApproveWithdrawal(transaction)} disabled={withdrawalActionPending}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRejectWithdrawal(transaction)}
                    disabled={withdrawalActionPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No withdrawal requests are pending.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
