'use client';

import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { useAuthStore } from '@/store/authStore';
import { useAlertStore } from '@/store/alertStore';
import { formatDate } from '@/utils/format';

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/monitor': 'Live Monitor',
  '/dashboard/alerts': 'Alerts',
  '/dashboard/ml-v2': 'ML V2',
  '/dashboard/watchlist': 'Watchlist',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/users': 'Users',
  '/dashboard/audit': 'Audit Trail',
  '/dashboard/settings': 'Settings',
};

export const Topbar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unreadCount } = useAlertStore();
  const pageName = breadcrumbMap[pathname] || 'Dashboard';
  const now = new Date();

  return (
    <header
      style={{
        height: 72,
        background: 'rgba(17, 34, 54, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0, 229, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left: Breadcrumb */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#4A6B84', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>DISGUISE-ID</span>
          <span style={{ color: '#4A6B84', fontSize: '13px' }}>/</span>
          <span style={{ color: '#00CFE8', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>{pageName}</span>
        </div>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: '#E8F4F8', marginTop: '2px' }}>
          {pageName}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ color: '#4A6B84', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>
          {formatDate(now, 'EEEE, dd MMM yyyy')}
        </div>

        <button
          aria-label="Search"
          style={{
            background: 'rgba(17, 34, 54, 0.6)', border: '1px solid rgba(0, 229, 255, 0.12)',
            borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center',
            gap: '8px', cursor: 'pointer', color: '#4A6B84',
          }}
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: '14px' }} />
          <span style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>Cari...</span>
        </button>

        <button
          aria-label={`${unreadCount} unread alerts`}
          style={{
            background: 'rgba(17, 34, 54, 0.6)', border: '1px solid rgba(0, 229, 255, 0.12)',
            borderRadius: '10px', padding: '10px 12px', cursor: 'pointer',
            color: unreadCount > 0 ? '#FF6B35' : '#4A6B84',
            position: 'relative', display: 'flex', alignItems: 'center',
          }}
        >
          <FontAwesomeIcon icon={faBell} style={{ fontSize: '16px' }} />
          {unreadCount > 0 && (
            <div
              style={{
                position: 'absolute', top: 6, right: 6, width: 8, height: 8,
                borderRadius: '50%', background: '#FF3D3D', boxShadow: '0 0 6px #FF3D3D',
                animation: 'pulseGlow 1.5s ease-in-out infinite',
              }}
            />
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0097B2, #00E5FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Orbitron, monospace', fontSize: '14px', fontWeight: 700,
              color: '#060D14', border: '2px solid rgba(0, 229, 255, 0.3)', cursor: 'pointer',
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#E8F4F8', fontFamily: 'Inter, sans-serif' }}>
              {user?.name || 'Operator'}
            </div>
            <div style={{ fontSize: '11px', color: '#4A6B84', textTransform: 'capitalize' }}>
              {user?.role || 'operator'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
