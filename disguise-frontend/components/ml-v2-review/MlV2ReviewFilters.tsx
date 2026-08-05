'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ReviewQueueQuery, ReviewsQuery } from '../../types/ml-v2-review';

interface MlV2ReviewFiltersProps {
  mode: 'queue' | 'history';
  queueFilters: ReviewQueueQuery;
  historyFilters: ReviewsQuery;
  onQueueChange: (newFilters: ReviewQueueQuery) => void;
  onHistoryChange: (newFilters: ReviewsQuery) => void;
  onReset: () => void;
}

export const MlV2ReviewFilters: React.FC<MlV2ReviewFiltersProps> = ({ 
  mode, 
  queueFilters, 
  historyFilters, 
  onQueueChange, 
  onHistoryChange, 
  onReset 
}) => {
  const [localTextFilters, setLocalTextFilters] = useState({
    candidateId: queueFilters.candidateId || '',
    reviewerId: mode === 'queue' ? (queueFilters.reviewerId || '') : (historyFilters.reviewerId || ''),
    reviewedCandidateId: historyFilters.reviewedCandidateId || '',
  });

  // Sync internal state when mode changes
  useEffect(() => {
    setLocalTextFilters({
      candidateId: queueFilters.candidateId || '',
      reviewerId: mode === 'queue' ? (queueFilters.reviewerId || '') : (historyFilters.reviewerId || ''),
      reviewedCandidateId: historyFilters.reviewedCandidateId || '',
    });
  }, [mode, queueFilters, historyFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      let changed = false;

      if (mode === 'queue') {
        const updates: Partial<ReviewQueueQuery> = {};
        if (localTextFilters.candidateId !== (queueFilters.candidateId || '')) {
          updates.candidateId = localTextFilters.candidateId === '' ? undefined : localTextFilters.candidateId;
          changed = true;
        }
        if (localTextFilters.reviewerId !== (queueFilters.reviewerId || '')) {
          updates.reviewerId = localTextFilters.reviewerId === '' ? undefined : localTextFilters.reviewerId;
          changed = true;
        }
        if (changed) {
          onQueueChange({ ...queueFilters, ...updates, page: 1 });
        }
      } else {
        const updates: Partial<ReviewsQuery> = {};
        if (localTextFilters.reviewerId !== (historyFilters.reviewerId || '')) {
          updates.reviewerId = localTextFilters.reviewerId === '' ? undefined : localTextFilters.reviewerId;
          changed = true;
        }
        if (localTextFilters.reviewedCandidateId !== (historyFilters.reviewedCandidateId || '')) {
          updates.reviewedCandidateId = localTextFilters.reviewedCandidateId === '' ? undefined : localTextFilters.reviewedCandidateId;
          changed = true;
        }
        if (changed) {
          onHistoryChange({ ...historyFilters, ...updates, page: 1 });
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localTextFilters, mode, queueFilters, historyFilters, onQueueChange, onHistoryChange]);

  const handleQueueSelectChange = (key: keyof ReviewQueueQuery, value: string) => {
    onQueueChange({ ...queueFilters, [key]: value === '' ? undefined : value, page: 1 });
  };

  const handleHistorySelectChange = (key: keyof ReviewsQuery, value: string) => {
    onHistoryChange({ ...historyFilters, [key]: value === '' ? undefined : value, page: 1 });
  };

  return (
    <div className="bg-white/5 border border-[rgba(255,255,255,0.1)] rounded-xl p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Filters</h3>
        <Button variant="secondary" size="sm" onClick={onReset}>Clear All</Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mode === 'queue' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Frame Decision</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={queueFilters.frameDecision || ''}
                onChange={(e) => handleQueueSelectChange('frameDecision', e.target.value)}
              >
                <option value="">All</option>
                <option value="HIGH_PRIORITY_CANDIDATE">High Priority</option>
                <option value="POSSIBLE_MATCH">Possible Match</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Claimed State</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={queueFilters.claimedState || ''}
                onChange={(e) => handleQueueSelectChange('claimedState', e.target.value)}
              >
                <option value="">All</option>
                <option value="UNCLAIMED">Unclaimed</option>
                <option value="CLAIMED_BY_ME">Claimed By Me</option>
                <option value="CLAIMED_BY_OTHER">Claimed By Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Selected Branch</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={queueFilters.selectedBranch || ''}
                onChange={(e) => handleQueueSelectChange('selectedBranch', e.target.value)}
              >
                <option value="">All</option>
                <option value="arcface">ArcFace</option>
                <option value="adaface">AdaFace</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Telemetry Candidate ID</label>
              <Input
                placeholder="e.g. DID001"
                value={localTextFilters.candidateId}
                onChange={(e) => setLocalTextFilters(prev => ({ ...prev, candidateId: e.target.value }))}
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Reviewer ID</label>
              <Input
                placeholder="User UUID"
                value={localTextFilters.reviewerId}
                onChange={(e) => setLocalTextFilters(prev => ({ ...prev, reviewerId: e.target.value }))}
              />
            </div>
          </>
        )}

        {mode === 'history' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Status</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={historyFilters.status || ''}
                onChange={(e) => handleHistorySelectChange('status', e.target.value)}
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Decision</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={historyFilters.decision || ''}
                onChange={(e) => handleHistorySelectChange('decision', e.target.value)}
              >
                <option value="">All</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="REJECTED">Rejected</option>
                <option value="INCONCLUSIVE">Inconclusive</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Reviewer ID</label>
              <Input
                placeholder="User UUID"
                value={localTextFilters.reviewerId}
                onChange={(e) => setLocalTextFilters(prev => ({ ...prev, reviewerId: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Reviewed Candidate ID</label>
              <Input
                placeholder="e.g. DID001"
                value={localTextFilters.reviewedCandidateId}
                onChange={(e) => setLocalTextFilters(prev => ({ ...prev, reviewedCandidateId: e.target.value }))}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
