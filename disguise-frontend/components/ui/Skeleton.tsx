'use client';

export const Skeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
}> = ({ width = '100%', height = 20, className = '', rounded = false }) => (
  <div
    className={className}
    style={{
      width,
      height,
      background: 'linear-gradient(90deg, rgba(17,34,54,0.8) 25%, rgba(26,51,80,0.8) 50%, rgba(17,34,54,0.8) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
      borderRadius: rounded ? '50%' : '8px',
    }}
  />
);

export const CardSkeleton: React.FC = () => (
  <div
    style={{
      background: 'rgba(17, 34, 54, 0.60)',
      border: '1px solid rgba(0, 229, 255, 0.15)',
      borderRadius: '20px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}
  >
    <Skeleton height={24} width="60%" />
    <Skeleton height={48} />
    <Skeleton height={16} width="80%" />
    <Skeleton height={16} width="40%" />
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <div style={{ display: 'flex', gap: '16px', padding: '16px', alignItems: 'center' }}>
    <Skeleton width={40} height={40} rounded />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Skeleton height={14} width="60%" />
      <Skeleton height={12} width="40%" />
    </div>
    <Skeleton height={24} width={80} />
    <Skeleton height={24} width={60} />
  </div>
);
