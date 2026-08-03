import { Users, Briefcase, CheckCircle2, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { useDashboardStats } from '@/hooks/useDashboardStats';

export const DashboardPage = () => {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform overview at a glance." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={isLoading ? '—' : stats?.totalUsers ?? 0}
          icon={Users}
        />
        <StatCard
          label="Active Jobs"
          value={isLoading ? '—' : stats?.activeJobs ?? 0}
          icon={Briefcase}
        />
        <StatCard
          label="Completed Jobs Today"
          value={isLoading ? '—' : stats?.completedJobsToday ?? 0}
          icon={CheckCircle2}
        />
        <StatCard
          label="New Signups This Week"
          value={isLoading ? '—' : stats?.newSignupsThisWeek ?? 0}
          icon={UserPlus}
        />
      </div>
    </div>
  );
};
