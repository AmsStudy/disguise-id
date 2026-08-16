'use client';

import React from 'react';
import { MlV2PromotionQueueItem } from '../../types/ml-v2-promotion';

interface MlV2PromotionQueueTableProps {
  data: MlV2PromotionQueueItem[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPromote: (item: MlV2PromotionQueueItem) => void;
  canPromote: boolean;
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

export const MlV2PromotionQueueTable: React.FC<MlV2PromotionQueueTableProps> = ({
  data,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onPromote,
  canPromote,
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>No reviews eligible for promotion.</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Pending or unconfirmed reviews will not appear here.</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={thStyle}>Review ID</th>
              <th style={thStyle}>Reviewed Candidate</th>
              <th style={thStyle}>Original Decision</th>
              <th style={thStyle}>Reviewed At</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIdx) => {
              
              let decisionColor = 'rgba(255,255,255,0.4)';
              let decisionBg = 'rgba(255,255,255,0.08)';
              const frameDecision = item.inferenceResult?.frameDecision;
              
              if (frameDecision === 'HIGH_PRIORITY_CANDIDATE') { decisionColor = '#FF5555'; decisionBg = 'rgba(255,61,61,0.15)'; }
              else if (frameDecision === 'POSSIBLE_MATCH') { decisionColor = '#FFB300'; decisionBg = 'rgba(255,179,0,0.15)'; }

              return (
                <tr key={item.id} style={{ borderBottom: rowIdx < data.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s ease' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                    {item.id}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: 'white', background: 'rgba(0,229,255,0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                      {item.reviewedCandidateId}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', background: decisionBg, color: decisionColor, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                      {frameDecision || 'UNKNOWN'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      onClick={() => onPromote(item)}
                      disabled={!canPromote}
                      style={{
                        padding: '6px 16px', borderRadius: '8px',
                        background: canPromote ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${canPromote ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        color: canPromote ? '#00E5FF' : 'rgba(255,255,255,0.3)',
                        fontSize: '11px', fontWeight: 700,
                        cursor: canPromote ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        letterSpacing: '0.05em'
                      }}
                      onMouseEnter={e => { if (canPromote) { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.25)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 10px rgba(0,229,255,0.2)'; } }}
                      onMouseLeave={e => { if (canPromote) { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.15)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; } }}
                    >
                      PROMOTE
                    </button>
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
