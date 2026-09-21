import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export interface StudentConsentProtocolProps {
  student: any;
  consentLogs?: any[];
  mode?: 'admin' | 'teacher';
}

export const StudentConsentProtocol: React.FC<StudentConsentProtocolProps> = ({
  student,
  consentLogs = [],
  mode = 'admin'
}) => {
  const hasConsent = Boolean(student?.parental_consent_given_at);

  if (mode === 'teacher') {
    return (
      <section
        style={{
          background: hasConsent ? '#f0fdf4' : '#f8fafc',
          border: hasConsent ? '1.5px solid #bbf7d0' : '1.5px solid #e2e8f0',
          borderRadius: '18px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            background: hasConsent ? '#dcfce7' : '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <ShieldCheck size={20} color={hasConsent ? '#16a34a' : '#64748b'} />
        </div>
        <div>
          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: hasConsent ? '#15803d' : '#334155' }}>
            {hasConsent
              ? 'Eltern-Einwilligung (DSGVO Art. 8) verifiziert'
              : 'Schulvertragliche Basis-Erfassung aktiv'}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
            {hasConsent
              ? `Rechtssicher bestätigt am ${new Date(student.parental_consent_given_at).toLocaleDateString('de-DE')}`
              : 'Wird beim ersten elterlichen Login digital bestätigt.'}
          </div>
        </div>
      </section>
    );
  }

  // Full Administrative Mode (Audit Log & Rights Checklist)
  return (
    <section
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '24px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
      }}
    >
      <h4
        style={{
          fontSize: '0.95rem',
          fontWeight: 900,
          color: '#1e293b',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <ShieldCheck size={18} style={{ color: '#34a853' }} /> 📜 Revisionssicheres Einwilligungsprotokoll (DSGVO Art. 8)
      </h4>

      {hasConsent ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '14px 16px',
              borderRadius: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                Eltern-Einwilligung Erteilt &amp; Verifiziert
              </div>
              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '4px', fontWeight: 600 }}>
                Erfasst am {new Date(student.parental_consent_given_at).toLocaleString('de-DE')} • Version {student.consent_version || 'v1.0'}
              </div>
            </div>
            <span
              style={{
                background: '#ffffff',
                color: '#15803d',
                border: '1px solid #86efac',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 800
              }}
            >
              {student.campus_usage_mode === 'eltern_geführt' ? '🔒 Eltern-geführt (PIN-Schutz)' : '👤 Selbstnutzer'}
            </span>
          </div>

          {/* Granular DSGVO Art. 8 Parent Rights Matrix (Campus Modul) */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>
              🔒 Elterliche Rechte-Konfiguration (DSGVO Art. 8 - Campus-Modul):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', padding: '4px 8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ color: '#22c55e', fontWeight: 800 }}>✓</span>
                <span>Direktnachrichten &amp; Lehrer-Chat <strong>(Inklusive)</strong></span>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', padding: '4px 8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ color: '#22c55e', fontWeight: 800 }}>✓</span>
                <span>Digitales Hausaufgabenheft <strong>(Inklusive)</strong></span>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: student.parent_allow_leaderboard !== false ? '#22c55e' : '#ef4444', fontWeight: 800 }}>
                  {student.parent_allow_leaderboard !== false ? '✓' : '✕'}
                </span>
                <span>Klassen-Highlights &amp; Team-Power</span>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: (student.parent_allow_audio === true && (student as any)?.parent_permissions?.allow_student_audio === true) ? '#22c55e' : '#ef4444', fontWeight: 800 }}>
                  {(student.parent_allow_audio === true && (student as any)?.parent_permissions?.allow_student_audio === true) ? '✓' : '✕'}
                </span>
                <span>Eigene Aufnahmen Schüler (Didaktik-Freigabe)</span>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: ((student as any)?.parent_permissions?.allow_teacher_audio === true) ? '#22c55e' : '#ef4444', fontWeight: 800 }}>
                  {((student as any)?.parent_permissions?.allow_teacher_audio === true) ? '✓' : '✕'}
                </span>
                <span>Lehrer-Aufnahmen Schüler (Vertraulichkeit)</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{ 
            background: '#f8fafc', 
            border: '1.5px solid #e2e8f0', 
            padding: '14px 16px', 
            borderRadius: '16px', 
            color: '#475569', 
            fontSize: '0.74rem', 
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <ShieldCheck size={18} color="#34a853" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#0f172a' }}>Schulvertragliche Basis-Erfassung aktiv:</strong> Die digitale Eltern-Einwilligung über die App wird beim ersten Login des Schülers/Elternteils automatisch verifiziert und revisionssicher protokolliert.
          </div>
        </div>
      )}
    </section>
  );
};
