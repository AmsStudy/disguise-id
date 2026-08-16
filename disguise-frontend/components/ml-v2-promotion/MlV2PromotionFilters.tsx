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

export const MlV2PromotionFilters: React.FC<MlV2PromotionFiltersProps> = ({
  mode,
  queueFilters,
  historyFilters,
  onQueueChange,
  onHistoryChange,
  onReset,
}) => {
  const [localQueueCandidate, setLocalQueueCandidate] = useState(queueFilters.reviewedCandidateId || '');
  const [localHistoryCandidate, setLocalHistoryCandidate] = useState(historyFilters.promotedCandidateId || '');

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

  useEffect(() => {
    setLocalQueueCandidate(queueFilters.reviewedCandidateId || '');
  }, [queueFilters.reviewedCandidateId]);

  useEffect(() => {
    setLocalHistoryCandidate(historyFilters.promotedCandidateId || '');
  }, [historyFilters.promotedCandidateId]);

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

      {mode === 'queue' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Reviewed Candidate ID</label>
            <Input
              placeholder="e.g. DID001"
              value={localQueueCandidate}
              onChange={(e) => setLocalQueueCandidate(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Reviewer UUID</label>
            <Input
              placeholder="Exact UUID"
              value={queueFilters.reviewerId || ''}
              onChange={(e) => onQueueChange({ ...queueFilters, reviewerId: e.target.value || undefined, page: 1 })}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Original Frame Decision</label>
            <select
              style={selectStyle}
              value={queueFilters.frameDecision || ''}
              onChange={(e) => onQueueChange({ ...queueFilters, frameDecision: e.target.value || undefined, page: 1 })}
            >
              <option value="" style={{ color: 'black' }}>All</option>
              <option value="HIGH_PRIORITY_CANDIDATE" style={{ color: 'black' }}>HIGH_PRIORITY_CANDIDATE</option>
              <option value="POSSIBLE_MATCH" style={{ color: 'black' }}>POSSIBLE_MATCH</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Reviewed From</label>
            <Input
              type="date"
              value={queueFilters.reviewedFrom ? queueFilters.reviewedFrom.split('T')[0] : ''}
              onChange={(e) => onQueueChange({
                ...queueFilters,
                reviewedFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                page: 1
              })}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', colorScheme: 'dark' }}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Promoted Candidate ID</label>
            <Input
              placeholder="e.g. DID001"
              value={localHistoryCandidate}
              onChange={(e) => setLocalHistoryCandidate(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Promoter UUID</label>
            <Input
              placeholder="Exact UUID"
              value={historyFilters.promotedById || ''}
              onChange={(e) => onHistoryChange({ ...historyFilters, promotedById: e.target.value || undefined, page: 1 })}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Promoted From</label>
            <Input
              type="date"
              value={historyFilters.promotedFrom ? historyFilters.promotedFrom.split('T')[0] : ''}
              onChange={(e) => onHistoryChange({
                ...historyFilters,
                promotedFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                page: 1
              })}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', colorScheme: 'dark' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
