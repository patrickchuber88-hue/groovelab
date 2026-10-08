import React from 'react';

export interface AdminStudentsSkeletonProps {
  brandColor?: string;
}

export const AdminStudentsSkeleton: React.FC<AdminStudentsSkeletonProps> = ({
  brandColor = '#34a853'
}) => {
  return (
    <div 
      role="status" 
      aria-busy="true" 
      aria-label="Schülerdaten werden geladen..."
      style={{ marginTop: '0px' }}
    >
      <div 
        className="glass-panel" 
        style={{ 
          background: 'white', 
          borderRadius: '20px', 
          border: '1px solid rgba(0, 0, 0, 0.05)', 
          padding: '16px 20px', 
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px' 
        }}
      >
        {/* Header Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f1f5f9', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '180px', height: '24px', borderRadius: '8px', background: '#f1f5f9', animation: 'pulse 1.5s infinite ease-in-out' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ width: '130px', height: '38px', borderRadius: '12px', background: '#f1f5f9', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '150px', height: '38px', borderRadius: '12px', background: '#f1f5f9', animation: 'pulse 1.5s infinite ease-in-out' }} />
          </div>
        </div>

        {/* Search Bar Skeleton */}
        <div style={{ width: '100%', height: '44px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', animation: 'pulse 1.5s infinite ease-in-out' }} />

        {/* Student Cards Grid Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px', width: '100%' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i}
              style={{
                padding: '16px 20px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                borderLeft: `3px solid ${brandColor}40`,
                boxShadow: '0 2px 8px -1px rgba(0, 0, 0, 0.04)',
                minHeight: '88px',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', flexShrink: 0, animation: 'pulse 1.5s infinite ease-in-out' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ width: '60%', height: '16px', borderRadius: '6px', background: '#f1f5f9', animation: 'pulse 1.5s infinite ease-in-out' }} />
                  <div style={{ width: '40%', height: '12px', borderRadius: '4px', background: '#f8fafc', animation: 'pulse 1.5s infinite ease-in-out' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', animation: 'pulse 1.5s infinite ease-in-out' }} />
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', animation: 'pulse 1.5s infinite ease-in-out' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
