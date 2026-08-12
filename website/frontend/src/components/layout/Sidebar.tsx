import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Tags,
  Flag,
  ShieldCheck,
  Settings,
  Receipt,
  LineChart,
  Wallet,
  Users,
  ChevronDown,
  IndianRupee,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navSections = [
  {
    label: 'Admin Panel',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/jobs', label: 'Job Moderation', icon: Briefcase },
      { to: '/categories', label: 'Categories', icon: Tags },
      { to: '/ads', label: 'Ads', icon: Megaphone },
      { to: '/pricing', label: 'Minimum Pricing', icon: IndianRupee },
      { to: '/approvals', label: 'Approvals', icon: ShieldCheck },
      { to: '/reports', label: 'Reported Content', icon: Flag },
      {
        label: 'App Settings',
        icon: Settings,
        basePath: '/settings',
        children: [
          { to: '/settings/categories', label: 'Category Toggles' },
          { to: '/settings/content', label: 'Static Content' },
        ],
      },
    ],
  },
  {
    label: 'Accounting',
    items: [
      { to: '/transactions', label: 'Transactions', icon: Receipt },
      { to: '/revenue', label: 'Revenue', icon: LineChart },
      { to: '/payouts', label: 'Payouts', icon: Wallet },
    ],
  },
  {
    label: 'Users',
    items: [{ to: '/users', label: 'All Users', icon: Users }],
  },
];

const CollapsibleNavItem = ({
  item,
  isParentActive,
}: {
  item: (typeof navSections)[number]['items'][number] & { basePath?: string; children?: { to: string; label: string }[] };
  isParentActive: boolean;
}) => {
  const [open, setOpen] = useState(isParentActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isParentActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <item.icon className="h-4 w-4" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && item.children ? (
        <div className="ml-6 mt-0.5 space-y-0.5 border-l pl-3">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'font-medium text-primary'
                    : 'text-foreground/70 hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="hidden w-72 shrink-0 border-r bg-card/95 shadow-sm md:flex md:flex-col">
      <div className="flex h-20 items-center border-b px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
          KS
        </div>
        <div className="ml-3 min-w-0">
          <p className="truncate text-lg font-bold leading-5 tracking-tight">AnyWork</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">Admin Control Center</p>
        </div>
      </div>
      <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                if ('children' in item && item.children) {
                  const isParentActive = location.pathname.startsWith(item.basePath);
                  return <CollapsibleNavItem key={item.label} item={item} isParentActive={isParentActive} />;
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};
