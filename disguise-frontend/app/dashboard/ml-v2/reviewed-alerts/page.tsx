'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/authStore';
import { MlV2ReviewNavigation } from '../../../../components/ml-v2-review/MlV2ReviewNavigation';
import { MlV2ReviewedAlertFilters } from '../../../../components/ml-v2-reviewed-alert/MlV2ReviewedAlertFilters';
import { MlV2AlertCreationQueueTable } from '../../../../components/ml-v2-reviewed-alert/MlV2AlertCreationQueueTable';
import { MlV2ReviewedAlertHistoryTable } from '../../../../components/ml-v2-reviewed-alert/MlV2ReviewedAlertHistoryTable';
import { MlV2ReviewedAlertModal } from '../../../../components/ml-v2-reviewed-alert/MlV2ReviewedAlertModal';
import { Toast, ToastType } from '../../../../components/ui/Toast';
import {
  getMlV2AlertCreationQueue,
  getMlV2ReviewedAlerts,
  createMlV2ReviewedAlert
} from '../../../../services/mlV2ReviewedAlertApi';
import {
  AlertCreationQueueQuery,
  ReviewedAlertsQuery,
  MlV2AlertCreationQueueItem,
  MlV2ReviewedAlert,
  CreateReviewedAlertPayload
} from '../../../../types/ml-v2-reviewed-alert';

const ALLOWED_ROLES = ['super_admin', 'admin', 'investigator', 'operator'];
const CAN_CREATE_ROLES = ['super_admin', 'admin', 'investigator'];

const tabBtnStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  color: isActive ? '#00E5FF' : 'rgba(255,255,255,0.4)',
  borderBottom: isActive ? '2px solid #00E5FF' : '2px solid transparent',
  transition: 'all 0.2s ease',
  letterSpacing: '0.01em',
});

export default function MlV2ReviewedAlertsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [queueFilters, setQueueFilters] = useState<AlertCreationQueueQuery>({ page: 1, pageSize: 20 });
  const [historyFilters, setHistoryFilters] = useState<ReviewedAlertsQuery>({ page: 1, pageSize: 20 });
  const [modalState, setModalState] = useState<{ isOpen: boolean; alertId?: string | null; queueItem?: MlV2AlertCreationQueueItem | null; }>({ isOpen: false });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({ visible: false, message: '', type: 'info' });
  const showToast = (message: string, type: ToastType) => setToast({ visible: true, message, type });

  const canCreate = !!user && CAN_CREATE_ROLES.includes(user.role);

  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['ml-v2-alert-creation-queue', queueFilters],
    queryFn: () => getMlV2AlertCreationQueue(queueFilters),
    enabled: activeTab === 'queue' && !!user && ALLOWED_ROLES.includes(user.role),
    staleTime: 60 * 1000,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['ml-v2-reviewed-alerts', historyFilters],
    queryFn: () => getMlV2ReviewedAlerts(historyFilters),
    enabled: activeTab === 'history' && !!user && ALLOWED_ROLES.includes(user.role),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: ({ promotionId, payload }: { promotionId: string, payload: CreateReviewedAlertPayload }) =>
      createMlV2ReviewedAlert(promotionId, payload),
    onSuccess: () => {
      showToast('Reviewed Alert created successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['ml-v2-alert-creation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['ml-v2-reviewed-alerts'] });
      setModalState({ isOpen: false });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to create alert';
      showToast(msg, 'error');
      if (err.response?.status === 409 || err.response?.status === 404) {
        queryClient.invalidateQueries({ queryKey: ['ml-v2-alert-creation-queue'] });
      }
    }
  });

  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ width: '56px', height: '56px', background: 'rgba(255,61,61,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg style={{ width: '28px', height: '28px', color: '#FF5555' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Access Denied</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', maxWidth: '360px', marginBottom: '24px' }}>You do not have permission to view ML V2 Reviewed Alerts.</p>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 24px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Return to Dashboard</button>
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === 'queue') await refetchQueue();
    else await refetchHistory();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleResetFilters = () => {
    if (activeTab === 'queue') setQueueFilters({ page: 1, pageSize: 20 });
    else setHistoryFilters({ page: 1, pageSize: 20 });
  };

  const handleCreateAlert = (promotionId: string, payload: CreateReviewedAlertPayload) => {
    if (!createMutation.isPending) createMutation.mutate({ promotionId, payload });
  };

  const isLoading = queueLoading || historyLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <MlV2ReviewNavigation />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.05))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,229,255,0.2)' }}>
              <svg style={{ width: '18px', height: '18px', color: '#00E5FF' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em', margin: 0 }}>Reviewed Alerts</h1>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Create operational alerts from explicitly verified promotions.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, transition: 'all 0.2s' }}
        >
          <svg style={{ width: '15px', height: '15px', animation: (isLoading || isRefreshing) ? 'spin 1s linear infinite' : 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button style={tabBtnStyle(activeTab === 'queue')} onClick={() => setActiveTab('queue')}>
          Alert Creation Queue
          {queueData?.meta?.total !== undefined && (
            <span style={{ marginLeft: '8px', padding: '1px 7px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, background: activeTab === 'queue' ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.08)', color: activeTab === 'queue' ? '#00E5FF' : 'rgba(255,255,255,0.4)' }}>
              {queueData.meta.total}
            </span>
          )}
        </button>
        <button style={tabBtnStyle(activeTab === 'history')} onClick={() => setActiveTab('history')}>
          Alert History
        </button>
      </div>

      {/* Filters */}
      <MlV2ReviewedAlertFilters
        mode={activeTab}
        queueFilters={queueFilters}
        historyFilters={historyFilters}
        onQueueChange={setQueueFilters}
        onHistoryChange={setHistoryFilters}
        onReset={handleResetFilters}
      />

      {/* Tables */}
      {activeTab === 'queue' && (
        <MlV2AlertCreationQueueTable
          data={queueData?.items || []}
          isLoading={queueLoading}
          page={queueFilters.page || 1}
          totalPages={queueData?.meta?.totalPages || 1}
          onPageChange={(page) => setQueueFilters({ ...queueFilters, page })}
          onCreateAlert={(item) => setModalState({ isOpen: true, queueItem: item, alertId: null })}
          canCreate={canCreate}
        />
      )}
      {activeTab === 'history' && (
        <MlV2ReviewedAlertHistoryTable
          data={historyData?.items || []}
          isLoading={historyLoading}
          page={historyFilters.page || 1}
          totalPages={historyData?.meta?.totalPages || 1}
          onPageChange={(page) => setHistoryFilters({ ...historyFilters, page })}
          onViewDetail={(item) => setModalState({ isOpen: true, alertId: item.id, queueItem: null })}
        />
      )}

      <MlV2ReviewedAlertModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false })}
        alertId={modalState.alertId}
        queueItem={modalState.queueItem}
        isCreating={createMutation.isPending}
        onCreate={handleCreateAlert}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  );
}
