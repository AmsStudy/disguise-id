'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const NAV_ITEMS = [
  {
    name: 'Observability',
    path: '/dashboard/ml-v2',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
  },
  {
    name: 'Operator Reviews',
    path: '/dashboard/ml-v2/reviews',
    requiresRole: ['admin', 'operator', 'investigator', 'super_admin'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    name: 'Promotions',
    path: '/dashboard/ml-v2/promotions',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
    ),
  },
  {
    name: 'Reviewed Alerts',
    path: '/dashboard/ml-v2/reviewed-alerts',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export const MlV2ReviewNavigation = () => {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const visibleTabs = NAV_ITEMS.filter(tab =>
    !tab.requiresRole || tab.requiresRole.includes(user?.role || '')
  );

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '6px',
      padding: '4px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.07)',
      width: 'fit-content',
    }}>
      {visibleTabs.map((tab) => {
        const isActive =
          pathname === tab.path ||
          (tab.path !== '/dashboard/ml-v2' && pathname?.startsWith(tab.path));

        return (
          <Link
            key={tab.path}
            href={tab.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              letterSpacing: '0.01em',
              background: isActive ? 'rgba(0,229,255,0.1)' : 'transparent',
              color: isActive ? '#00E5FF' : 'rgba(255,255,255,0.45)',
              border: isActive ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
              boxShadow: isActive ? '0 0 20px rgba(0,229,255,0.08)' : 'none',
            }}
          >
            <span style={{ color: isActive ? '#00E5FF' : 'rgba(255,255,255,0.3)', display: 'flex' }}>
              {tab.icon}
            </span>
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </div>
  );
};
