'use client';

interface StatusDotProps {
  status: 'online' | 'offline' | 'maintenance';
  size?: number;
  showLabel?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 10, showLabel = false }) => {
  const colorMap = {
    online: '#00E676',
    offline: '#FF3D3D',
    maintenance: '#FFD600',
  };
  const labelMap = {
    online: 'Online',
    offline: 'Offline',
    maintenance: 'Maintenance',
  };
  const color = colorMap[status];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          boxShadow: status === 'online' ? `0 0 8px ${color}` : undefined,
          display: 'inline-block',
          animation: status === 'online' ? 'pulseGlow 2s ease-in-out infinite' : undefined,
          flexShrink: 0,
        }}
      />
      {showLabel && (
        <span style={{ color, fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
          {labelMap[status]}
        </span>
      )}
    </span>
  );
};
