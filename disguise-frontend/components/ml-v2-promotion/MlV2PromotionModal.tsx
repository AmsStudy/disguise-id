'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { getMlV2PromotionById } from '../../services/mlV2PromotionApi';
import { PromoteReviewPayload, MlV2PromotionQueueItem } from '../../types/ml-v2-promotion';
import { format } from 'date-fns';

interface MlV2PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotionId?: string | null;
  queueItem?: MlV2PromotionQueueItem | null;
  isPromoting?: boolean;
  onPromote?: (reviewId: string, payload: PromoteReviewPayload) => void;
}

export const MlV2PromotionModal: React.FC<MlV2PromotionModalProps> = ({
  isOpen,
  onClose,
  promotionId,
  queueItem,
  isPromoting,
  onPromote,
}) => {
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: promotionData, isLoading, isError, error } = useQuery({
    queryKey: ['ml-v2-promotion', promotionId],
    queryFn: () => getMlV2PromotionById(promotionId!),
    enabled: !!promotionId && isOpen,
    staleTime: 0,
  });

  if (!isOpen) return null;

  // Render Queue Item context if no promotionId is provided
  const isQueueMode = !promotionId && !!queueItem;
  const isHistoryMode = !!promotionId && !!promotionData;

  const handlePromoteClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmSubmit = () => {
    if (queueItem && onPromote) {
      onPromote(queueItem.id, { notes: notes.trim() || undefined });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#151c2c] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-[#151c2c] border-b border-white/5 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold text-white">
            {isQueueMode ? 'Promote Operator Review' : 'Promotion Detail'}
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
                  <h3 className="text-sm font-semibold text-gray-300 border-b border-white/5 pb-2">Review Context</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-gray-500">Review ID</span>
                      <span className="font-mono text-gray-300">{queueItem.id}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Reviewer ID</span>
                      <span className="font-mono text-gray-300">{queueItem.reviewerId}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Original Frame Decision</span>
                      <span className="text-gray-300">{queueItem.inferenceResult?.frameDecision}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Original Score</span>
                      <span className="text-gray-300">{queueItem.inferenceResult?.score !== null && queueItem.inferenceResult?.score !== undefined ? queueItem.inferenceResult.score.toFixed(4) : '-'}</span>
                    </div>
                  </div>

                  <div className="mt-2 bg-blue-500/10 border border-blue-500/20 rounded p-3 text-sm">
                    <span className="block text-blue-400 font-medium mb-1">Reviewed Candidate</span>
                    <span className="font-mono text-white text-lg">{queueItem.reviewedCandidateId}</span>
                    <p className="text-xs text-blue-400/80 mt-2">
                      This is an ML gallery identifier. Promoting this record does not automatically map the candidate to a WatchlistPerson ID.
                    </p>
                  </div>
                </div>
              )}

              {isHistoryMode && promotionData && (
                <div className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-300 border-b border-white/5 pb-2">Promotion Record</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-gray-500">Promotion ID</span>
                      <span className="font-mono text-gray-300">{promotionData.id}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Promoter ID</span>
                      <span className="font-mono text-gray-300">{promotionData.promotedById}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Promoted At</span>
                      <span className="text-gray-300">{format(new Date(promotionData.promotedAt), 'dd MMM yyyy HH:mm:ss')}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Review ID</span>
                      <span className="font-mono text-gray-300">{promotionData.reviewId}</span>
                    </div>
                  </div>

                  <div className="mt-2 bg-blue-500/10 border border-blue-500/20 rounded p-3 text-sm">
                    <span className="block text-blue-400 font-medium mb-1">Promoted Candidate</span>
                    <span className="font-mono text-white text-lg">{promotionData.promotedCandidateId}</span>
                  </div>

                  {promotionData.notes && (
                    <div className="mt-2">
                      <span className="block text-gray-500 text-sm mb-1">Notes:</span>
                      <div className="bg-black/20 p-3 rounded text-sm text-gray-300 whitespace-pre-wrap border border-white/5">
                        {promotionData.notes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Promotion Form */}
              {isQueueMode && onPromote && (
                <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)]">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">
                      Promotion Notes (Optional)
                    </label>
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[100px] resize-y"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add justification for promotion..."
                      maxLength={2000}
                    />
                    <div className="text-right text-xs text-gray-500">
                      {notes.length} / 2000
                    </div>
                  </div>

                  {showConfirm ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-2 flex flex-col gap-3">
                      <h4 className="text-yellow-400 font-medium">Confirm Promotion</h4>
                      <p className="text-sm text-gray-300">
                        You are explicitly promoting review <strong className="text-white font-mono">{queueItem?.id}</strong> with candidate <strong className="text-white font-mono">{queueItem?.reviewedCandidateId}</strong>.
                      </p>
                      <div className="flex justify-end gap-3 mt-2">
                        <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
                        <Button variant="primary" size="sm" onClick={handleConfirmSubmit} disabled={isPromoting}>
                          {isPromoting ? 'Submitting...' : 'Yes, Promote'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="primary"
                        onClick={handlePromoteClick}
                        disabled={isPromoting}
                      >
                        Promote to Alert Creation Queue
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
