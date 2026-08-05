'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { getMlV2ReviewedAlertById } from '../../services/mlV2ReviewedAlertApi';
import { CreateReviewedAlertPayload, MlV2AlertCreationQueueItem } from '../../types/ml-v2-reviewed-alert';
import { format } from 'date-fns';

interface MlV2ReviewedAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertId?: string | null;
  queueItem?: MlV2AlertCreationQueueItem | null;
  isCreating?: boolean;
  onCreate?: (promotionId: string, payload: CreateReviewedAlertPayload) => void;
}

export const MlV2ReviewedAlertModal: React.FC<MlV2ReviewedAlertModalProps> = ({
  isOpen,
  onClose,
  alertId,
  queueItem,
  isCreating,
  onCreate,
}) => {
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: alertData, isLoading, isError, error } = useQuery({
    queryKey: ['ml-v2-reviewed-alert', alertId],
    queryFn: () => getMlV2ReviewedAlertById(alertId!),
    enabled: !!alertId && isOpen,
    staleTime: 0,
  });

  if (!isOpen) return null;

  const isQueueMode = !alertId && !!queueItem;
  const isHistoryMode = !!alertId && !!alertData;

  const handleCreateClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmSubmit = () => {
    if (queueItem && onCreate) {
      onCreate(queueItem.id, { notes: notes.trim() || undefined });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#151c2c] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-[#151c2c] border-b border-white/5 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold text-white">
            {isQueueMode ? 'Create Reviewed Alert' : 'Reviewed Alert Detail'}
          </h2>
          <Button variant="secondary" onClick={onClose} className="px-3 py-1">Close</Button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-white/5 rounded w-1/3"></div>
              <div className="h-24 bg-white/5 rounded"></div>
              <div className="h-24 bg-white/5 rounded"></div>
            </div>
          ) : isError ? (
            <div className="text-center text-red-400 py-8">
              <p>{error instanceof Error ? error.message : 'Result not found or an error occurred'}</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Context Block */}
              {isQueueMode && queueItem && (
                <div className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-300 border-b border-white/5 pb-2">Promotion Context</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-gray-500">Promotion ID</span>
                      <span className="font-mono text-gray-300">{queueItem.id}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Review ID</span>
                      <span className="font-mono text-gray-300">{queueItem.reviewId}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Original Frame Decision</span>
                      <span className="text-gray-300">{queueItem.review?.inferenceResult?.frameDecision}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Promoted At</span>
                      <span className="text-gray-300">{format(new Date(queueItem.promotedAt), 'dd MMM yyyy HH:mm:ss')}</span>
                    </div>
                  </div>

                  <div className="mt-2 bg-blue-500/10 border border-blue-500/20 rounded p-3 text-sm">
                    <span className="block text-blue-400 font-medium mb-1">Promoted Candidate</span>
                    <span className="font-mono text-white text-lg">{queueItem.promotedCandidateId}</span>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-2 rounded text-xs mt-3">
                      <strong>Note:</strong> The promoted candidate is an ML gallery identifier. It is not automatically mapped to a WatchlistPerson ID. No automatic modifications will be made to the Watchlist or original DetectionEvent bestMatchId.
                    </div>
                  </div>
                </div>
              )}

              {isHistoryMode && alertData && (
                <div className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-300 border-b border-white/5 pb-2">Reviewed Alert Record</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-gray-500">Alert ID</span>
                      <span className="font-mono text-gray-300">{alertData.id}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Creator ID</span>
                      <span className="font-mono text-gray-300">{alertData.createdById}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Created At</span>
                      <span className="text-gray-300">{format(new Date(alertData.createdAt), 'dd MMM yyyy HH:mm:ss')}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Promotion ID</span>
                      <span className="font-mono text-gray-300">{alertData.promotionId}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-gray-500">Title</span>
                      <span className="text-gray-300">{alertData.title}</span>
                    </div>
                  </div>

                  <div className="mt-2 bg-blue-500/10 border border-blue-500/20 rounded p-3 text-sm">
                    <span className="block text-blue-400 font-medium mb-1">Promoted Candidate</span>
                    <span className="font-mono text-white text-lg">{alertData.promotedCandidateId}</span>
                  </div>

                  {alertData.notes && (
                    <div className="mt-2">
                      <span className="block text-gray-500 text-sm mb-1">Notes:</span>
                      <div className="bg-black/20 p-3 rounded text-sm text-gray-300 whitespace-pre-wrap border border-white/5">
                        {alertData.notes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Alert Creation Form */}
              {isQueueMode && onCreate && (
                <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)]">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">
                      Alert Notes (Optional)
                    </label>
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[100px] resize-y"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add investigation instructions or notes..."
                      maxLength={2000}
                    />
                    <div className="text-right text-xs text-gray-500">
                      {notes.length} / 2000
                    </div>
                  </div>

                  {showConfirm ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-2 flex flex-col gap-3">
                      <h4 className="text-red-400 font-medium">Confirm Alert Creation</h4>
                      <p className="text-sm text-gray-300">
                        You are explicitly creating a Reviewed Alert for candidate <strong className="text-white font-mono">{queueItem?.promotedCandidateId}</strong>. This action is irreversible.
                      </p>
                      <div className="flex justify-end gap-3 mt-2">
                        <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
                        <Button variant="primary" size="sm" onClick={handleConfirmSubmit} disabled={isCreating} className="bg-red-500 hover:bg-red-600 text-white">
                          {isCreating ? 'Creating...' : 'Yes, Create Alert'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="primary"
                        onClick={handleCreateClick}
                        disabled={isCreating}
                      >
                        Create Reviewed Alert
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
