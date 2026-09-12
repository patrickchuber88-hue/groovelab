import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  X, 
  Hash, 
  Bell, 
  Music, 
  Calendar, 
  Clock, 
  Layers, 
  ShieldAlert, 
  Sparkles,
  Check,
  MessageSquare,
  MessageCircle
} from 'lucide-react';

export interface CampusCreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onChannelCreated: (newChannel: any) => void;
}

const PRESET_TEMPLATES = [
  {
    name: 'noten-repertoire',
    label: 'Noten & Repertoire',
    description: 'Notensätze, Leadsheets und Übe-Material',
    icon: 'music',
    IconComponent: Music,
    isAnnouncementOnly: false
  },
  {
    name: 'auftritte-events',
    label: 'Auftritte & Events',
    description: 'Konzertvorbereitung, Soundcheck & Fahrgemeinschaften',
    icon: 'calendar',
    IconComponent: Calendar,
    isAnnouncementOnly: false
  },
  {
    name: 'proben-termine',
    label: 'Proben & Termine',
    description: 'Probenzeiten, Raumwechsel und Terminabsprachen',
    icon: 'clock',
    IconComponent: Clock,
    isAnnouncementOnly: false
  },
  {
    name: 'material-audio',
    label: 'Audio & Playalongs',
    description: 'Referenz-Aufnahmen, Playalongs & Metronom-Klicks',
    icon: 'layers',
    IconComponent: Layers,
    isAnnouncementOnly: false
  }
];

