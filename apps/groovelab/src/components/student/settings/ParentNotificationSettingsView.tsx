import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Bell, BellOff, Lock, Lightbulb, Calendar, Pencil, Mail, Zap, Trophy,
  RotateCcw, Info, Check, AlertCircle
} from 'lucide-react';
import { CampusGroovelabText } from '../../CampusGroovelabBrand';
import { subscribeUserToPush } from '../../../utils/webPush';

export interface ParentNotificationSettingsViewProps {
  studentId: string;
  studentUser?: any;
  isPremiumUser: boolean;
  pushEnabled: boolean;
  setPushEnabled: (val: boolean) => void;
  setShowPushSoftPrompt?: (val: boolean) => void;
  isIOS: boolean;
  isStandalone: boolean;
  pushNotifScheduleChanges: boolean;
  setPushNotifScheduleChanges: (val: boolean) => void;
  pushNotifHomework: boolean;
  setPushNotifHomework: (val: boolean) => void;
  pushNotifChat: boolean;
  setPushNotifChat: (val: boolean) => void;
  pushNotifPracticeReminder: boolean;
  setPushNotifPracticeReminder: (val: boolean) => void;
  pushNotifWeeklyDigest: boolean;
  setPushNotifWeeklyDigest: (val: boolean) => void;
  unsubscribeUserFromPush: (studentId: string) => Promise<boolean>;
}

