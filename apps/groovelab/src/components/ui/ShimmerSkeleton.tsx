import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const ShimmerSkeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  className = '',
  style = {}
}) => {
  return (
    <div
      className={`shimmer-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmerAnimation 1.5s infinite linear',
        ...style
      }}
    />
  );
};

export const CardSkeleton: React.FC<{ height?: number }> = ({ height = 120 }) => {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: `${height}px`,
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShimmerSkeleton width={40} height={40} borderRadius={12} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <ShimmerSkeleton width="60%" height={14} />
          <ShimmerSkeleton width="40%" height={10} />
        </div>
      </div>
      <ShimmerSkeleton width="100%" height={12} style={{ marginTop: 'auto' }} />
    </div>
  );
};

export const HeroCardSkeleton: React.FC = () => {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ShimmerSkeleton width="45%" height={24} borderRadius={6} />
        <ShimmerSkeleton width="20%" height={28} borderRadius={100} />
      </div>
      <ShimmerSkeleton width="100%" height={16} />
      <ShimmerSkeleton width="85%" height={16} />
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
        <ShimmerSkeleton width="30%" height={36} borderRadius={10} />
        <ShimmerSkeleton width="30%" height={36} borderRadius={10} />
      </div>
    </div>
  );
};
