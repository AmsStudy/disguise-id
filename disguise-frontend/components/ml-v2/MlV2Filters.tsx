'use client';

import React, { useState, useEffect } from 'react';
import { MlV2ListQuery } from '../../types/ml-v2';

interface MlV2FiltersProps {
  filters: MlV2ListQuery;
  onChange: (newFilters: MlV2ListQuery) => void;
  onReset: () => void;
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '9px 36px 9px 12px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.85)',
  outline: 'none',
  appearance: 'none' as const,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: 'Inter, sans-serif',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '9px 12px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.85)',
  outline: 'none',
  transition: 'all 0.2s ease',
  fontFamily: 'Inter, sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'rgba(255,255,255,0.4)',
  marginBottom: '8px',
};

export const MlV2Filters: React.FC<MlV2FiltersProps> = ({ filters, onChange, onReset }) => {
  const [localTextFilters, setLocalTextFilters] = useState({
    candidateId: filters.candidateId || '',
    cameraSessionId: filters.cameraSessionId || '',
    trackId: filters.trackId || '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      let changed = false;
      const updates: Partial<MlV2ListQuery> = {};
      if (localTextFilters.candidateId !== (filters.candidateId || '')) {
        updates.candidateId = localTextFilters.candidateId === '' ? undefined : localTextFilters.candidateId;
        changed = true;
      }
      if (localTextFilters.cameraSessionId !== (filters.cameraSessionId || '')) {
        updates.cameraSessionId = localTextFilters.cameraSessionId === '' ? undefined : localTextFilters.cameraSessionId;
        changed = true;
      }
      if (localTextFilters.trackId !== (filters.trackId || '')) {
        updates.trackId = localTextFilters.trackId === '' ? undefined : localTextFilters.trackId;
        changed = true;
      }
      if (changed) onChange({ ...filters, ...updates, page: 1 });
    }, 500);
    return () => clearTimeout(timer);
  }, [localTextFilters, filters, onChange]);

  const handleSelectChange = (key: keyof MlV2ListQuery, value: string) => {
    onChange({ ...filters, [key]: value === '' ? undefined : value, page: 1 });
  };

  const handleCheckboxChange = (key: keyof MlV2ListQuery, checked: boolean) => {
    onChange({ ...filters, [key]: checked ? true : undefined, page: 1 });
  };

  const handleReset = () => {
    setLocalTextFilters({ candidateId: '', cameraSessionId: '', trackId: '' });
    onReset();
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <svg style={{ width: '14px', height: '14px', color: 'rgba(0,229,255,0.7)', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          Filter Telemetry
        </span>
      </div>

      {/* Filter grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}
           className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4">
        {/* Status */}
        <div>
          <label style={labelStyle}>Status</label>
          <div style={{ position: 'relative' }}>
            <select
              style={selectStyle}
              value={filters.status || ''}
              onChange={(e) => handleSelectChange('status', e.target.value)}
              onFocus={e => { e.target.style.borderColor = 'rgba(0,229,255,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              <option value="">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
            <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Frame Decision */}
        <div>
          <label style={labelStyle}>Frame Decision</label>
          <div style={{ position: 'relative' }}>
            <select
              style={selectStyle}
              value={filters.frameDecision || ''}
              onChange={(e) => handleSelectChange('frameDecision', e.target.value)}
              onFocus={e => { e.target.style.borderColor = 'rgba(0,229,255,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              <option value="">All Decisions</option>
              <option value="HIGH_PRIORITY_CANDIDATE">High Priority</option>
              <option value="POSSIBLE_MATCH">Possible Match</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
            <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Candidate ID */}
        <div>
          <label style={labelStyle}>Candidate ID</label>
          <input
            type="text"
            style={inputStyle}
            placeholder="Search by ID..."
            value={localTextFilters.candidateId}
            onChange={(e) => setLocalTextFilters(prev => ({ ...prev, candidateId: e.target.value }))}
            onFocus={e => { e.target.style.borderColor = 'rgba(0,229,255,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
          />
        </div>

        {/* Camera Session */}
        <div>
          <label style={labelStyle}>Camera Session</label>
          <input
            type="text"
            style={inputStyle}
            placeholder="Session ID..."
            value={localTextFilters.cameraSessionId}
            onChange={(e) => setLocalTextFilters(prev => ({ ...prev, cameraSessionId: e.target.value }))}
            onFocus={e => { e.target.style.borderColor = 'rgba(0,229,255,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
          />
        </div>
      </div>

      {/* Footer: checkbox + reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div style={{ position: 'relative', width: '16px', height: '16px', flexShrink: 0 }}>
            <input
              type="checkbox"
              style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 1 }}
              checked={!!filters.requiresOperatorVerification}
              onChange={(e) => handleCheckboxChange('requiresOperatorVerification', e.target.checked)}
            />
            <div style={{
              width: '16px', height: '16px',
              background: filters.requiresOperatorVerification ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${filters.requiresOperatorVerification ? 'rgba(0,229,255,0.6)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>
              {filters.requiresOperatorVerification && (
                <svg style={{ width: '10px', height: '10px', color: '#00E5FF' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', userSelect: 'none' }}>
            Requires Operator Verification
          </span>
        </label>

        <button
          onClick={handleReset}
          style={{
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '6px 14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
