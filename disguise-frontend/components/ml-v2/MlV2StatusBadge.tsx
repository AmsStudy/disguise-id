'use client';

import React from 'react';
import { MlV2Status, MlV2FrameDecision } from '../../types/ml-v2';

interface MlV2StatusBadgeProps {
  status?: MlV2Status | null;
  frameDecision?: MlV2FrameDecision | null;
  type: 'status' | 'frameDecision';
  className?: string;
}

const badgeBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '3px 8px',
  borderRadius: '6px',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

export const MlV2StatusBadge: React.FC<MlV2StatusBadgeProps> = ({ status, frameDecision, type }) => {
  if (type === 'status' && status) {
    if (status === 'SUCCESS') return (
      <span style={{ ...badgeBase, background: 'rgba(0,230,118,0.12)', color: '#00E676', border: '1px solid rgba(0,230,118,0.25)' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00E676', flexShrink: 0 }} />
        Success
      </span>
    );
    if (status === 'FAILED') return (
      <span style={{ ...badgeBase, background: 'rgba(255,61,61,0.12)', color: '#FF5555', border: '1px solid rgba(255,61,61,0.25)' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF5555', flexShrink: 0 }} />
        Failed
      </span>
    );
  }

  if (type === 'frameDecision' && frameDecision) {
    if (frameDecision === 'HIGH_PRIORITY_CANDIDATE') return (
      <span style={{ ...badgeBase, background: 'rgba(255,68,68,0.12)', color: '#FF4444', border: '1px solid rgba(255,68,68,0.3)' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF4444', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
        High Priority
      </span>
    );
    if (frameDecision === 'POSSIBLE_MATCH') return (
      <span style={{ ...badgeBase, background: 'rgba(255,179,0,0.12)', color: '#FFB300', border: '1px solid rgba(255,179,0,0.25)' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFB300', flexShrink: 0 }} />
        Possible Match
      </span>
    );
    if (frameDecision === 'UNKNOWN') return (
      <span style={{ ...badgeBase, background: 'rgba(123,140,255,0.12)', color: '#7B8CFF', border: '1px solid rgba(123,140,255,0.25)' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7B8CFF', flexShrink: 0 }} />
        Unknown
      </span>
    );
  }

  return (
    <span style={{ ...badgeBase, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
      N/A
    </span>
  );
};
