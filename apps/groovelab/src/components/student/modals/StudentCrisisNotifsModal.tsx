import React, { useEffect } from "react";
import { CalendarX, CheckCircle2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { formatTeacherFullName } from "../../../utils/nameHelper";

export interface StudentCrisisNotifsModalProps {
  unreadCrisisNotifs: any[];
  onDismiss: () => void;
}

export const StudentCrisisNotifsModal: React.FC<StudentCrisisNotifsModalProps> = ({
  unreadCrisisNotifs,
  onDismiss,
}) => {
  if (!unreadCrisisNotifs || unreadCrisisNotifs.length === 0) return null;

  const isReinstated = unreadCrisisNotifs.some(n => n.is_reinstated);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unreadCrisisNotifs]);

  const handleConfirm = () => {
    // ⚡ Instant Optimistic Close: Sofort schließen ohne Latenz
    onDismiss();

    // Revisionssichere Quittierung im Hintergrund
    try {
      const ids = unreadCrisisNotifs.map(n => n.id).filter(Boolean);
      if (ids.length > 0) {
        supabase
          .from('crisis_notifications')
          .update({ status: 'READ' })
          .in('id', ids)
          .then(({ error }) => {
            if (error) console.error('Error confirming notifications in background:', error);
          });
      }
    } catch (err) {
      console.error('Error confirming notifications:', err);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label={isReinstated ? "Unterricht findet statt" : "Unterrichtsausfall"}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
        zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div style={{
        background: 'white', padding: '32px', borderRadius: '28px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.2)', width: '100%', maxWidth: '480px',
        border: isReinstated ? '2px solid #e6f4ea' : '2px solid #fee2e2',
        display: 'flex', flexDirection: 'column', gap: '20px',
        boxSizing: 'border-box', textAlign: 'center'
      }}>
        {/* Apple Squircle Icon Badge - Kein Fieber-Icon */}
        <div style={{
          background: isReinstated 
            ? 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white', width: '60px', height: '60px', borderRadius: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto',
          boxShadow: isReinstated 
            ? '0 8px 20px rgba(52, 168, 83, 0.3)'
            : '0 8px 20px rgba(239, 68, 68, 0.3)'
        }}>
          {isReinstated ? (
            <CheckCircle2 size={30} color="#ffffff" strokeWidth={2.5} />
          ) : (
            <CalendarX size={30} color="#ffffff" strokeWidth={2.5} />
          )}
        </div>
        
        <div>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.25rem', 
            fontWeight: 900, 
            color: isReinstated ? '#34a853' : '#9f1239', 
            fontFamily: '"Outfit", "Inter", sans-serif' 
          }}>
            {isReinstated ? 'Gute Neuigkeiten: Unterricht findet statt!' : 'Wichtige Mitteilung: Unterrichtsausfall'}
          </h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600, lineHeight: 1.4 }}>
            {isReinstated 
              ? 'Deine Lehrkraft steht wieder zur Verfügung. Dein Unterricht findet wie gewohnt statt:'
              : 'Deine Lehrkraft ist verhindert. Daher müssen die folgenden Termine leider entfallen:'}
          </p>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: '10px',
          maxHeight: '180px', overflowY: 'auto', padding: '4px'
        }}>
          {unreadCrisisNotifs.map((n, idx) => {
            const dt = new Date(n.slot_start_datetime);
            const dateStr = dt.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const teacherName = n.teacher ? formatTeacherFullName(n.teacher) : 'Deine Lehrkraft';

            return (
              <div key={n.id || idx} style={{
                background: isReinstated ? '#e6f4ea' : '#fff5f5', 
                border: isReinstated ? '1.5px solid #e6f4ea' : '1.5px solid #fecaca',
                borderRadius: '16px', padding: '12px 16px', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                <div style={{ 
                  fontSize: '0.82rem', 
                  fontWeight: 800, 
                  color: isReinstated ? '#34a853' : '#991b1b' 
                }}>
                  {isReinstated ? `☀️ Findet statt: ${dateStr}` : `🚫 Ausfall: ${dateStr}`}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: isReinstated ? '#34a853' : '#7f1d1d', 
                  fontWeight: 600, 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'center' 
                }}>
                  <span>🕒 {timeStr} Uhr</span>
                  <span>•</span>
                  <span>Lehrer: {teacherName}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleConfirm}
          style={{
            background: isReinstated
              ? 'linear-gradient(135deg, #34a853 0%, #34a853 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white', border: 'none', borderRadius: '16px',
            padding: '16px', fontWeight: 900, fontSize: '0.88rem',
            cursor: 'pointer', fontFamily: '"Outfit", "Inter", sans-serif',
            boxShadow: isReinstated
              ? '0 6px 20px rgba(52, 168, 83, 0.25)'
              : '0 6px 20px rgba(239, 68, 68, 0.25)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          className="hover-scale"
        >
          {isReinstated ? 'Super, ich bin dabei! 👍' : 'Ich habe den Ausfall zur Kenntnis genommen'}
        </button>
      </div>
    </div>
  );
};