export const CampusCreateChannelModal: React.FC<CampusCreateChannelModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  onChannelCreated
}) => {
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [channelType, setChannelType] = useState<'threads' | 'chat'>('threads');
  const [allowStudentTopics, setAllowStudentTopics] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('hash');
  const [isAnnouncementOnly, setIsAnnouncementOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setChannelName('');
      setChannelDescription('');
      setChannelType('threads');
      setAllowStudentTopics(false);
      setSelectedIcon('hash');
      setIsAnnouncementOnly(false);
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Escape key handler for WCAG 2.2 AA
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const applyTemplate = (template: typeof PRESET_TEMPLATES[0]) => {
    setChannelName(template.name);
    setChannelDescription(template.description);
    setSelectedIcon(template.icon);
    setIsAnnouncementOnly(template.isAnnouncementOnly);
    setErrorMessage('');
  };

  const handleCreateChannel = async () => {
    const cleanName = channelName.toLowerCase().trim().replace(/\s+/g, '-');
    if (!cleanName) {
      setErrorMessage('Bitte gib einen Kanalnamen ein.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Primary: Atomic Server RPC (OWASP ASVS Level 3)
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_campus_chat_channel', {
        p_group_id: groupId,
        p_name: cleanName,
        p_description: channelDescription.trim() || null,
        p_icon: selectedIcon,
        p_is_announcement_only: isAnnouncementOnly,
        p_channel_type: channelType,
        p_allow_student_topics: allowStudentTopics
      });

      if (!rpcError && rpcData?.success) {
        onChannelCreated({
          id: rpcData.channel_id,
          group_id: groupId,
          name: rpcData.name || cleanName,
          description: channelDescription.trim() || null,
          icon: selectedIcon,
          is_announcement_only: rpcData.is_announcement_only,
          channel_type: rpcData.channel_type || channelType,
          allow_student_topics: rpcData.allow_student_topics || allowStudentTopics,
          is_default: false,
          created_at: new Date().toISOString()
        });
        onClose();
        return;
      }

      if (rpcError) {
        console.warn('[CampusCreateChannelModal] RPC failed, trying fallback insert:', rpcError.message);
      }

      // 2. Client-side fallback insert
      const { data: groupData } = await supabase
        .from('campus_chat_groups')
        .select('school_id')
        .eq('id', groupId)
        .maybeSingle();

      const schoolId = groupData?.school_id || (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_school_id') : null);
      if (!schoolId) {
        throw new Error('Musikschul-Zuordnung konnte nicht ermittelt werden.');
      }

      const { data: insertedChannel, error: insertError } = await supabase
        .from('campus_chat_channels')
        .insert({
          school_id: schoolId,
          group_id: groupId,
          name: cleanName,
          description: channelDescription.trim() || null,
          icon: selectedIcon,
          is_announcement_only: isAnnouncementOnly,
          channel_type: channelType,
          allow_student_topics: allowStudentTopics,
          is_default: false
        })
        .select()
        .single();

      if (insertError || !insertedChannel) {
        if (insertError?.code === '23505') {
          throw new Error(`Ein Kanal mit dem Namen „#${cleanName}“ existiert bereits in dieser Gruppe.`);
        }
        throw new Error(insertError?.message || 'Kanal konnte nicht gespeichert werden.');
      }

      onChannelCreated(insertedChannel);
      onClose();
    } catch (err: any) {
      console.error('[CampusCreateChannelModal] Error creating channel:', err);
      setErrorMessage(err.message || 'Fehler beim Erstellen des Kanals.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-channel-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#e6f4ea',
                color: '#166534',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '3px 8px',
                borderRadius: '100px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {groupName}
              </span>
              <h2 id="create-channel-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                Neuen Kanal erstellen
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
              Strukturiere Themen, Noten &amp; Absprachen übersichtlich in Kanälen
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'background 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(85vh - 140px)' }} className="custom-scrollbar">
          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '16px'
            }}>
              {errorMessage}
            </div>
          )}

          {/* Kanal-Format Auswahl (Themen-Kanal vs. Klassischer Chat) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.78rem', 
              fontWeight: 800, 
              color: '#64748b', 
              textTransform: 'uppercase', 
              letterSpacing: '0.04em',
              marginBottom: '10px'
            }}>
              Kanal-Format wählen
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {/* Option 1: Themen- & Beitrags-Kanal */}
              <button
                type="button"
                onClick={() => setChannelType('threads')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: channelType === 'threads' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: channelType === 'threads' ? '#f0fdf4' : '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: channelType === 'threads' ? '#dcfce7' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MessageSquare size={16} style={{ color: channelType === 'threads' ? '#16a34a' : '#64748b' }} />
                  </div>
                  {channelType === 'threads' && (
                    <span style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      padding: '2px 6px',
                      borderRadius: '100px'
                    }}>
                      EMPFOHLEN
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: channelType === 'threads' ? '#166534' : '#0f172a' }}>
                    Themen &amp; Beiträge
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px', lineHeight: 1.3 }}>
                    Themen mit Betreff, Antworten &amp; Emojis übersichtlich gebündelt
                  </div>
                </div>
              </button>

              {/* Option 2: Klassischer Chat */}
              <button
                type="button"
                onClick={() => setChannelType('chat')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: channelType === 'chat' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: channelType === 'chat' ? '#f0fdf4' : '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: channelType === 'chat' ? '#dcfce7' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MessageCircle size={16} style={{ color: channelType === 'chat' ? '#16a34a' : '#64748b' }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: channelType === 'chat' ? '#166534' : '#0f172a' }}>
                    Klassischer Chat
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px', lineHeight: 1.3 }}>
                    Fortlaufender Chatverlauf für schnelle spontane Absprachen
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Schüler-Berechtigung für Themen (nur bei Threads) */}
          {channelType === 'threads' && !isAnnouncementOnly && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setAllowStudentTopics(!allowStudentTopics)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setAllowStudentTopics(!allowStudentTopics);
                }
              }}
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                border: allowStudentTopics ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                background: allowStudentTopics ? '#f0fdf4' : '#fafbfc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                marginBottom: '20px',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  Schülern erlauben, neue Themen zu eröffnen
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>
                  Standard: Aus (nur Lehrkräfte eröffnen Themen, Kinder antworten darauf)
                </div>
              </div>

              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                border: allowStudentTopics ? '2px solid #16a34a' : '2px solid #cbd5e1',
                background: allowStudentTopics ? '#16a34a' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {allowStudentTopics && <Check size={13} color="#ffffff" strokeWidth={3} />}
              </div>
            </div>
          )}

          {/* 1-Klick Vorlagen */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.78rem', 
              fontWeight: 800, 
              color: '#64748b', 
              textTransform: 'uppercase', 
              letterSpacing: '0.04em',
              marginBottom: '10px'
            }}>
              <Sparkles size={14} style={{ color: '#16a34a' }} />
              Schnell-Vorlagen für Musikschulen
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px'
            }}>
              {PRESET_TEMPLATES.map(tpl => {
                const IconComp = tpl.IconComponent;
                const isSelected = channelName === tpl.name;
                return (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: isSelected ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0fdf4' : '#ffffff',
                      color: isSelected ? '#166534' : '#334155',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: isSelected ? '#dcfce7' : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <IconComp size={15} style={{ color: isSelected ? '#16a34a' : '#64748b' }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tpl.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        #{tpl.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kanalname */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
              Kanalname *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ 
                position: 'absolute', 
                left: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#94a3b8',
                fontWeight: 900,
                fontSize: '1rem'
              }}>
                #
              </span>
              <input
                type="text"
                placeholder="z. B. noten-material oder auftritte"
                value={channelName}
                onChange={e => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 34px',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* Beschreibung */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
              Thema / Beschreibung (optional)
            </label>
            <input
              type="text"
              placeholder="Worum geht es in diesem Kanal?"
              value={channelDescription}
              onChange={e => setChannelDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                fontSize: '0.88rem',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
                color: '#0f172a'
              }}
            />
          </div>

          {/* Schreibschutz Toggle */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsAnnouncementOnly(!isAnnouncementOnly)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsAnnouncementOnly(!isAnnouncementOnly);
              }
            }}
            style={{
              padding: '14px 16px',
              borderRadius: '16px',
              border: isAnnouncementOnly ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
              background: isAnnouncementOnly ? '#f0fdf4' : '#fafbfc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isAnnouncementOnly ? '#dcfce7' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Bell size={18} style={{ color: isAnnouncementOnly ? '#16a34a' : '#64748b' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                  Nur Lehrkraft darf schreiben
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                  Schüler können nur lesen & Bestätigungen („Gesehen & notiert“) senden
                </div>
              </div>
            </div>

            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '6px',
              border: isAnnouncementOnly ? '2px solid #16a34a' : '2px solid #cbd5e1',
              background: isAnnouncementOnly ? '#16a34a' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isAnnouncementOnly && <Check size={14} color="#ffffff" strokeWidth={3} />}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          background: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={handleCreateChannel}
            disabled={isSubmitting || !channelName.trim()}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              border: 'none',
              background: isSubmitting || !channelName.trim() ? '#94a3b8' : '#16a34a',
              color: '#ffffff',
              fontSize: '0.86rem',
              fontWeight: 900,
              cursor: isSubmitting || !channelName.trim() ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
              transition: 'background 0.2s ease'
            }}
          >
            {isSubmitting ? 'Wird erstellt...' : 'Kanal anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
};
