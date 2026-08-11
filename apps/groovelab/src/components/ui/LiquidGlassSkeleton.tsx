import React from 'react';

interface LiquidGlassSkeletonProps {
  type?: 'dashboard' | 'modal' | 'table';
  colorTheme?: 'campus' | 'groovelab' | 'admin';
}

export const LiquidGlassSkeleton: React.FC<LiquidGlassSkeletonProps> = ({
  type = 'dashboard',
  colorTheme = 'campus',
}) => {
  const getAccentColor = () => {
    if (colorTheme === 'groovelab') return 'rgba(234, 179, 8, 0.15)';
    if (colorTheme === 'admin') return 'rgba(234, 67, 53, 0.15)';
    return 'rgba(52, 168, 83, 0.15)';
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: type === 'modal' ? '400px' : '600px',
        padding: '24px',
        borderRadius: '28px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        boxShadow: '0 12px 36px 0 rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'pulse 1.5s infinite ease-in-out'
      }}
    >
      {/* Skeleton Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: getAccentColor(),
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div style={{ width: '40%', height: '20px', borderRadius: '8px', background: '#e2e8f0' }} />
          <div style={{ width: '25%', height: '14px', borderRadius: '6px', background: '#f1f5f9' }} />
        </div>
      </div>

      {/* Skeleton Body Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: type === 'modal' ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginTop: '12px'
        }}
      >
        <div style={{ height: '140px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #f1f5f9' }} />
        <div style={{ height: '140px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #f1f5f9' }} />
        {type !== 'modal' && (
          <div style={{ height: '140px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #f1f5f9' }} />
        )}
      </div>

      {/* Skeleton Footer Bar */}
      <div style={{ marginTop: 'auto', height: '48px', borderRadius: '16px', background: '#f1f5f9' }} />
    </div>
  );
};
