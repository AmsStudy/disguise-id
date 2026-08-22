'use client';

import React from 'react';

interface SimilarityScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showBar?: boolean;
}

function calculateCalibratedPercentage(distance: number): number {
  if (distance <= 0.70) {
    return Math.min(99.0, Math.max(92.0, 99.0 - (distance / 0.70) * 7.0));
  } else if (distance <= 1.12) {
    return 92.0 - ((distance - 0.70) / (1.12 - 0.70)) * 14.0;
  } else if (distance <= 1.30) {
    return 78.0 - ((distance - 1.12) / (1.30 - 1.12)) * 23.0;
  } else {
    return Math.max(0.0, 55.0 - ((distance - 1.30) / 0.70) * 55.0);
  }
}

export const SimilarityScore: React.FC<SimilarityScoreProps> = ({
  score,
  size = 'md',
  showBar = false,
}) => {
  const distance = Math.abs(score);
  const isDistance = score < 0 || distance > 1.0;

  let accuracyPct = 0;
  if (isDistance) {
    accuracyPct = calculateCalibratedPercentage(distance);
  } else {
    // Legacy cosine similarity fallback (0.0 to 1.0)
    accuracyPct = Math.min(100, Math.max(0, score * 100));
  }

  const pctStr = accuracyPct.toFixed(1);

  let tierLabel = 'RENDAH';
  let tierDesc = 'Bukan Target / Beda Orang';
  let color = '#FF3D3D'; // Coral Red

  if (accuracyPct >= 78.0) {
    tierLabel = 'TINGGI';
    tierDesc = 'Identitas Positif / Sangat Mirip';
    color = '#00E676'; // Neon Green
  } else if (accuracyPct >= 55.0) {
    tierLabel = 'SEDANG';
    tierDesc = 'Kemiripan Sedang / Perlu Verifikasi';
    color = '#FFD600'; // Amber Gold
  }

  const fontSizeMap = { sm: '13px', md: '15px', lg: '22px' };
  const subFontSizeMap = { sm: '10px', md: '11px', lg: '13px' };

  return (
    <div
      style={{ display: 'inline-flex', flexDirection: 'column', gap: '5px', minWidth: size === 'sm' ? '95px' : '140px' }}
      title={`Forensik Biometrik — Tingkat Kemiripan: ${pctStr}% | Jarak L2: ${distance.toFixed(3)} | Status: ${tierDesc}`}
    >
      {/* Main Percentage Readout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: fontSizeMap[size] === '13px' ? '12px' : '15px' }}>
          {accuracyPct >= 78.0 ? '🎯' : accuracyPct >= 55.0 ? '⚠️' : '❌'}
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: fontSizeMap[size],
            fontWeight: 700,
            color,
            textShadow: `0 0 10px ${color}40`,
            letterSpacing: '0.3px',
          }}
        >
          {size === 'sm' ? `${pctStr}% Match` : `Tingkat Kemiripan: ${pctStr}%`}
        </span>
      </div>

      {/* Complete Unambiguous Forensic Sub-label */}
      {size !== 'sm' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: subFontSizeMap[size],
            color: 'rgba(255, 255, 255, 0.7)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: `1px solid ${color}35`,
            width: 'fit-content',
          }}
        >
          <span style={{ fontWeight: 700, color }}>[{tierLabel}]</span>
          <span>L2: {distance.toFixed(2)}</span>
        </div>
      )}

      {/* Accuracy Level Bar */}
      {showBar && (
        <div
          style={{
            width: '100%',
            height: size === 'lg' ? '6px' : '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '3px',
            overflow: 'hidden',
            marginTop: '2px',
          }}
        >
          <div
            style={{
              width: `${accuracyPct}%`,
              height: '100%',
              backgroundColor: color,
              borderRadius: '3px',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: `0 0 8px ${color}`,
            }}
          />
        </div>
      )}
    </div>
  );
};
