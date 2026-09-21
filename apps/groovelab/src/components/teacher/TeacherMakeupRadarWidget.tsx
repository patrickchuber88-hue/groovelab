import React from 'react';
import { Ticket, Calendar, Clock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { maskLastName } from '../../utils/nameHelper';

export interface ActiveMakeupTokenItem {
  token_id: string;
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  student_instrument: string;
  original_occurrence_id: string;
  original_date: string;
  total_minutes: number;
  remaining_minutes: number;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface TeacherMakeupRadarWidgetProps {
  tokens: ActiveMakeupTokenItem[];
  showRealNames?: boolean;
  onOpenRedeemModal: (token: ActiveMakeupTokenItem) => void;
  onOpenCancelModal: (token: ActiveMakeupTokenItem) => void;
}

export const TeacherMakeupRadarWidget: React.FC<TeacherMakeupRadarWidgetProps> = ({
  tokens = [],
  showRealNames = false,
  onOpenRedeemModal,
  onOpenCancelModal
}) => {
  // Dynamische Sichtbarkeit: Wenn keine offenen Kontingente vorhanden sind, rendert das Widget nicht
  if (!tokens || tokens.length === 0) {
    return null;
  }

  const totalOpenMinutes = tokens.reduce((acc, t) => acc + (t.remaining_minutes || 0), 0);

  return (
    <div
      id="tour-teacher-makeup-radar"
      className="google-card animation-slide-up"
      style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        padding: '22px 24px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: '#e8f0fe',
            color: '#0b57d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Ticket size={20} />
          </div>
          <div>
            <h3 style={{
              fontSize: '1.05rem',
              fontWeight: 900,
              color: '#0f172a',
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Nachhol-Radar
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              Revisionssichere Unterrichtskompensation
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 850,
            padding: '4px 12px',
            borderRadius: '100px',
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            fontFamily: 'Inter'
          }}>
            {tokens.length} {tokens.length === 1 ? 'Kontingent' : 'Kontingente'} • {totalOpenMinutes} Min. offen
          </span>
        </div>
      </div>

      {/* Token Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tokens.map((token) => {
          const studentDisplayName = `${token.student_first_name} ${maskLastName(token.student_last_name, showRealNames)}`.trim();
          const origDateFormatted = token.original_date 
            ? new Date(token.original_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '–';
          const expiresFormatted = token.expires_at 
            ? new Date(token.expires_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '–';

          return (
            <div
              key={token.token_id}
              style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap',
                transition: 'all 0.2s'
              }}
              className="hover-scale-mini"
            >
              {/* Left info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  flexShrink: 0
                }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>
                      {studentDisplayName}
                    </span>
                    <span style={{
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      background: '#ffffff',
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      {token.student_instrument || 'Instrument'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#64748b', marginTop: '3px' }}>
                    <span>Ausfall vom {origDateFormatted}</span>
                    <span>•</span>
                    <span>Gültig bis {expiresFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Right: Balance & Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 950, color: '#0f172a', fontFamily: 'monospace' }}>
                    {token.remaining_minutes} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>/ {token.total_minutes} Min.</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#3b82f6' }}>
                    {token.status === 'PARTIALLY_REDEEMED' ? 'Teileingelöst' : 'Offenes Guthaben'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => onOpenRedeemModal(token)}
                    title="Nachholtermin festlegen oder Folgestunde verlängern"
                    style={{
                      background: '#0b57d0',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '8px 14px',
                      fontSize: '0.80rem',
                      fontWeight: 850,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(11, 87, 208, 0.2)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>Einlösen</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenCancelModal(token)}
                    title="Kontingent einvernehmlich stornieren"
                    style={{
                      background: '#ffffff',
                      color: '#64748b',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
