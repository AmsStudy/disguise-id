'use client';

import React, { useState } from 'react';
import { MlV2ReviewNavigation } from '../../../components/ml-v2-review/MlV2ReviewNavigation';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { getMlV2TelemetryList, getMlV2TelemetryStats } from '../../../services/mlV2Api';
import { MlV2ListQuery } from '../../../types/ml-v2';
import { MlV2Stats } from '../../../components/ml-v2/MlV2Stats';
import { MlV2Filters } from '../../../components/ml-v2/MlV2Filters';
import { MlV2Table } from '../../../components/ml-v2/MlV2Table';
import { MlV2DetailModal } from '../../../components/ml-v2/MlV2DetailModal';

const ALLOWED_ROLES = ['super_admin', 'admin', 'operator', 'investigator'];

export default function MlV2DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [filters, setFilters] = useState<MlV2ListQuery>({ page: 1, pageSize: 20 });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Role Guard
  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ width: '64px', height: '64px', background: 'rgba(255,61,61,0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg style={{ width: '32px', height: '32px', color: '#FF5555' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Access Denied</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', maxWidth: '360px', marginBottom: '24px' }}>
          You do not have permission to view the ML V2 Observability dashboard.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '10px 24px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'white', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { data: listData, isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ['mlV2List', filters],
    queryFn: () => getMlV2TelemetryList(filters),
    staleTime: 30 * 1000,
  });

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['mlV2Stats', { createdFrom: filters.createdFrom, createdTo: filters.createdTo, cameraSessionId: filters.cameraSessionId }],
    queryFn: () => getMlV2TelemetryStats({ createdFrom: filters.createdFrom, createdTo: filters.createdTo, cameraSessionId: filters.cameraSessionId }),
    staleTime: 30 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchList(), refetchStats()]);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleFilterChange = (newFilters: MlV2ListQuery) => setFilters(newFilters);
  const handleResetFilters = () => setFilters({ page: 1, pageSize: 20 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Navigation */}
      <MlV2ReviewNavigation />

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.05))',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(0,229,255,0.2)',
            }}>
              <svg style={{ width: '18px', height: '18px', color: '#00E5FF' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em', margin: 0 }}>
              ML V2 Observability
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Read-only view of machine learning pipeline telemetry and decisions.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={listLoading || statsLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 16px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '13px', fontWeight: 600,
            cursor: listLoading || statsLoading ? 'not-allowed' : 'pointer',
            opacity: listLoading || statsLoading ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            if (!listLoading && !statsLoading) {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)';
              (e.currentTarget as HTMLElement).style.color = 'white';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
          }}
        >
          <svg
            style={{ width: '15px', height: '15px', animation: (listLoading || isRefreshing) ? 'spin 1s linear infinite' : 'none' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <MlV2Stats stats={statsData} isLoading={statsLoading} />

      {/* Filters */}
      <MlV2Filters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Table */}
      <MlV2Table
        data={listData?.items || []}
        isLoading={listLoading}
        page={filters.page || 1}
        totalPages={listData?.meta?.totalPages || 1}
        onPageChange={(page) => setFilters({ ...filters, page })}
        onViewDetail={setDetailId}
      />

      {/* Detail Modal */}
      <MlV2DetailModal
        id={detailId}
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
