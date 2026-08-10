import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { JobModerationPage } from '@/pages/admin/JobModerationPage';
import { CategoriesPage } from '@/pages/admin/CategoriesPage';
import { PricingPage } from '@/pages/admin/PricingPage';
import { ApprovalsPage } from '@/pages/admin/ApprovalsPage';
import { ReportsQueuePage } from '@/pages/admin/ReportsQueuePage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { TransactionsPage } from '@/pages/accounting/TransactionsPage';
import { RevenueChartsPage } from '@/pages/accounting/RevenueChartsPage';
import { PayoutsPage } from '@/pages/accounting/PayoutsPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { UserDetailPage } from '@/pages/users/UserDetailPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/jobs', element: <JobModerationPage /> },
          { path: '/categories', element: <CategoriesPage /> },
          { path: '/pricing', element: <PricingPage /> },
          { path: '/approvals', element: <ApprovalsPage /> },
          { path: '/reports', element: <ReportsQueuePage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/settings/:tab', element: <SettingsPage /> },
          { path: '/transactions', element: <TransactionsPage /> },
          { path: '/revenue', element: <RevenueChartsPage /> },
          { path: '/payouts', element: <PayoutsPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '/users/:id', element: <UserDetailPage /> },
        ],
      },
    ],
  },
]);
