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
import { Button } from '../../../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';

const ALLOWED_ROLES = ['super_admin', 'admin', 'operator', 'investigator'];

export default function MlV2DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [filters, setFilters] = useState<MlV2ListQuery>({ page: 1, pageSize: 20 });
  const [detailId, setDetailId] = useState<string | null>(null);

  // Role Guard
  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400 max-w-md">You do not have permission to view the ML V2 Observability dashboard.</p>
        <Button className="mt-6" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
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

  const handleRefresh = () => {
    refetchList();
    refetchStats();
  };

  const handleFilterChange = (newFilters: MlV2ListQuery) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({ page: 1, pageSize: 20 });
  };

  return (
    <div className="flex flex-col gap-6">
      <MlV2ReviewNavigation />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">ML V2 Observability</h1>
          <p className="text-sm text-gray-400">Read-only view of machine learning pipeline telemetry and decisions.</p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} className="flex items-center gap-2">
          <FontAwesomeIcon icon={faRotateRight} className={listLoading || statsLoading ? 'animate-spin' : ''} />
          Refresh Data
        </Button>
      </div>

      <MlV2Stats stats={statsData} isLoading={statsLoading} />

      <MlV2Filters 
        filters={filters} 
        onChange={handleFilterChange} 
        onReset={handleResetFilters} 
      />

      <MlV2Table 
        data={listData?.items || []} 
        isLoading={listLoading}
        page={filters.page || 1}
        totalPages={listData?.meta?.totalPages || 1}
        onPageChange={(page) => setFilters({ ...filters, page })}
        onViewDetail={setDetailId}
      />

      <MlV2DetailModal 
        id={detailId} 
        isOpen={!!detailId} 
        onClose={() => setDetailId(null)} 
      />
    </div>
  );
}
