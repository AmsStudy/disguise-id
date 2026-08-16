'use client';

import React from 'react';
import { MlV2ReviewedAlert } from '../../types/ml-v2-reviewed-alert';

interface MlV2ReviewedAlertHistoryTableProps {
  data: MlV2ReviewedAlert[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetail: (item: MlV2ReviewedAlert) => void;
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

export const MlV2ReviewedAlertHistoryTable: React.FC<MlV2ReviewedAlertHistoryTableProps> = ({
  data,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onViewDetail,
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>No reviewed alerts found.</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Adjust filters or check back later.</div>
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
              <th style={thStyle}>Alert ID</th>
              <th style={thStyle}>Promoted Candidate</th>
              <th style={thStyle}>Promotion ID</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIdx) => (
              <tr key={item.id} style={{ borderBottom: rowIdx < data.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s ease' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                </td>
                <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                  {item.id}
                </td>
                <td style={tdStyle}>
                  <span style={{ display: 'inline-block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: 'white', background: 'rgba(0,229,255,0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                    {item.promotedCandidateId}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                  {item.promotionId}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button
                    onClick={() => onViewDetail(item)}
                    style={{ padding: '5px 12px', borderRadius: '7px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
                  >
                    View Detail
                  </button>
                </td>
              </tr>
            ))}
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
