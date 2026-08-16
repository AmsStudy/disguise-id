'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useAuthStore } from '@/store/authStore';
import { connectSocket, disconnectSocket } from '@/services/socket';
import { Toaster } from 'sonner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    // Connect WebSocket after auth
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, [token, router]);

  if (!token) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D1B2A' }}>
      <Sidebar />

      {/* Main area shifts to accommodate sidebar */}
      <div
        style={{
          flex: 1,
          marginLeft: '240px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 0.2s ease',
        }}
        className="dashboard-main"
      >
        <Topbar />
        <main
          style={{
            flex: 1,
            padding: '32px',
            overflowY: 'auto',
          }}
        >
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dashboard-main { margin-left: 72px !important; }
        }
      `}</style>
      
      <Toaster position="top-right" theme="dark" richColors />
    </div>
  );
}
