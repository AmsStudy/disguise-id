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

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  marginBottom: '6px',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  color: 'white',
  outline: 'none',
  appearance: 'none',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
};

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
        if (changed) onQueueChange({ ...queueFilters, ...updates, page: 1 });
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
        if (changed) onHistoryChange({ ...historyFilters, ...updates, page: 1 });
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
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
          Filters
        </h3>
        <button
          onClick={onReset}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            padding: '5px 12px', borderRadius: '6px', color: 'rgba(255,255,255,0.7)',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
        >
          Clear All
        </button>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        {mode === 'queue' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Frame Decision</label>
              <select style={selectStyle} value={queueFilters.frameDecision || ''} onChange={(e) => handleQueueSelectChange('frameDecision', e.target.value)}>
                <option value="" style={{ color: 'black' }}>All</option>
                <option value="HIGH_PRIORITY_CANDIDATE" style={{ color: 'black' }}>High Priority</option>
                <option value="POSSIBLE_MATCH" style={{ color: 'black' }}>Possible Match</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Claimed State</label>
              <select style={selectStyle} value={queueFilters.claimedState || ''} onChange={(e) => handleQueueSelectChange('claimedState', e.target.value)}>
                <option value="" style={{ color: 'black' }}>All</option>
                <option value="UNCLAIMED" style={{ color: 'black' }}>Unclaimed</option>
                <option value="CLAIMED_BY_ME" style={{ color: 'black' }}>Claimed By Me</option>
                <option value="CLAIMED_BY_OTHER" style={{ color: 'black' }}>Claimed By Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Selected Branch</label>
              <select style={selectStyle} value={queueFilters.selectedBranch || ''} onChange={(e) => handleQueueSelectChange('selectedBranch', e.target.value)}>
                <option value="" style={{ color: 'black' }}>All</option>
                <option value="arcface" style={{ color: 'black' }}>ArcFace</option>
                <option value="adaface" style={{ color: 'black' }}>AdaFace</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Telemetry Candidate ID</label>
              <Input
                placeholder="e.g. DID001"
                value={localTextFilters.candidateId}
                onChange={(e) => setLocalTextFilters(prev => ({ ...prev, candidateId: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Reviewer ID</label>
              <Input
                placeholder="User UUID"
                value={localTextFilters.reviewerId}
                onChange={(e) => setLocalTextFilters(prev => ({ ...prev, reviewerId: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              />
            </div>
          </>
        )}

        {mode === 'history' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Status</label>
              <select style={selectStyle} value={historyFilters.status || ''} onChange={(e) => handleHistorySelectChange('status', e.target.value)}>
                <option value="" style={{ color: 'black' }}>All</option>
                <option value="PENDING" style={{ color: 'black' }}>Pending</option>
                <option value="COMPLETED" style={{ color: 'black' }}>Completed</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Decision</label>
              <select style={selectStyle} value={historyFilters.decision || ''} onChange={(e) => handleHistorySelectChange('decision', e.target.value)}>
                <option value="" style={{ color: 'black' }}>All</option>
                <option value="CONFIRMED" style={{ color: 'black' }}>Confirmed</option>
                <option value="REJECTED" style={{ color: 'black' }}>Rejected</option>
                <option value="INCONCLUSIVE" style={{ color: 'black' }}>Inconclusive</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Reviewer ID</label>
              <Input
                placeholder="User UUID"
                value={localTextFilters.reviewerId}
                onChange={(e) => setLocalTextFilters(prev => ({ ...prev, reviewerId: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Reviewed Candidate ID</label>
              <Input
                placeholder="e.g. DID001"
                value={localTextFilters.reviewedCandidateId}
                onChange={(e) => setLocalTextFilters(prev => ({ ...prev, reviewedCandidateId: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
