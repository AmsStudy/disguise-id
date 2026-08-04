'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge, faVideo, faBell, faUsers, faBriefcase,
  faChartBar, faGear, faRightFromBracket,
  faChevronLeft, faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { useAuthStore } from '@/store/authStore';
import { useAlertStore } from '@/store/alertStore';
import { Badge } from '@/components/ui/Badge';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: faGauge },
  { href: '/dashboard/monitor', label: 'Live Monitor', icon: faVideo },
  { href: '/dashboard/alerts', label: 'Alerts', icon: faBell, badge: true },
  { href: '/dashboard/watchlist', label: 'Watchlist', icon: faUsers },
  { href: '/dashboard/cases', label: 'Cases', icon: faBriefcase },
  { href: '/dashboard/analytics', label: 'Analytics', icon: faChartBar },
  { href: '/dashboard/settings', label: 'Settings', icon: faGear },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useAlertStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      style={{
        background: '#112236',
        borderRight: '1px solid rgba(0, 229, 255, 0.1)',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? '20px 0' : '20px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(0, 229, 255, 0.08)',
          height: 72,
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <Image src="/assets/logo.png" alt="Logo" width={32} height={32} style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', fontWeight: 700, color: '#E8F4F8' }}>
              DISGUISE<span style={{ color: '#00E5FF' }}>-ID</span>
            </span>
          </Link>
        )}
        {collapsed && <Image src="/assets/logo.png" alt="Logo" width={32} height={32} style={{ objectFit: 'contain' }} />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.15)',
            borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#8BAFC4',
            display: 'flex', alignItems: 'center', flexShrink: 0,
            marginLeft: collapsed ? 0 : '8px',
          }}
        >
          <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} style={{ fontSize: '12px' }} />
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: collapsed ? '12px 0' : '12px 20px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  margin: '2px 8px', borderRadius: '12px',
                  background: isActive ? 'rgba(0, 56, 71, 0.8)' : 'transparent',
                  borderLeft: isActive ? '3px solid #00E5FF' : '3px solid transparent',
                  color: isActive ? '#00CFE8' : '#8BAFC4',
                  transition: 'all 0.2s ease', cursor: 'pointer', position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.05)'; e.currentTarget.style.color = '#E8F4F8'; }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8BAFC4'; }
                }}
              >
                <FontAwesomeIcon icon={item.icon} style={{ fontSize: '15px', flexShrink: 0, width: '16px' }} />
                {!collapsed && (
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: isActive ? 600 : 400, flex: 1 }}>
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge && unreadCount > 0 && (
                  <Badge variant="critical" pulse>{unreadCount}</Badge>
                )}
                {collapsed && item.badge && unreadCount > 0 && (
                  <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#FF3D3D', boxShadow: '0 0 6px #FF3D3D' }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: collapsed ? '16px 0' : '16px 20px', borderTop: '1px solid rgba(0, 229, 255, 0.08)', flexShrink: 0 }}>
        {!collapsed && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0097B2, #00E5FF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700, color: '#060D14',
                fontFamily: 'Orbitron, monospace', flexShrink: 0,
              }}
            >
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#E8F4F8', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '11px', color: '#4A6B84', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user.role}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          aria-label="Logout"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'rgba(255, 61, 61, 0.08)', border: '1px solid rgba(255, 61, 61, 0.15)',
            borderRadius: '10px', cursor: 'pointer', color: '#FF6B6B',
            transition: 'all 0.2s ease', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 61, 61, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 61, 61, 0.08)'; }}
        >
          <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize: '14px' }} />
          {!collapsed && 'Keluar'}
        </button>
      </div>
    </motion.aside>
  );
};
