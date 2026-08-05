'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PromotionQueueQuery, PromotionsQuery } from '../../types/ml-v2-promotion';

interface MlV2PromotionFiltersProps {
  mode: 'queue' | 'history';
  queueFilters: PromotionQueueQuery;
  historyFilters: PromotionsQuery;
  onQueueChange: (filters: PromotionQueueQuery) => void;
  onHistoryChange: (filters: PromotionsQuery) => void;
  onReset: () => void;
}

export const MlV2PromotionFilters: React.FC<MlV2PromotionFiltersProps> = ({
  mode,
  queueFilters,
  historyFilters,
  onQueueChange,
  onHistoryChange,
  onReset,
}) => {
  // Local state for debouncing inputs
  const [localQueueCandidate, setLocalQueueCandidate] = useState(queueFilters.reviewedCandidateId || '');
  const [localHistoryCandidate, setLocalHistoryCandidate] = useState(historyFilters.promotedCandidateId || '');

  // Debounce candidate IDs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === 'queue' && localQueueCandidate !== queueFilters.reviewedCandidateId) {
        onQueueChange({ ...queueFilters, reviewedCandidateId: localQueueCandidate || undefined, page: 1 });
      } else if (mode === 'history' && localHistoryCandidate !== historyFilters.promotedCandidateId) {
        onHistoryChange({ ...historyFilters, promotedCandidateId: localHistoryCandidate || undefined, page: 1 });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localQueueCandidate, localHistoryCandidate, mode, queueFilters, historyFilters, onQueueChange, onHistoryChange]);

  // Sync back from props
  useEffect(() => {
    setLocalQueueCandidate(queueFilters.reviewedCandidateId || '');
  }, [queueFilters.reviewedCandidateId]);

  useEffect(() => {
    setLocalHistoryCandidate(historyFilters.promotedCandidateId || '');
  }, [historyFilters.promotedCandidateId]);

  return (
    <div className="bg-[#151c2c] border border-white/5 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <h3 className="text-sm font-semibold text-gray-300">Filters</h3>
        <Button variant="secondary" size="sm" onClick={onReset}>Clear Filters</Button>
      </div>

      {mode === 'queue' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Reviewed Candidate ID</label>
            <Input
              placeholder="e.g. DID001"
              value={localQueueCandidate}
              onChange={(e) => setLocalQueueCandidate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Reviewer UUID</label>
            <Input
              placeholder="Exact UUID"
              value={queueFilters.reviewerId || ''}
              onChange={(e) => onQueueChange({ ...queueFilters, reviewerId: e.target.value || undefined, page: 1 })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Original Frame Decision</label>
            <select
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              value={queueFilters.frameDecision || ''}
              onChange={(e) => onQueueChange({ ...queueFilters, frameDecision: e.target.value || undefined, page: 1 })}
            >
              <option value="">All</option>
              <option value="HIGH_PRIORITY_CANDIDATE">HIGH_PRIORITY_CANDIDATE</option>
              <option value="POSSIBLE_MATCH">POSSIBLE_MATCH</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Reviewed From</label>
            <Input
              type="date"
              value={queueFilters.reviewedFrom ? queueFilters.reviewedFrom.split('T')[0] : ''}
              onChange={(e) => onQueueChange({
                ...queueFilters,
                reviewedFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                page: 1
              })}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Promoted Candidate ID</label>
            <Input
              placeholder="e.g. DID001"
              value={localHistoryCandidate}
              onChange={(e) => setLocalHistoryCandidate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Promoter UUID</label>
            <Input
              placeholder="Exact UUID"
              value={historyFilters.promotedById || ''}
              onChange={(e) => onHistoryChange({ ...historyFilters, promotedById: e.target.value || undefined, page: 1 })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Promoted From</label>
            <Input
              type="date"
              value={historyFilters.promotedFrom ? historyFilters.promotedFrom.split('T')[0] : ''}
              onChange={(e) => onHistoryChange({
                ...historyFilters,
                promotedFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                page: 1
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
};
