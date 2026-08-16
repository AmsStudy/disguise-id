'use client';

import React from 'react';
import { MlV2ReviewQueueItem } from '../../types/ml-v2-review';

interface MlV2ReviewQueueTableProps {
  data: MlV2ReviewQueueItem[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onViewDetail: (item: MlV2ReviewQueueItem) => void;
  onClaim: (item: MlV2ReviewQueueItem) => void;
  claimingId: string | null;
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  whiteSpace: 'nowrap',
  textAlign: 'left',
};

const tdStyle: React.CSSProperties = {
  padding: '13px 16px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.7)',
  verticalAlign: 'middle',
};

export const MlV2ReviewQueueTable: React.FC<MlV2ReviewQueueTableProps> = ({ 
  data, 
  isLoading, 
  page, 
  totalPages, 
  onPageChange, 
  onViewDetail,
  onClaim,
  claimingId
}) => {
  if (isLoading) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '32px' }}>
          {['200px', '100px', '130px', '150px', '100px'].map((w, i) => (
            <div key={i} style={{ height: '12px', width: w, background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 2s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '32px', alignItems: 'center' }}>
            {['200px', '80px', '110px', '140px', '90px'].map((w, j) => (
              <div key={j} style={{ height: '10px', width: w, background: 'rgba(255,255,255,0.04)', borderRadius: '4px', animation: 'pulse 2s ease-in-out infinite', animationDelay: `${(i * 0.05) + (j * 0.03)}s` }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.04)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
          <svg style={{ width: '24px', height: '24px', color: 'rgba(255,255,255,0.2)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>No reviews found in queue.</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Adjust filters or wait for new detection alerts.</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={thStyle}>Created At</th>
              <th style={thStyle}>Decision</th>
              <th style={thStyle}>Candidate ID</th>
              <th style={thStyle}>State</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIdx) => {
              const isClaimedByOther = item.claimedState === 'CLAIMED_BY_OTHER';
              const isClaiming = claimingId === item.id;
              
              let decisionColor = 'rgba(255,255,255,0.4)';
              let decisionBg = 'rgba(255,255,255,0.08)';
              if (item.frameDecision === 'HIGH_PRIORITY_CANDIDATE') { decisionColor = '#FF5555'; decisionBg = 'rgba(255,61,61,0.15)'; }
              else if (item.frameDecision === 'POSSIBLE_MATCH') { decisionColor = '#FFB300'; decisionBg = 'rgba(255,179,0,0.15)'; }

              let stateColor = 'rgba(255,255,255,0.4)';
              let stateBg = 'rgba(255,255,255,0.08)';
              if (item.claimedState === 'CLAIMED_BY_ME') { stateColor = '#00E5FF'; stateBg = 'rgba(0,229,255,0.15)'; }
              else if (item.claimedState === 'CLAIMED_BY_OTHER') { stateColor = '#FFB300'; stateBg = 'rgba(255,179,0,0.15)'; }

              return (
                <tr key={item.id} style={{ borderBottom: rowIdx < data.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s ease' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    {new Date(item.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', background: decisionBg, color: decisionColor, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                      {item.frameDecision}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                    {item.candidateId || '-'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '99px', background: stateBg, color: stateColor, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                      {item.claimedState !== 'UNCLAIMED' && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stateColor, animation: item.claimedState === 'CLAIMED_BY_ME' ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />}
                      {item.claimedState.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        onClick={() => onViewDetail(item)}
                        style={{ padding: '5px 12px', borderRadius: '7px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
                      >
                        View
                      </button>
                      {!isClaimedByOther && (
                        <button
                          disabled={isClaiming || item.claimedState === 'CLAIMED_BY_ME'}
                          onClick={() => onClaim(item)}
                          style={{
                            padding: '5px 12px', borderRadius: '7px',
                            background: item.claimedState === 'CLAIMED_BY_ME' ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.15)',
                            border: `1px solid ${item.claimedState === 'CLAIMED_BY_ME' ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.4)'}`,
                            color: item.claimedState === 'CLAIMED_BY_ME' ? 'rgba(0,229,255,0.5)' : '#00E5FF',
                            fontSize: '11px', fontWeight: 600,
                            cursor: (isClaiming || item.claimedState === 'CLAIMED_BY_ME') ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { if (!isClaiming && item.claimedState !== 'CLAIMED_BY_ME') { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.25)'; } }}
                          onMouseLeave={e => { if (!isClaiming && item.claimedState !== 'CLAIMED_BY_ME') { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.15)'; } }}
                        >
                          {isClaiming ? 'Claiming...' : (item.claimedState === 'CLAIMED_BY_ME' ? 'Claimed' : 'Claim')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            Page <span style={{ color: 'white', fontWeight: 600 }}>{page}</span> of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: '← Prev', action: () => onPageChange(page - 1), disabled: page <= 1 },
              { label: 'Next →', action: () => onPageChange(page + 1), disabled: page >= totalPages },
            ].map((btn) => (
              <button
                key={btn.label} onClick={btn.action} disabled={btn.disabled}
                style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: btn.disabled ? 'not-allowed' : 'pointer', opacity: btn.disabled ? 0.3 : 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (!btn.disabled) { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.3)'; (e.currentTarget as HTMLElement).style.color = '#00E5FF'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
