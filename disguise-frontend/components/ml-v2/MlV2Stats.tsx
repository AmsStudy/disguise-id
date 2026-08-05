'use client';

import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { MlV2Stats as StatsType } from '../../types/ml-v2';

interface MlV2StatsProps {
  stats?: StatsType;
  isLoading: boolean;
}

export const MlV2Stats: React.FC<MlV2StatsProps> = ({ stats, isLoading }) => {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <GlassCard key={i} className="animate-pulse h-24">
            <span className="sr-only">Loading</span>
          </GlassCard>
        ))}
      </div>
    );
  }

  const statItems = [
    { label: 'Total Inferences', value: stats.total, color: 'text-white' },
    { label: 'High Priority', value: stats.byFrameDecision.HIGH_PRIORITY_CANDIDATE || 0, color: 'text-red-400' },
    { label: 'Possible Match', value: stats.byFrameDecision.POSSIBLE_MATCH || 0, color: 'text-yellow-400' },
    { label: 'Unknown', value: stats.byFrameDecision.UNKNOWN || 0, color: 'text-cyan-400' },
    { label: 'Failed', value: stats.byStatus.FAILED || 0, color: 'text-gray-400' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {statItems.map((item, idx) => (
        <GlassCard key={idx} className="p-4 flex flex-col justify-center items-center text-center">
          <span className="text-sm text-gray-400 mb-1">{item.label}</span>
          <span className={`text-3xl font-bold ${item.color}`}>{item.value.toLocaleString()}</span>
        </GlassCard>
      ))}
    </div>
  );
};
