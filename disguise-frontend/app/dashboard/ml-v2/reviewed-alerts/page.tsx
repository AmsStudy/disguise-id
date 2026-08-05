'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/authStore';
import { Button } from '../../../../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';
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

export default function MlV2ReviewedAlertsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [queueFilters, setQueueFilters] = useState<AlertCreationQueueQuery>({ page: 1, pageSize: 20 });
  const [historyFilters, setHistoryFilters] = useState<ReviewedAlertsQuery>({ page: 1, pageSize: 20 });

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    alertId?: string | null;
    queueItem?: MlV2AlertCreationQueueItem | null;
  }>({ isOpen: false });

  // Toast State
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({ visible: true, message, type });
  };

  const canCreate = !!user && CAN_CREATE_ROLES.includes(user.role);

  // Queries
  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['ml-v2-alert-creation-queue', queueFilters],
    queryFn: () => getMlV2AlertCreationQueue(queueFilters),
    enabled: activeTab === 'queue' && !!user && ALLOWED_ROLES.includes(user.role),
    staleTime: 30 * 1000,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['ml-v2-reviewed-alerts', historyFilters],
    queryFn: () => getMlV2ReviewedAlerts(historyFilters),
    enabled: activeTab === 'history' && !!user && ALLOWED_ROLES.includes(user.role),
    staleTime: 30 * 1000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ promotionId, payload }: { promotionId: string, payload: CreateReviewedAlertPayload }) =>
      createMlV2ReviewedAlert(promotionId, payload),
    onSuccess: (data) => {
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

  // Role Guard
  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400 max-w-md">You do not have permission to view ML V2 Reviewed Alerts.</p>
        <Button className="mt-6" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
      </div>
    );
  }

  const handleRefresh = () => {
    if (activeTab === 'queue') refetchQueue();
    else refetchHistory();
  };

  const handleResetFilters = () => {
    if (activeTab === 'queue') {
      setQueueFilters({ page: 1, pageSize: 20 });
    } else {
      setHistoryFilters({ page: 1, pageSize: 20 });
    }
  };

  const handleCreateAlert = (promotionId: string, payload: CreateReviewedAlertPayload) => {
    if (!createMutation.isPending) {
      createMutation.mutate({ promotionId, payload });
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      <MlV2ReviewNavigation />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Reviewed Alerts</h1>
          <p className="text-sm text-gray-400">Create operational alerts from explicitly verified promotions.</p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} className="flex items-center gap-2">
          <FontAwesomeIcon icon={faRotateRight} className={queueLoading || historyLoading ? 'animate-spin' : ''} />
          Refresh Data
        </Button>
      </div>

      <div className="flex gap-4 border-b border-[rgba(255,255,255,0.1)] pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'queue' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          Alert Creation Queue
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'history' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          Alert History
        </button>
      </div>

      <MlV2ReviewedAlertFilters
        mode={activeTab}
        queueFilters={queueFilters}
        historyFilters={historyFilters}
        onQueueChange={setQueueFilters}
        onHistoryChange={setHistoryFilters}
        onReset={handleResetFilters}
      />

      <div>
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
      </div>

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
