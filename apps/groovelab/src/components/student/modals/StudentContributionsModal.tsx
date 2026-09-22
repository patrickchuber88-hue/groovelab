import React from "react";
import { X } from "lucide-react";

export interface StudentContributionsModalProps {
  data: {
    goalTitle: string;
    targetMinutes: number;
    contributions?: Array<{ name: string; minutes: number }>;
  } | null;
  loading: boolean;
  onClose: () => void;
}

export const StudentContributionsModal: React.FC<StudentContributionsModalProps> = ({
  data,
  loading,
  onClose,
}) => {
  if (!data) return null;

  const contributions = data.contributions || [];
  const totalContributed = contributions.reduce((sum, c) => sum + c.minutes, 0);

  const colorPalette = [
    '#6366f1', // Indigo
    '#34a853', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#34a853', // Teal
  ];

  let accumulatedPercent = 0;
  const gradientSectors = contributions.map((c, idx) => {
    const percent = (c.minutes / (totalContributed || 1)) * 100;
    const start = accumulatedPercent;
    accumulatedPercent += percent;
    const color = colorPalette[idx % colorPalette.length];
    return `${color} ${start}% ${accumulatedPercent}%`;
  });
  const conicGradient = totalContributed > 0 
    ? `conic-gradient(${gradientSectors.join(', ')})`
    : '#cbd5e1';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(16px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div role="dialog" aria-modal="true" style={{ background: 'white', padding: '32px', borderRadius: '28px', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.16)', width: '460px', maxWidth: '95vw', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🌱 Übe-Ziele der Klasse
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              {data.goalTitle}
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: '#f8fafc', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseOut={e => e.currentTarget.style.background = '#f8fafc'}
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #34a853', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Lade Schülerbeiträge...</span>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', alignItems: 'center' }}>
            {/* Pie / Donut Chart */}
            <div style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: conicGradient,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
            }}>
              {/* Donut hole */}
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gesamt</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 950, color: '#1e293b', letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>{totalContributed}<span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#64748b', marginLeft: '1px' }}>m</span></span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>von {data.targetMinutes}m</span>
              </div>
            </div>

            {/* Contributions List */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                Beiträge dieser Woche
              </div>
              {contributions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.82rem', padding: '20px 0', fontWeight: 650 }}>
                  🎵 Bisher hat noch kein Schüler geübt. Mach den ersten Schritt!
                </div>
              ) : (
                contributions.map((c, idx) => {
                  const percent = totalContributed > 0 ? Math.round((c.minutes / totalContributed) * 100) : 0;
                  const sliceColor = colorPalette[idx % colorPalette.length];
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sliceColor }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 750, color: '#1e293b' }}>{c.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', fontFeatureSettings: '"tnum"' }}>{c.minutes} Min</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', background: '#e2e8f0', padding: '2px 8px', borderRadius: '100px', fontFeatureSettings: '"tnum"' }}>{percent}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{ background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white', border: 'none', borderRadius: '14px', padding: '12px 20px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', marginTop: '28px', width: '100%', boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)', transition: 'all 0.2s' }}
          onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(52, 168, 83, 0.25)'}
          onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 168, 83, 0.15)'}
        >
          Schließen
        </button>

      </div>
    </div>
  );
};
