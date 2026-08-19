import React, { useState } from 'react';
import { Bell, Calendar, BookOpen, Flame, Check, X, ShieldCheck } from 'lucide-react';
import { subscribeUserToPush } from '../../utils/webPush';
import { supabase } from '../../lib/supabase';

interface PushNotificationSoftPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
  initialScheduleChanges?: boolean;
  initialHomework?: boolean;
  initialStreakAndNews?: boolean;
}

export const PushNotificationSoftPromptModal: React.FC<PushNotificationSoftPromptModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSuccess,
  initialScheduleChanges = true,
  initialHomework = true,
  initialStreakAndNews = true
}) => {
  const [scheduleChanges, setScheduleChanges] = useState(initialScheduleChanges);
  const [homework, setHomework] = useState(initialHomework);
  const [streakAndNews, setStreakAndNews] = useState(initialStreakAndNews);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleActivateSelected = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Request native browser / OS push permission
      const success = await subscribeUserToPush(userId);
      if (!success) {
        setErrorMsg('Mitteilungen konnten nicht aktiviert werden. Bitte prüfe deine Browser-Berechtigungen.');
        setLoading(false);
        return;
      }

      // 2. Persist granular preferences in Supabase database
      const { error: dbError } = await supabase
        .from('users')
        .update({
          push_notifications_enabled: true,
          push_notif_schedule_changes: scheduleChanges,
          push_notif_homework: homework,
          push_notif_all_features: streakAndNews
        })
        .eq('id', userId);

      if (dbError) {
        console.warn('Failed to update granular preferences in DB:', dbError);
      }

      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error during soft-prompt subscription:', err);
      setErrorMsg(err.message || 'Ein unerwarteter Fehler ist aufgetreten.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxSizing: 'border-box',
          position: 'relative',
          animation: 'appleAlertScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          type="button"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          <X size={16} />
        </button>

        {/* Header Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)',
              color: '#34a853',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)',
              flexShrink: 0
            }}
          >
            <Bell size={22} color="#34a853" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Mitteilungen anpassen
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              Wähle deine persönlichen Benachrichtigungen
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.4, margin: '0 0 16px 0', fontWeight: 500 }}>
          Du entscheidest selbst, worüber du in Echtzeit informiert werden möchtest. Keine Werbung, nur wichtige Infos für deinen Unterricht.
        </p>

        {/* Granular Preferences List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {/* 1. Schedule Changes */}
          <div
            onClick={() => setScheduleChanges(!scheduleChanges)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '16px',
              background: scheduleChanges ? '#f0fdf4' : '#f8fafc',
              border: scheduleChanges ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: scheduleChanges ? '#dcfce7' : '#f1f5f9',
                  color: scheduleChanges ? '#16a34a' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Calendar size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  Termin- & Raumänderungen
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                  Ausfälle, Raumwechsel & Vertretungen
                </div>
              </div>
            </div>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                background: scheduleChanges ? '#34a853' : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                transition: 'background 0.15s'
              }}
            >
              {scheduleChanges && <Check size={14} strokeWidth={3} />}
            </div>
          </div>

          {/* 2. Homework & Notes */}
          <div
            onClick={() => setHomework(!homework)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '16px',
              background: homework ? '#f0fdf4' : '#f8fafc',
              border: homework ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: homework ? '#dcfce7' : '#f1f5f9',
                  color: homework ? '#16a34a' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <BookOpen size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  Hausaufgaben & Audio-Notizen
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                  Neue Aufgaben & Play-Alongs deiner Lehrkraft
                </div>
              </div>
            </div>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                background: homework ? '#34a853' : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                transition: 'background 0.15s'
              }}
            >
              {homework && <Check size={14} strokeWidth={3} />}
            </div>
          </div>

          {/* 3. Streak Protection & School News */}
          <div
            onClick={() => setStreakAndNews(!streakAndNews)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '16px',
              background: streakAndNews ? '#f0fdf4' : '#f8fafc',
              border: streakAndNews ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: streakAndNews ? '#dcfce7' : '#f1f5f9',
                  color: streakAndNews ? '#16a34a' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Flame size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  Streakschutz & Schul-News
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                  Dezente Erinnerung zur Rettung deiner Tagesserie
                </div>
              </div>
            </div>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                background: streakAndNews ? '#34a853' : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                transition: 'background 0.15s'
              }}
            >
              {streakAndNews && <Check size={14} strokeWidth={3} />}
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', color: '#64748b', fontSize: '0.74rem', fontWeight: 600 }}>
          <ShieldCheck size={16} color="#34a853" />
          <span>100% werbefrei & jederzeit mit einem Klick anpassbar.</span>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#ef4444', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '14px' }}>
            {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            disabled={loading || (!scheduleChanges && !homework && !streakAndNews)}
            onClick={handleActivateSelected}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '14px',
              background: '#34a853',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: loading || (!scheduleChanges && !homework && !streakAndNews) ? 'not-allowed' : 'pointer',
              opacity: loading || (!scheduleChanges && !homework && !streakAndNews) ? 0.6 : 1,
              boxShadow: '0 4px 14px rgba(52, 168, 83, 0.3)',
              transition: 'transform 0.1s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? 'Wird aktiviert...' : 'Ausgewählte Mitteilungen aktivieren'}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '14px',
              background: 'transparent',
              color: '#64748b',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Später erinnern
          </button>
        </div>
      </div>
    </div>
  );
};
