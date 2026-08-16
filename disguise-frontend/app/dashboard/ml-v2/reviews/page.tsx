'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/authStore';
import { MlV2ReviewNavigation } from '../../../../components/ml-v2-review/MlV2ReviewNavigation';
import { MlV2ReviewQueueTable } from '../../../../components/ml-v2-review/MlV2ReviewQueueTable';
import { MlV2ReviewHistoryTable } from '../../../../components/ml-v2-review/MlV2ReviewHistoryTable';
import { MlV2ReviewFilters } from '../../../../components/ml-v2-review/MlV2ReviewFilters';
import { MlV2ReviewModal } from '../../../../components/ml-v2-review/MlV2ReviewModal';
import { Toast, ToastType } from '../../../../components/ui/Toast';
import {
  getMlV2ReviewQueue,
  getMlV2Reviews,
  claimMlV2Review,
  completeMlV2Review
} from '../../../../services/mlV2ReviewApi';
import {
  ReviewQueueQuery,
  ReviewsQuery,
  MlV2ReviewQueueItem,
  MlV2ReviewHistoryItem,
  CompleteReviewPayload
} from '../../../../types/ml-v2-review';

const ALLOWED_ROLES = ['super_admin', 'admin', 'operator', 'investigator'];

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

export default function MlV2ReviewPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [queueFilters, setQueueFilters] = useState<ReviewQueueQuery>({ page: 1, pageSize: 20 });
  const [historyFilters, setHistoryFilters] = useState<ReviewsQuery>({ page: 1, pageSize: 20 });
  const [modalState, setModalState] = useState<{ isOpen: boolean; inferenceResultId?: string; reviewId?: string; }>({ isOpen: false });
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({ visible: false, message: '', type: 'info' });
  const showToast = (message: string, type: ToastType) => setToast({ visible: true, message, type });

  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['ml-v2-review-queue', queueFilters],
    queryFn: () => getMlV2ReviewQueue(queueFilters),
    enabled: activeTab === 'queue' && !!user && ALLOWED_ROLES.includes(user.role),
    staleTime: 60 * 1000,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['ml-v2-reviews', historyFilters],
    queryFn: () => getMlV2Reviews(historyFilters),
    enabled: activeTab === 'history' && !!user && ALLOWED_ROLES.includes(user.role),
    staleTime: 60 * 1000,
  });

  const claimMutation = useMutation({
    mutationFn: (inferenceResultId: string) => claimMlV2Review(inferenceResultId),
    onMutate: (id) => setClaimingId(id),
    onSuccess: (data, id) => {
      showToast('Review claimed successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['ml-v2-review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['ml-v2-reviews'] });
      setModalState({ isOpen: true, reviewId: data.id, inferenceResultId: id });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to claim review';
      showToast(msg, 'error');
      if (err.response?.status === 409 || err.response?.status === 404) {
        queryClient.invalidateQueries({ queryKey: ['ml-v2-review-queue'] });
      }
    },
    onSettled: () => setClaimingId(null)
  });

  const completeMutation = useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: string, payload: CompleteReviewPayload }) =>
      completeMlV2Review(reviewId, payload),
    onSuccess: (data) => {
      showToast('Review completed successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['ml-v2-review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['ml-v2-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['ml-v2-review-detail', data.id] });
      setModalState({ isOpen: false });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to complete review';
      showToast(msg, 'error');
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
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', maxWidth: '360px', marginBottom: '24px' }}>You do not have permission to view the ML V2 Operator Review queue.</p>
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

  const handleViewQueueItem = (item: MlV2ReviewQueueItem) => setModalState({ isOpen: true, inferenceResultId: item.id, reviewId: item.reviewSummary?.id });
  const handleViewHistoryItem = (item: MlV2ReviewHistoryItem) => setModalState({ isOpen: true, reviewId: item.id, inferenceResultId: item.inferenceResultId });
  const handleClaim = (item: MlV2ReviewQueueItem | string) => {
    const id = typeof item === 'string' ? item : item.id;
    if (!claimMutation.isPending) claimMutation.mutate(id);
  };
  const handleComplete = (reviewId: string, payload: CompleteReviewPayload) => {
    if (!completeMutation.isPending) completeMutation.mutate({ reviewId, payload });
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em', margin: 0 }}>Operator Reviews</h1>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Review and verify potential watchlist matches from ML V2.</p>
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
          Review Queue
          {queueData?.meta?.total !== undefined && (
            <span style={{ marginLeft: '8px', padding: '1px 7px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, background: activeTab === 'queue' ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.08)', color: activeTab === 'queue' ? '#00E5FF' : 'rgba(255,255,255,0.4)' }}>
              {queueData.meta.total}
            </span>
          )}
        </button>
        <button style={tabBtnStyle(activeTab === 'history')} onClick={() => setActiveTab('history')}>
          Review History
        </button>
      </div>

      {/* Filters */}
      <MlV2ReviewFilters
        mode={activeTab}
        queueFilters={queueFilters}
        historyFilters={historyFilters}
        onQueueChange={setQueueFilters}
        onHistoryChange={setHistoryFilters}
        onReset={handleResetFilters}
      />

      {/* Tables */}
      {activeTab === 'queue' && (
        <MlV2ReviewQueueTable
          data={queueData?.items || []}
          isLoading={queueLoading}
          page={queueFilters.page || 1}
          totalPages={queueData?.meta?.totalPages || 1}
          onPageChange={(page) => setQueueFilters({ ...queueFilters, page })}
          onViewDetail={handleViewQueueItem}
          onClaim={handleClaim}
          claimingId={claimingId}
        />
      )}
      {activeTab === 'history' && (
        <MlV2ReviewHistoryTable
          data={historyData?.items || []}
          isLoading={historyLoading}
          page={historyFilters.page || 1}
          totalPages={historyData?.meta?.totalPages || 1}
          onPageChange={(page) => setHistoryFilters({ ...historyFilters, page })}
          onViewDetail={handleViewHistoryItem}
        />
      )}

      <MlV2ReviewModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false })}
        inferenceResultId={modalState.inferenceResultId}
        reviewId={modalState.reviewId}
        isClaiming={claimMutation.isPending}
        onClaim={handleClaim}
        isCompleting={completeMutation.isPending}
        onComplete={handleComplete}
        currentUserRole={user?.role || ''}
        currentUserId={user?.id || ''}
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
