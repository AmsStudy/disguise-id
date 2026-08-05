'use client';

import React from 'react';
import { Badge } from '../ui/Badge';
import { MlV2Status, MlV2FrameDecision } from '../../types/ml-v2';

interface MlV2StatusBadgeProps {
  status?: MlV2Status | null;
  frameDecision?: MlV2FrameDecision | null;
  type: 'status' | 'frameDecision';
  className?: string;
}

export const MlV2StatusBadge: React.FC<MlV2StatusBadgeProps> = ({ status, frameDecision, type, className }) => {
  if (type === 'status' && status) {
    if (status === 'SUCCESS') return <Badge variant="low" className={className}>Success</Badge>;
    if (status === 'FAILED') return <Badge variant="critical" className={className}>Failed</Badge>;
  }

  if (type === 'frameDecision' && frameDecision) {
    if (frameDecision === 'HIGH_PRIORITY_CANDIDATE') return <Badge variant="critical" pulse className={className}>High Priority</Badge>;
    if (frameDecision === 'POSSIBLE_MATCH') return <Badge variant="medium" className={className}>Possible Match</Badge>;
    if (frameDecision === 'UNKNOWN') return <Badge variant="info" className={className}>Unknown</Badge>;
  }

  return <Badge variant="default" className={className}>N/A</Badge>;
};
