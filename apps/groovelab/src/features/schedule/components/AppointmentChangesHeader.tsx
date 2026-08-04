import React from 'react';
import { Calendar } from 'lucide-react';

export interface AppointmentChangesHeaderProps {
  title: string;
  changeCount: number;
  isTeacher: boolean;
  timeWindow: '7days' | 'all';
  onTimeWindowChange?: (window: '7days' | 'all') => void;
}

export const AppointmentChangesHeader: React.FC<AppointmentChangesHeaderProps> = ({
  title,
  changeCount,
  isTeacher,
  timeWindow,
  onTimeWindowChange,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Calendar size={16} color="#f59e0b" />
        <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </h3>
        <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.7rem', fontWeight: 800, padding: '2px 7px', borderRadius: '10px' }}>
          {changeCount}
        </span>
      </div>

      {isTeacher && onTimeWindowChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#f1f5f9', padding: '2px', borderRadius: '8px' }}>
          <button
            onClick={() => onTimeWindowChange('7days')}
            style={{
              border: 'none',
              background: timeWindow === '7days' ? '#ffffff' : 'transparent',
              color: timeWindow === '7days' ? '#0f172a' : '#64748b',
              fontWeight: timeWindow === '7days' ? 800 : 600,
              fontSize: '0.68rem',
              padding: '3px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: timeWindow === '7days' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            7 Tage
          </button>
          <button
            onClick={() => onTimeWindowChange('all')}
            style={{
              border: 'none',
              background: timeWindow === 'all' ? '#ffffff' : 'transparent',
              color: timeWindow === 'all' ? '#0f172a' : '#64748b',
              fontWeight: timeWindow === 'all' ? 800 : 600,
              fontSize: '0.68rem',
              padding: '3px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: timeWindow === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Alle
          </button>
        </div>
      )}
    </div>
  );
};
