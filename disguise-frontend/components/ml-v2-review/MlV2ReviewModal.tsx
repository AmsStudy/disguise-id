'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { getMlV2ReviewById } from '../../services/mlV2ReviewApi';
import { getMlV2TelemetryById } from '../../services/mlV2Api';
import { MlV2CompleteReviewForm } from './MlV2CompleteReviewForm';
import { CompleteReviewPayload } from '../../types/ml-v2-review';
import { format } from 'date-fns';

interface MlV2ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewId?: string | null;
  inferenceResultId?: string | null;
  isClaiming?: boolean;
  onClaim?: (inferenceResultId: string) => void;
  isCompleting?: boolean;
  onComplete?: (reviewId: string, payload: CompleteReviewPayload) => void;
  currentUserRole: string;
  currentUserId: string;
}

export const MlV2ReviewModal: React.FC<MlV2ReviewModalProps> = ({
  isOpen,
  onClose,
  reviewId,
  inferenceResultId,
  isClaiming,
  onClaim,
  isCompleting,
  onComplete,
  currentUserRole,
  currentUserId,
}) => {
  const { data: reviewData, isLoading: reviewLoading, isError: reviewError, error: rError } = useQuery({
    queryKey: ['ml-v2-review-detail', reviewId],
    queryFn: () => getMlV2ReviewById(reviewId!),
    enabled: !!reviewId && isOpen,
    staleTime: 0,
  });

  const { data: telemetryData, isLoading: telemetryLoading, isError: telemetryError, error: tError } = useQuery({
    queryKey: ['mlV2Detail', inferenceResultId],
    queryFn: () => getMlV2TelemetryById(inferenceResultId!),
    enabled: !!inferenceResultId && !reviewId && isOpen,
    staleTime: 60 * 1000,
  });

  if (!isOpen) return null;

  const isLoading = reviewId ? reviewLoading : telemetryLoading;
  const isError = reviewId ? reviewError : telemetryError;
  const error = reviewId ? rError : tError;

  // Determine what we have based on queries
  const inference = reviewData?.inferenceResult || telemetryData;
  const review = reviewData;

  const isUnclaimed = !reviewId && !!inference;
  const isPending = review?.status === 'PENDING';
  const isCompleted = review?.status === 'COMPLETED';

  // Check completion authorization
  let canComplete = false;
  if (isPending && review) {
    if (currentUserRole === 'admin' || currentUserRole === 'super_admin') {
      canComplete = true; // Override allowed
    } else {
      canComplete = review.reviewerId === currentUserId; // Own claim only
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#151c2c] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-[#151c2c] border-b border-white/5 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold text-white">
            {isUnclaimed ? 'Unclaimed ML V2 Result' : isPending ? 'Pending Operator Review' : 'Completed Operator Review'}
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
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error instanceof Error ? error.message : 'Result not found or an error occurred'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Telemetry Summary */}
              {inference && (
                <div className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-300 border-b border-white/5 pb-2">Telemetry Context</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-gray-500">Inference ID</span>
                      <span className="font-mono text-gray-300">{inference.id || inferenceResultId}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Frame Decision</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                        inference.frameDecision === 'HIGH_PRIORITY_CANDIDATE' ? 'bg-red-500/10 text-red-400' : 
                        inference.frameDecision === 'POSSIBLE_MATCH' ? 'bg-orange-500/10 text-orange-400' : 
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {inference.frameDecision}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Candidate ID</span>
                      <span className="font-mono text-white">{inference.candidateId || '-'}</span>
                    </div>
                    {inference.score !== undefined && inference.score !== null && (
                      <div>
                        <span className="block text-gray-500">Score</span>
                        <span className="text-gray-300">{inference.score.toFixed(4)}</span>
                      </div>
                    )}
                    {inference.margin !== undefined && inference.margin !== null && (
                      <div>
                        <span className="block text-gray-500">Margin</span>
                        <span className="text-gray-300">{inference.margin.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Review Metadata */}
              {review && (
                <div className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-300 border-b border-white/5 pb-2">Review Metadata</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-gray-500">Review ID</span>
                      <span className="font-mono text-gray-300">{review.id}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Claimed By</span>
                      <span className="font-mono text-gray-300">
                        {review.reviewerId} 
                        {review.reviewerId === currentUserId && <span className="ml-2 text-xs text-blue-400 font-sans">(You)</span>}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Claimed At</span>
                      <span className="text-gray-300">{format(new Date(review.claimedAt), 'dd MMM yyyy HH:mm:ss')}</span>
                    </div>
                    {review.status === 'COMPLETED' && (
                      <div>
                        <span className="block text-gray-500">Reviewed At</span>
                        <span className="text-gray-300">{review.reviewedAt ? format(new Date(review.reviewedAt), 'dd MMM yyyy HH:mm:ss') : '-'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Completed Decision */}
              {isCompleted && review && (
                <div className="bg-blue-500/5 rounded-xl border border-blue-500/20 p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-blue-400 border-b border-blue-500/20 pb-2">Final Decision</h3>
                  <div className="text-sm">
                    <p><span className="text-gray-500">Decision:</span> <strong className="text-white ml-2">{review.decision}</strong></p>
                    {review.decision === 'CONFIRMED' && (
                      <p className="mt-2"><span className="text-gray-500">Selected Candidate:</span> <strong className="text-white font-mono ml-2">{review.reviewedCandidateId}</strong></p>
                    )}
                    {review.notes && (
                      <div className="mt-4">
                        <span className="block text-gray-500 mb-1">Notes:</span>
                        <div className="bg-black/20 p-3 rounded text-gray-300 whitespace-pre-wrap">
                          {review.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Unclaimed Actions */}
              {isUnclaimed && onClaim && inferenceResultId && (
                <div className="flex justify-end pt-4 border-t border-white/5">
                  <Button 
                    variant="primary" 
                    onClick={() => onClaim(inferenceResultId)}
                    disabled={isClaiming}
                  >
                    {isClaiming ? 'Claiming...' : 'Claim Review'}
                  </Button>
                </div>
              )}

              {/* Pending Complete Form */}
              {isPending && review && canComplete && onComplete && (
                <MlV2CompleteReviewForm 
                  originalCandidateId={inference?.candidateId || undefined}
                  isSubmitting={!!isCompleting}
                  onSubmit={(payload) => onComplete(review.id, payload)}
                />
              )}

              {isPending && review && !canComplete && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mt-4 text-center">
                  <p className="text-sm text-orange-400">
                    This review is claimed by another operator ({review.reviewerId}).
                  </p>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
