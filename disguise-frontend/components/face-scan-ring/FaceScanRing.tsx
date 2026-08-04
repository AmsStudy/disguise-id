'use client';

interface FaceScanRingProps {
  size?: number;
  variant?: 'full' | 'avatar';
  isScanning?: boolean;
  matchStatus?: 'idle' | 'scanning' | 'match' | 'no-match';
  children?: React.ReactNode;
}

const statusColors = {
  idle: { ring: '#0097B2', beam: '#00E5FF', glow: 'rgba(0, 151, 178, 0.3)' },
  scanning: { ring: '#00CFE8', beam: '#00E5FF', glow: 'rgba(0, 229, 255, 0.4)' },
  match: { ring: '#00E676', beam: '#00E676', glow: 'rgba(0, 230, 118, 0.4)' },
  'no-match': { ring: '#FF3D3D', beam: '#FF3D3D', glow: 'rgba(255, 61, 61, 0.4)' },
};

export const FaceScanRing: React.FC<FaceScanRingProps> = ({
  size = 200,
  variant = 'full',
  isScanning = true,
  matchStatus = 'scanning',
  children,
}) => {
  const colors = statusColors[matchStatus];
  const innerSize = size * 0.82;
  const bracketSize = size * 0.1;
  const bracketOffset = size * 0.03;

  if (variant === 'avatar') {
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        {/* Outer rotating ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `2px dashed ${colors.ring}`,
            animation: 'spin 8s linear infinite',
            boxShadow: `0 0 12px ${colors.glow}`,
          }}
        />
        {/* Inner counter-rotating */}
        <div
          style={{
            position: 'absolute',
            inset: '8%',
            borderRadius: '50%',
            border: `1px solid ${colors.beam}`,
            animation: 'spin 5s linear infinite reverse',
          }}
        />
        {/* Content centered */}
        <div
          style={{
            position: 'absolute',
            inset: '10%',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          inset: '10%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Outer ring - dashed, rotates CW 8s */}
      <div
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          border: `2px dashed ${colors.ring}`,
          animation: 'spin 8s linear infinite',
          opacity: 0.8,
        }}
      />

      {/* Inner ring - solid, rotates CCW 5s */}
      <div
        style={{
          position: 'absolute',
          width: innerSize,
          height: innerSize,
          borderRadius: '50%',
          border: `2px solid ${colors.beam}`,
          animation: 'spin 5s linear infinite reverse',
          boxShadow: `0 0 16px ${colors.glow}, inset 0 0 16px ${colors.glow}`,
        }}
      />

      {/* Bracket corners (cardinal points) */}
      {/* Top-left */}
      <div style={{
        position: 'absolute', top: bracketOffset, left: bracketOffset,
        width: bracketSize, height: bracketSize,
        borderTop: `2px solid ${colors.beam}`, borderLeft: `2px solid ${colors.beam}`,
      }} />
      {/* Top-right */}
      <div style={{
        position: 'absolute', top: bracketOffset, right: bracketOffset,
        width: bracketSize, height: bracketSize,
        borderTop: `2px solid ${colors.beam}`, borderRight: `2px solid ${colors.beam}`,
      }} />
      {/* Bottom-left */}
      <div style={{
        position: 'absolute', bottom: bracketOffset, left: bracketOffset,
        width: bracketSize, height: bracketSize,
        borderBottom: `2px solid ${colors.beam}`, borderLeft: `2px solid ${colors.beam}`,
      }} />
      {/* Bottom-right */}
      <div style={{
        position: 'absolute', bottom: bracketOffset, right: bracketOffset,
        width: bracketSize, height: bracketSize,
        borderBottom: `2px solid ${colors.beam}`, borderRight: `2px solid ${colors.beam}`,
      }} />

      {/* Scan beam sweeping top-to-bottom */}
      {isScanning && (
        <div
          style={{
            position: 'absolute',
            width: innerSize * 0.85,
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${colors.beam}, transparent)`,
            boxShadow: `0 0 8px ${colors.beam}, 0 0 20px ${colors.beam}40`,
            animation: 'scanBeam 2s ease-in-out infinite',
            left: '50%',
            transform: 'translateX(-50%)',
            top: '10%',
          }}
        />
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};
