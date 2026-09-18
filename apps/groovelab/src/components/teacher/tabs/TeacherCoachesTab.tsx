import React from 'react';
import { GraduationCap } from 'lucide-react';
import { AvatarImage } from '../../common/AvatarImage';

export interface TeacherCoachesTabProps {
  coaches: any[];
  activePlatform: 'campus' | 'groovelab';
}

export const TeacherCoachesTab: React.FC<TeacherCoachesTabProps> = ({
  coaches,
  activePlatform
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GraduationCap size={24} color="#0f172a" />
          <span>Lehrerverwaltung</span>
        </h2>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
          Übersicht über alle aktiven Lehrkräfte und Coaches an deiner Musikschule.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {coaches.map(c => {
          const coach = c.users || c;
          return (
            <div 
              key={coach.id} 
              className="google-card"
              style={{ 
                padding: '24px', 
                borderRadius: '24px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                border: '1px solid #e2e8f0',
                background: 'white'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                  <AvatarImage src={coach.photo_url} user={{ ...coach, isTeacherContext: true, isTeacher: true }} activePlatform={activePlatform} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {coach.first_name} {coach.last_name || ''}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                    {coach.role === 'admin' ? 'Administrator' : coach.role === 'secretary' ? 'Sekretariat' : 'Lehrer'}
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Instrument:</span>
                  <span style={{ fontWeight: 800 }}>{coach.instrument || 'Allgemein'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>E-Mail:</span>
                  <span style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px', color: coach.email ? '#1e293b' : '#94a3b8' }}>
                    {coach.email || 'Nicht hinterlegt'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
