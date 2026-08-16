'use client';

import React from 'react';
import { MlV2StatusBadge } from './MlV2StatusBadge';
import { MlV2InferenceResult } from '../../types/ml-v2';

interface MlV2TableProps {
  data: MlV2InferenceResult[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onViewDetail: (id: string) => void;
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

export const MlV2Table: React.FC<MlV2TableProps> = ({
  data,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onViewDetail,
}) => {
  if (isLoading) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        {/* Skeleton header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '32px' }}>
          {['200px', '100px', '130px', '200px', '150px', '100px', '80px'].map((w, i) => (
            <div key={i} style={{ height: '12px', width: w, background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 2s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        {/* Skeleton rows */}
        {[...Array(7)].map((_, i) => (
          <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '32px', alignItems: 'center' }}>
            {['200px', '80px', '110px', '180px', '140px', '90px', '60px'].map((w, j) => (
              <div key={j} style={{ height: '10px', width: w, background: 'rgba(255,255,255,0.04)', borderRadius: '4px', animation: 'pulse 2s ease-in-out infinite', animationDelay: `${(i * 0.05) + (j * 0.03)}s` }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '64px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '56px', height: '56px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '4px',
        }}>
          <svg style={{ width: '24px', height: '24px', color: 'rgba(255,255,255,0.2)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>No telemetry data</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
          Adjust your filters or wait for new inference results.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Decision</th>
              <th style={thStyle}>Candidate ID</th>
              <th style={thStyle}>Score / Margin</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Verification</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIdx) => (
              <tr
                key={item.id}
                style={{
                  borderBottom: rowIdx < data.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {/* Timestamp */}
                <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                  {new Date(item.createdAt).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </td>

                {/* Status */}
                <td style={tdStyle}>
                  <MlV2StatusBadge type="status" status={item.status} />
                </td>

                {/* Decision */}
                <td style={tdStyle}>
                  <MlV2StatusBadge type="frameDecision" frameDecision={item.frameDecision} />
                </td>

                {/* Candidate ID */}
                <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                  {item.candidateId ? (
                    <span style={{ color: item.frameDecision === 'UNKNOWN' ? 'rgba(255,255,255,0.25)' : '#00E5FF', textDecoration: item.frameDecision === 'UNKNOWN' ? 'line-through' : 'none' }}>
                      {item.candidateId.slice(0, 8)}…
                    </span>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                  )}
                </td>

                {/* Score / Margin */}
                <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {item.score !== null ? item.score.toFixed(4) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                  </span>
                  <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.15)' }}>/</span>
                  <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {item.margin !== null ? item.margin.toFixed(4) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                  </span>
                </td>

                {/* Verification */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {item.requiresOperatorVerification ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '3px 8px', borderRadius: '6px',
                      background: 'rgba(255,179,0,0.12)',
                      border: '1px solid rgba(255,179,0,0.25)',
                      color: '#FFB300',
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FFB300', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      Required
                    </span>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                  )}
                </td>

                {/* Detail Button */}
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <button
                    onClick={() => onViewDetail(item.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.35)',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '7px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = '#00E5FF';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.4)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.06)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                    }}
                  >
                    View
                    <svg style={{ width: '11px', height: '11px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.01)',
        }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            Page <span style={{ color: 'white', fontWeight: 600 }}>{page}</span> of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: '← Prev', action: () => onPageChange(page - 1), disabled: page <= 1 },
              { label: 'Next →', action: () => onPageChange(page + 1), disabled: page >= totalPages },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.action}
                disabled={btn.disabled}
                style={{
                  padding: '5px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  cursor: btn.disabled ? 'not-allowed' : 'pointer',
                  opacity: btn.disabled ? 0.3 : 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                  transition: 'all 0.2s',
                  pointerEvents: btn.disabled ? 'none' : 'auto',
                }}
                onMouseEnter={e => {
                  if (!btn.disabled) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.08)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.3)';
                    (e.currentTarget as HTMLElement).style.color = '#00E5FF';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
                }}
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
