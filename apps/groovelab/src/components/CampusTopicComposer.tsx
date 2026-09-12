import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Send, 
  X, 
  Sparkles, 
  Lock, 
  MessageSquarePlus,
  PenLine
} from 'lucide-react';

export interface CampusTopicComposerProps {
  onPublishTopic: (subject: string, content: string) => Promise<void>;
  canCreateTopic: boolean;
  isMobile: boolean;
  channelName: string;
}

export const CampusTopicComposer: React.FC<CampusTopicComposerProps> = ({
  onPublishTopic,
  canCreateTopic,
  isMobile,
  channelName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setIsOpen(true);
    setErrorMsg('');
    setTimeout(() => {
      subjectInputRef.current?.focus();
    }, 100);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSubject('');
    setContent('');
    setErrorMsg('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanSubject = subject.trim();
    const cleanContent = content.trim();

    if (!cleanSubject) {
      setErrorMsg('Bitte gib einen aussagekräftigen Betreff für das Thema ein.');
      subjectInputRef.current?.focus();
      return;
    }

    if (!cleanContent) {
      setErrorMsg('Bitte gib eine Nachricht oder Beschreibung für das Thema ein.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onPublishTopic(cleanSubject, cleanContent);
      handleClose();
    } catch (err: any) {
      console.error('[CampusTopicComposer] Error publishing topic:', err);
      setErrorMsg(err.message || 'Fehler beim Veröffentlichen des Themas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreateTopic) {
    return (
      <div style={{
        padding: '10px 16px',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: '#64748b',
        fontSize: '0.78rem',
        fontWeight: 700
      }}>
        <Lock size={14} style={{ color: '#94a3b8' }} />
        <span>In diesem Kanal eröffnen Lehrkräfte die Themen. Du kannst auf jedes Thema antworten.</span>
      </div>
    );
  }

  // COLLAPSED SLIM BAR (High Density: 38px height, preserves 95% mobile screen)
  if (!isOpen) {
    return (
      <div style={{
        padding: isMobile ? '8px 12px' : '10px 16px',
        background: '#ffffff',
        borderTop: '1px solid #f1f5f9',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'
      }}>
        <button
          type="button"
          onClick={handleOpen}
          aria-expanded="false"
          style={{
            width: '100%',
            height: isMobile ? '38px' : '42px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#475569',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxSizing: 'border-box'
          }}
          className="hover-scale-mini"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PenLine size={15} style={{ color: '#16a34a' }} />
            <span>Neues Thema in #{channelName} starten...</span>
          </div>

          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#e6f4ea',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Plus size={15} strokeWidth={2.8} />
          </div>
        </button>
      </div>
    );
  }

  // EXPANDED COMPOSER CARD
  return (
    <div style={{
      padding: isMobile ? '12px' : '16px 20px',
      background: '#ffffff',
      borderTop: '1.5px solid #16a34a',
      boxShadow: '0 -6px 20px rgba(0, 0, 0, 0.08)',
      animation: 'fadeInScale 0.15s ease'
    }}>
      <form onSubmit={handleSubmit}>
        {/* Header with Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquarePlus size={16} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
              Neues Thema starten
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Schließen"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '0.78rem',
            fontWeight: 700,
            marginBottom: '8px'
          }}>
            {errorMsg}
          </div>
        )}

        {/* BETREFF / THEMENTITEL (Pflichtfeld gem. Grill-Me) */}
        <div style={{ marginBottom: '8px' }}>
          <input
            ref={subjectInputRef}
            type="text"
            placeholder="Betreff / Thementitel (z. B. Probe am Samstag, Noten Schulfest) *"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.90rem',
              fontWeight: 800,
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* NACHRICHTENTEXT */}
        <div style={{ marginBottom: '10px' }}>
          <textarea
            rows={isMobile ? 3 : 4}
            placeholder="Nachricht eingeben... Beschreibe das Thema, Aufgaben oder Details für die Gruppe."
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '0.85rem',
              lineHeight: 1.45,
              color: '#334155',
              fontWeight: 500,
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              fontSize: '0.80rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !subject.trim() || !content.trim()}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: isSubmitting || !subject.trim() || !content.trim() ? '#94a3b8' : '#16a34a',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isSubmitting || !subject.trim() || !content.trim() ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
            }}
          >
            <Send size={13} />
            <span>{isSubmitting ? 'Wird veröffentlicht...' : 'Thema veröffentlichen'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