export const ParentNotificationSettingsView: React.FC<ParentNotificationSettingsViewProps> = ({
  studentId,
  studentUser,
  isPremiumUser,
  pushEnabled,
  setPushEnabled,
  setShowPushSoftPrompt,
  isIOS,
  isStandalone,
  pushNotifScheduleChanges,
  setPushNotifScheduleChanges,
  pushNotifHomework,
  setPushNotifHomework,
  pushNotifChat,
  setPushNotifChat,
  pushNotifPracticeReminder,
  setPushNotifPracticeReminder,
  pushNotifWeeklyDigest,
  setPushNotifWeeklyDigest,
  unsubscribeUserFromPush,
}) => {
  // Autoritativer Status: Jeder angemeldete Schüler im Schülerbereich ist aktiv, außer sein Status ist explizit 'ausstehend'
  const effectiveIsActive = isPremiumUser || Boolean(
    studentUser
      ? (studentUser.status !== 'ausstehend' && studentUser.is_active !== false && studentUser.is_campus_active !== false)
      : true
  );

  const [localPushEnabled, setLocalPushEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted' || pushEnabled;
    }
    return pushEnabled;
  });

  useEffect(() => {
    if (pushEnabled !== localPushEnabled) {
      setLocalPushEnabled(pushEnabled);
    }
  }, [pushEnabled]);

  // Lokale reaktive Zustände für die 5 granularen Benachrichtigungskanäle
  const [changesVal, setChangesVal] = useState<boolean>(() => studentUser?.push_notif_schedule_changes ?? pushNotifScheduleChanges ?? true);
  const [homeworkVal, setHomeworkVal] = useState<boolean>(() => studentUser?.push_notif_homework ?? pushNotifHomework ?? true);
  const [chatVal, setChatVal] = useState<boolean>(() => studentUser?.push_notif_chat ?? pushNotifChat ?? true);
  const [practiceVal, setPracticeVal] = useState<boolean>(() => studentUser?.push_notif_practice_reminder ?? pushNotifPracticeReminder ?? true);
  const [digestVal, setDigestVal] = useState<boolean>(() => studentUser?.push_notif_weekly_digest ?? pushNotifWeeklyDigest ?? true);

  const [showConfirmResetCache, setShowConfirmResetCache] = useState(false);
  const [isResettingCache, setIsResettingCache] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleToggleMasterPush = async () => {
    setActionError(null);
    if (!localPushEnabled) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'denied') {
          setActionError('Push-Benachrichtigungen sind in deinen Browser-Einstellungen blockiert. Bitte erlaube Mitteilungen in den Browser-Einstellungen für diese Seite.');
          return;
        }
        if (Notification.permission === 'default') {
          try {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
              setActionError('Benachrichtigungen wurden im Browser nicht freigegeben.');
              return;
            }
          } catch (e) {
            console.warn('Could not request notification permission:', e);
          }
        }
      }

      try {
        await subscribeUserToPush(studentId);
        await supabase
          .from('users')
          .update({
            push_notifications_enabled: true,
            push_notif_schedule_changes: changesVal,
            push_notif_homework: homeworkVal,
            push_notif_chat: chatVal,
            push_notif_practice_reminder: practiceVal,
            push_notif_weekly_digest: digestVal
          })
          .eq('id', studentId);
      } catch (err) {
        console.warn('Push activation error:', err);
      }
      setLocalPushEnabled(true);
      setPushEnabled(true);
    } else {
      try {
        const success = await unsubscribeUserFromPush(studentId);
        if (!success) {
          setActionError('Die Push-Benachrichtigungen konnten nicht deaktiviert werden. Bitte prüfe deine Netzwerkverbindung.');
        } else {
          await supabase
            .from('users')
            .update({ push_notifications_enabled: false })
            .eq('id', studentId);
          setLocalPushEnabled(false);
          setPushEnabled(false);
        }
      } catch (err) {
        setActionError('Fehler beim Deaktivieren des Push-Dienstes.');
      }
    }
  };

  const handleClearCache = async () => {
    setIsResettingCache(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
    } catch (e) {
      console.warn('Could not clear PWA cache:', e);
    }
    localStorage.removeItem('groovelab_active_practice_session');
    localStorage.removeItem('student_lehrwerke_progress');
    localStorage.removeItem('groovelab_offline_user_cache');
    localStorage.removeItem('groovelab_cached_schools');
    localStorage.removeItem('groovelab_cached_user');
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Fehlermeldungs-Banner ohne blockierende Browser-Popups */}
      {actionError && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1.5px solid #fecaca',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#b91c1c',
            fontSize: '0.80rem',
            fontWeight: 700
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flex: 1 }}>{actionError}</div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b91c1c',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.80rem'
            }}
          >
            Ausblenden
          </button>
        </div>
      )}

      {/* Hauptbereich: Push-Benachrichtigungen Master */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s',
            opacity: effectiveIsActive ? 1 : 0.75
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: localPushEnabled ? '#34a85315' : '#f1f5f9',
                color: localPushEnabled ? '#15803d' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
            >
              {localPushEnabled ? <Bell size={20} aria-hidden="true" /> : <BellOff size={20} aria-hidden="true" />}
            </div>
            <div>
              <h4
                style={{
                  margin: '0 0 3px 0',
                  fontSize: '0.92rem',
                  fontWeight: 850,
                  color: '#0f172a',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                Push-Benachrichtigungen
              </h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 600, lineHeight: 1.35 }}>
                Echtzeit-Mitteilungen für Stundenplan, Hausaufgaben und Alerts auf dein Gerät.
              </p>
            </div>
          </div>

          {effectiveIsActive ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                role="switch"
                aria-checked={localPushEnabled}
                aria-label="Push-Benachrichtigungen aktivieren oder deaktivieren"
                onClick={handleToggleMasterPush}
                className={`app-binary-switch ${localPushEnabled ? 'active' : ''}`}
                style={{ backgroundColor: localPushEnabled ? '#34a853' : undefined, minHeight: '32px' }}
              >
                <div className="app-binary-switch-knob" />
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                padding: '7px 14px',
                borderRadius: '100px',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.01em'
              }}
            >
              <Lock size={12} strokeWidth={2.5} aria-hidden="true" />
              <span>Inaktiv</span>
            </div>
          )}
        </div>

        {/* Status-Card nur falls Account in der Schulverwaltung tatsächlich den Status 'ausstehend' hat */}
        {!effectiveIsActive && (
          <div
            style={{
              padding: '16px 18px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderLeft: '4px solid #3b82f6',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: 850, fontSize: '0.85rem' }}>
                <Info size={16} color="#2563eb" aria-hidden="true" />
                <span>Account-Freischaltung erforderlich</span>
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '3px 10px',
                  borderRadius: '100px',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe'
                }}
              >
                ⏳ Ausstehend
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#334155', fontWeight: 550, lineHeight: '1.45' }}>
              Echtzeit-Push-Mitteilungen für Stundenplanänderungen, neue Hausaufgaben und Feedback deiner Lehrkraft werden aktiv, sobald deine Musikschule deinen Schüler-Account in der Verwaltung freigeschaltet hat.
            </p>
          </div>
        )}

        {/* iOS Helper Alert */}
        {isIOS && !isStandalone && (
          <div
            style={{
              padding: '14px 18px',
              background: '#fffbeb',
              border: '1.5px solid #fef3c7',
              borderRadius: '16px',
              fontSize: '0.76rem',
              color: '#92400e',
              lineHeight: '1.45',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <Lightbulb size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} aria-hidden="true" />
            <div>
              <strong style={{ color: '#78350f' }}>iOS / iPhone Hinweis:</strong> Um Benachrichtigungen auf Apple-Geräten zu aktivieren, installiere die App bitte zuerst auf deinem Homescreen: Tippe im Safari-Menü auf <strong>Teilen (Box mit Pfeil nach oben)</strong> und wähle <strong>„Zum Home-Bildschirm“</strong>. Öffne <CampusGroovelabText campusColor="#16a34a" groovelabColor="#d97706" fontWeight={750} /> anschließend über das App-Icon auf deinem Homescreen.
            </div>
          </div>
        )}

        {/* Die 5 modularen granularen Push-Kanäle */}
        {localPushEnabled && effectiveIsActive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Spezifische Mitteilungskanäle
            </div>
            {[
              { k: 'changes', label: 'Termin- & Stundenplanänderungen', desc: 'Sofortige Alerts bei Raumwechseln, Vertretungen oder Ausfällen.', val: changesVal, setter: setChangesVal, parentSetter: setPushNotifScheduleChanges, dbKey: 'push_notif_schedule_changes', icon: <Calendar size={18} /> },
              { k: 'homework', label: 'Hausaufgaben & Feedback', desc: 'Benachrichtigung, sobald deine Lehrkraft neue Aufgaben notiert hat.', val: homeworkVal, setter: setHomeworkVal, parentSetter: setPushNotifHomework, dbKey: 'push_notif_homework', icon: <Pencil size={18} /> },
              { k: 'chat', label: 'Direktnachrichten & Chat', desc: 'Sofort-Mitteilung bei neuen Antworten von deiner Lehrkraft oder Musikschule.', val: chatVal, setter: setChatVal, parentSetter: setPushNotifChat, dbKey: 'push_notif_chat', icon: <Mail size={18} /> },
              { k: 'practice', label: 'Übe-Erinnerung & Streak-Schutz', desc: 'Sanfter Reminder am Nachmittag, um die tägliche Übe-Serie zu halten.', val: practiceVal, setter: setPracticeVal, parentSetter: setPushNotifPracticeReminder, dbKey: 'push_notif_practice_reminder', icon: <Zap size={18} /> },
              { k: 'digest', label: 'Wöchentlicher Übe-Rückblick', desc: 'Sonntags-Digest mit gesammelten Übe-Minuten und Meilensteinen.', val: digestVal, setter: setDigestVal, parentSetter: setPushNotifWeeklyDigest, dbKey: 'push_notif_weekly_digest', icon: <Trophy size={18} /> }
            ].map((row) => (
              <div
                key={row.k}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: '10px',
                      background: row.val ? '#34a85315' : '#f1f5f9',
                      color: row.val ? '#15803d' : '#94a3b8',
                      display: 'flex',
                      transition: 'all 0.2s'
                    }}
                  >
                    {row.icon}
                  </div>
                  <div>
                    <h5 style={{ margin: '0 0 2px 0', fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
                      {row.label}
                    </h5>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 550, lineHeight: 1.3 }}>
                      {row.desc}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.val}
                  aria-label={`${row.label} umschalten`}
                  onClick={async () => {
                    const nextVal = !row.val;
                    row.setter(nextVal);
                    if (row.parentSetter) row.parentSetter(nextVal);
                    try {
                      await supabase.from('users').update({ [row.dbKey]: nextVal }).eq('id', studentId);
                      if (studentUser) {
                        studentUser[row.dbKey] = nextVal;
                      }
                    } catch (err) {
                      console.warn('[NotificationSettings] Failed to save push preference:', err);
                    }
                  }}
                  className={`app-binary-switch ${row.val ? 'active' : ''}`}
                  style={{ backgroundColor: row.val ? '#34a853' : undefined }}
                >
                  <div className="app-binary-switch-knob" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Domänensauberer System-Diagnosebereich mit echter Klick-Affordanz */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '18px' }}>
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '18px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div>
            <h4
              style={{
                fontSize: '0.86rem',
                fontWeight: 850,
                color: '#334155',
                margin: '0 0 4px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RotateCcw size={15} color="#475569" aria-hidden="true" />
              <span>Lokaler App-Speicher &amp; Diagnose</span>
            </h4>
            <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0, fontWeight: 550, lineHeight: '1.4' }}>
              Bereinigt den Browser-Cache bei Ladeproblemen. Deine Zugangsdaten und Einstellungen bleiben vollständig erhalten.
            </p>
          </div>

          {!showConfirmResetCache ? (
            <div>
              <button
                type="button"
                onClick={() => setShowConfirmResetCache(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '9px 16px',
                  minHeight: '44px',
                  color: '#1e293b',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
              >
                <RotateCcw size={14} aria-hidden="true" />
                <span>Lokalen Cache leeren</span>
              </button>
            </div>
          ) : (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 750 }}>
                Möchtest du den Cache wirklich bereinigen? Die Seite wird anschließend automatisch neu geladen.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={isResettingCache}
                  onClick={handleClearCache}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    minHeight: '38px',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: isResettingCache ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={14} />
                  <span>{isResettingCache ? 'Wird bereinigt...' : 'Ja, Cache leeren'}</span>
                </button>
                <button
                  type="button"
                  disabled={isResettingCache}
                  onClick={() => setShowConfirmResetCache(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    minHeight: '38px',
                    fontWeight: 750,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
