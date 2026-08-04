'use client';

type BadgeVariant = 'critical' | 'high' | 'medium' | 'low' | 'online' | 'offline' | 'info' | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  critical: { bg: 'rgba(255, 61, 61, 0.15)', color: '#FF3D3D', border: 'rgba(255, 61, 61, 0.4)' },
  high: { bg: 'rgba(255, 107, 53, 0.15)', color: '#FF6B35', border: 'rgba(255, 107, 53, 0.4)' },
  medium: { bg: 'rgba(255, 214, 0, 0.15)', color: '#FFD600', border: 'rgba(255, 214, 0, 0.4)' },
  low: { bg: 'rgba(0, 230, 118, 0.15)', color: '#00E676', border: 'rgba(0, 230, 118, 0.4)' },
  online: { bg: 'rgba(0, 230, 118, 0.15)', color: '#00E676', border: 'rgba(0, 230, 118, 0.4)' },
  offline: { bg: 'rgba(255, 61, 61, 0.15)', color: '#FF3D3D', border: 'rgba(255, 61, 61, 0.4)' },
  info: { bg: 'rgba(0, 151, 178, 0.15)', color: '#0097B2', border: 'rgba(0, 151, 178, 0.4)' },
  default: { bg: 'rgba(139, 175, 196, 0.1)', color: '#8BAFC4', border: 'rgba(139, 175, 196, 0.3)' },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  pulse = false,
  className = '',
}) => {
  const s = variantStyles[variant];
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        animation: pulse ? 'pulseGlow 2s ease-in-out infinite' : undefined,
        fontFamily: 'Inter, sans-serif',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
};

export const DangerBadge: React.FC<{ level: 'critical' | 'high' | 'medium' | 'low' }> = ({ level }) => {
  const labels: Record<string, string> = {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
  };
  return (
    <Badge variant={level} pulse={level === 'critical'}>
      {labels[level]}
    </Badge>
  );
};
