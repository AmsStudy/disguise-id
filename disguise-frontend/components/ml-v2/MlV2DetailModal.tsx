'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MlV2StatusBadge } from './MlV2StatusBadge';
import { getMlV2TelemetryById } from '../../services/mlV2Api';

interface MlV2DetailModalProps {
  id: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const sectionStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  overflow: 'hidden',
};

const sectionHeaderStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  background: 'rgba(255,255,255,0.02)',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  gap: '16px',
};

const rowKeyStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.4)',
  flexShrink: 0,
};

const rowValStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.75)',
  fontFamily: "'JetBrains Mono', monospace",
  textAlign: 'right',
  wordBreak: 'break-all',
};

export const MlV2DetailModal: React.FC<MlV2DetailModalProps> = ({ id, isOpen, onClose }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['mlV2Detail', id],
    queryFn: () => getMlV2TelemetryById(id!),
    enabled: !!id && isOpen,
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0D1B2A',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '88vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(13,27,42,0.95)',
          backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'rgba(0,229,255,0.1)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#00E5FF',
            }}>
              <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>Telemetry Detail</div>
              {id && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace", marginTop: '1px' }}>{id.slice(0, 18)}…</div>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
          >
            <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[80, 140, 100, 160].map((h, i) => (
                <div key={i} style={{ height: `${h}px`, background: 'rgba(255,255,255,0.04)', borderRadius: '12px', animation: 'pulse 2s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}

          {isError && (
            <div style={{
              padding: '32px', textAlign: 'center',
              background: 'rgba(255,61,61,0.06)',
              border: '1px solid rgba(255,61,61,0.15)',
              borderRadius: '12px',
            }}>
              <svg style={{ width: '40px', height: '40px', color: '#FF5555', margin: '0 auto 12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div style={{ fontSize: '13px', color: '#FF5555' }}>
                {error instanceof Error ? error.message : 'Failed to load telemetry detail'}
              </div>
            </div>
          )}

          {data && (
            <>
              {/* Status Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { label: 'Status', content: <MlV2StatusBadge type="status" status={data.status} /> },
                  { label: 'Decision', content: <MlV2StatusBadge type="frameDecision" frameDecision={data.frameDecision} /> },
                  {
                    label: 'Branch',
                    content: (
                      <span style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: '#00E5FF' }}>
                        {data.selectedBranch || 'N/A'}
                      </span>
                    )
                  },
                  {
                    label: 'Verification',
                    content: (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: data.requiresOperatorVerification ? '#FFB300' : 'rgba(255,255,255,0.3)' }}>
                        {data.requiresOperatorVerification ? 'REQUIRED' : 'Not Needed'}
                      </span>
                    )
                  },
                ].map((card, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '10px',
                    padding: '12px',
                  }}>
                    <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
                      {card.label}
                    </div>
                    {card.content}
                  </div>
                ))}
              </div>

              {/* UNKNOWN Notice */}
              {data.frameDecision === 'UNKNOWN' && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(123,140,255,0.08)',
                  border: '1px solid rgba(123,140,255,0.2)',
                  borderRadius: '10px',
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                }}>
                  <span style={{ color: '#7B8CFF', fontSize: '16px', flexShrink: 0 }}>ℹ️</span>
                  <p style={{ fontSize: '12px', color: 'rgba(180,190,255,0.8)', lineHeight: 1.5 }}>
                    <strong style={{ color: '#7B8CFF' }}>Telemetry Only:</strong> The candidate shown is the nearest gallery candidate for observability purposes only and is <strong>not</strong> an accepted identity match.
                  </p>
                </div>
              )}

              {/* Identifiers */}
              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Identifiers</div>
                {[
                  ['Result ID', data.id],
                  ['Detection Event', data.detectionEventId],
                  ['Camera Session', data.cameraSessionId || 'N/A'],
                  ['Track ID', data.trackId || 'N/A'],
                  ['Job ID', data.jobId || 'N/A'],
                  ['Request ID', data.requestId || 'N/A'],
                ].map(([k, v], i, arr) => (
                  <div key={k} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={rowKeyStyle}>{k}</span>
                    <span style={{ ...rowValStyle, fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Branch Comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  {
                    title: 'Original Branch',
                    isSelected: data.selectedBranch === 'ORIGINAL',
                    rows: [
                      ['Valid', data.originalValid ? 'True' : 'False'],
                      ['Candidate ID', data.originalCandidateId || 'N/A'],
                      ['Score', data.originalScore?.toFixed(4) || 'N/A'],
                      ['Second Score', data.originalSecondScore?.toFixed(4) || 'N/A'],
                      ['Margin', data.originalMargin?.toFixed(4) || 'N/A'],
                    ]
                  },
                  {
                    title: 'Reconstructed Branch',
                    isSelected: data.selectedBranch === 'RECONSTRUCTED',
                    rows: [
                      ['Valid', data.reconstructedValid ? 'True' : 'False'],
                      ['Candidate ID', data.reconstructedCandidateId || 'N/A'],
                      ['Score', data.reconstructedScore?.toFixed(4) || 'N/A'],
                      ['Second Score', data.reconstructedSecondScore?.toFixed(4) || 'N/A'],
                      ['Margin', data.reconstructedMargin?.toFixed(4) || 'N/A'],
                    ]
                  },
                ].map((branch) => (
                  <div key={branch.title} style={{
                    ...sectionStyle,
                    borderColor: branch.isSelected ? 'rgba(0,229,255,0.25)' : 'rgba(255,255,255,0.08)',
                    background: branch.isSelected ? 'rgba(0,229,255,0.04)' : 'rgba(255,255,255,0.03)',
                  }}>
                    <div style={{ ...sectionHeaderStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{branch.title}</span>
                      {branch.isSelected && (
                        <span style={{
                          padding: '2px 7px', borderRadius: '4px',
                          background: 'rgba(0,229,255,0.15)',
                          color: '#00E5FF',
                          fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>
                          ✓ Selected
                        </span>
                      )}
                    </div>
                    {branch.rows.map(([k, v], i, arr) => (
                      <div key={k} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <span style={rowKeyStyle}>{k}</span>
                        <span style={{ ...rowValStyle, color: k === 'Candidate ID' ? '#00E5FF' : 'rgba(255,255,255,0.65)', fontSize: '11px' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Operations */}
              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Performance & Metadata</div>
                {[
                  ['Created At', new Date(data.createdAt).toLocaleString()],
                  ['Service Processing', `${data.serviceProcessingMs} ms`],
                  ['Round Trip Latency', `${data.roundTripLatencyMs} ms`],
                  ['Error Code', data.errorCode || 'None'],
                  ['Model Version', data.modelVersion || 'N/A'],
                  ['Gallery Version', data.galleryVersion || 'N/A'],
                ].map(([k, v], i, arr) => (
                  <div key={k} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={rowKeyStyle}>{k}</span>
                    <span style={{ ...rowValStyle, color: k === 'Error Code' && v !== 'None' ? '#FF5555' : 'rgba(255,255,255,0.65)', fontSize: '12px' }}>{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
