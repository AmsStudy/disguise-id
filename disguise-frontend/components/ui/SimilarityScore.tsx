'use client';

import React from 'react';

interface SimilarityScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showBar?: boolean;
}

export const SimilarityScore: React.FC<SimilarityScoreProps> = ({
  score,
  size = 'md',
  showBar = false,
}) => {
  const distance = Math.abs(score);
  // VAE Euclidean distances are negative in DB or > 1.5 in raw values
  const isDistance = score < 0 || distance > 1.5;

  // Calculate biometric accuracy percentage based on empirical Facenet thresholds
  // Distance 0.0 = 100%, Distance 2.0 = 0%
  // Tier TINGGI: distance <= 0.8 -> >= 60.0%
  // Tier SEDANG: 0.8 < distance <= 1.35 -> >= 32.5%
  // Tier RENDAH: distance > 1.35 -> < 32.5%
  let accuracyPct = 0;
  if (isDistance) {
    accuracyPct = 100 * (1 - distance / 2.0);
    accuracyPct = Math.max(0, Math.min(100, accuracyPct));
  } else {
    // Legacy cosine similarity fallback (0.0 to 1.0)
    accuracyPct = Math.min(100, Math.max(0, score * 100));
  }

  // Round to 1 decimal place for professional presentation
  const pctStr = accuracyPct.toFixed(1);

  // Unambiguous biometric classification
  let tierLabel = 'RENDAH';
  let tierDesc = 'Bukan Target / Beda Orang';
  let color = '#FF3D3D'; // Coral Red

  if (accuracyPct >= 80.0) {
    tierLabel = 'TINGGI';
    tierDesc = 'Identitas Positif / Sangat Mirip';
    color = '#00E676'; // Neon Green
  } else if (accuracyPct >= 65.0) {
    tierLabel = 'SEDANG';
    tierDesc = 'Kemiripan Sedang / Perlu Verifikasi';
    color = '#FFD600'; // Amber Gold
  }

  const fontSizeMap = { sm: '13px', md: '15px', lg: '22px' };
  const subFontSizeMap = { sm: '10px', md: '11px', lg: '13px' };

  return (
    <div
      style={{ display: 'inline-flex', flexDirection: 'column', gap: '5px', minWidth: size === 'sm' ? '95px' : '140px' }}
      title={`Forensik Biometrik — Akurasi: ${pctStr}% | Jarak L2: ${distance.toFixed(3)} | Status: ${tierDesc}`}
    >
      {/* Main Percentage Readout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: fontSizeMap[size] === '13px' ? '12px' : '15px' }}>
          {accuracyPct >= 80.0 ? '🎯' : accuracyPct >= 65.0 ? '⚠️' : '❌'}
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
          {size === 'sm' ? `${pctStr}% Match` : `Akurasi: ${pctStr}%`}
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

      {/* Neon Visual Confidence Bar */}
      {showBar && (
        <div
          style={{
            width: '100%',
            height: '5px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '3px',
            overflow: 'hidden',
            marginTop: '2px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div
            style={{
              width: `${Math.max(5, Math.min(100, accuracyPct))}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              boxShadow: `0 0 10px ${color}`,
              borderRadius: '3px',
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      )}
    </div>
  );
};
