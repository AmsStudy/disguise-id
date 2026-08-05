'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/authStore';
import { Button } from '../../../../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';
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

export default function MlV2ReviewPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [queueFilters, setQueueFilters] = useState<ReviewQueueQuery>({ page: 1, pageSize: 20 });
  const [historyFilters, setHistoryFilters] = useState<ReviewsQuery>({ page: 1, pageSize: 20 });
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    inferenceResultId?: string;
    reviewId?: string;
  }>({ isOpen: false });
  
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({ visible: true, message, type });
  };

  // Queries
  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['ml-v2-review-queue', queueFilters],
    queryFn: () => getMlV2ReviewQueue(queueFilters),
    enabled: activeTab === 'queue' && !!user && ALLOWED_ROLES.includes(user.role),
    staleTime: 30 * 1000,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['ml-v2-reviews', historyFilters],
    queryFn: () => getMlV2Reviews(historyFilters),
    enabled: activeTab === 'history' && !!user && ALLOWED_ROLES.includes(user.role),
    staleTime: 30 * 1000,
  });

  // Mutations
  const claimMutation = useMutation({
    mutationFn: (inferenceResultId: string) => claimMlV2Review(inferenceResultId),
    onMutate: (id) => setClaimingId(id),
    onSuccess: (data, id) => {
      showToast('Review claimed successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['ml-v2-review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['ml-v2-reviews'] });
      // Open modal with the new review ID
      setModalState({
        isOpen: true,
        reviewId: data.id,
        inferenceResultId: id
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to claim review';
      showToast(msg, 'error');
      // Auto-refresh queue on conflict
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

  // Role Guard
  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400 max-w-md">You do not have permission to view the ML V2 Operator Review queue.</p>
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

  const handleViewQueueItem = (item: MlV2ReviewQueueItem) => {
    setModalState({
      isOpen: true,
      inferenceResultId: item.id,
      reviewId: item.reviewSummary?.id,
    });
  };

  const handleViewHistoryItem = (item: MlV2ReviewHistoryItem) => {
    setModalState({
      isOpen: true,
      reviewId: item.id,
      inferenceResultId: item.inferenceResultId,
    });
  };

  const handleClaim = (item: MlV2ReviewQueueItem | string) => {
    const id = typeof item === 'string' ? item : item.id;
    if (!claimMutation.isPending) {
      claimMutation.mutate(id);
    }
  };

  const handleComplete = (reviewId: string, payload: CompleteReviewPayload) => {
    if (!completeMutation.isPending) {
      completeMutation.mutate({ reviewId, payload });
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      <MlV2ReviewNavigation />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Operator Reviews</h1>
          <p className="text-sm text-gray-400">Review and verify potential watchlist matches from ML V2.</p>
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
          Review Queue
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'history' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          Review History
        </button>
      </div>

      <MlV2ReviewFilters
        mode={activeTab}
        queueFilters={queueFilters}
        historyFilters={historyFilters}
        onQueueChange={setQueueFilters}
        onHistoryChange={setHistoryFilters}
        onReset={handleResetFilters}
      />

      <div>
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
      </div>

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
