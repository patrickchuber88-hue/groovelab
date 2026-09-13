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
  onPublishTopic: (subject: string, content?: string) => Promise<any>;
  canCreateTopic: boolean;
  isMobile: boolean;
  channelName: string;
  isGroup?: boolean;
  recipientDisplayName?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CampusTopicComposer: React.FC<CampusTopicComposerProps> = ({
  onPublishTopic,
  canCreateTopic,
  isMobile,
  channelName,
  isGroup = false,
  recipientDisplayName,
  isOpen: propIsOpen,
  onOpenChange
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;

  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    }
    setInternalIsOpen(open);
  };

  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const subjectInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        subjectInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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
      setErrorMsg('Bitte gib einen Betreff für das Thema ein.');
      subjectInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onPublishTopic(cleanSubject, cleanContent || cleanSubject);
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

  // DIRECT INLINE INPUT BAR (Enter creates the thread directly, Plus button expands for optional message)
  if (!isOpen) {
    const placeholderText = isGroup
      ? `Neues Thema in #${channelName} starten (Enter)...`
      : `Neues Thema starten (Enter zum Eröffnen)...`;

    return (
      <div style={{
        padding: isMobile ? '8px 12px' : '10px 16px',
        background: '#ffffff',
        borderTop: '1px solid #f1f5f9',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'
      }}>
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
        <form 
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%'
          }}
        >
          <div style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <PenLine 
              size={16} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                color: subject ? '#16a34a' : '#94a3b8',
                pointerEvents: 'none'
              }} 
            />
            <input
              ref={subjectInputRef}
              type="text"
              placeholder={placeholderText}
              value={subject}
              onChange={e => {
                setSubject(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isSubmitting}
              aria-label={placeholderText}
              style={{
                width: '100%',
                height: isMobile ? '44px' : '42px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: isMobile ? '16px' : '0.88rem',
                fontWeight: 650,
                paddingLeft: '38px',
                paddingRight: '12px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease'
              }}
            />
          </div>

          {/* Details / Erweitern Button */}
          <button
            type="button"
            onClick={handleOpen}
            aria-label="Beschreibung oder Details zum Thema hinzufügen"
            title="Beschreibung / Details hinzufügen"
            style={{
              width: isMobile ? '44px' : '42px',
              height: isMobile ? '44px' : '42px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#f1f5f9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              touchAction: 'manipulation'
            }}
            className="hover-scale-mini"
          >
            <Plus size={18} strokeWidth={2.4} />
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !subject.trim()}
            aria-label="Thema eröffnen"
            title="Thema eröffnen"
            style={{
              width: isMobile ? '44px' : '42px',
              height: isMobile ? '44px' : '42px',
              borderRadius: '12px',
              border: 'none',
              background: isSubmitting || !subject.trim() ? '#cbd5e1' : '#16a34a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSubmitting || !subject.trim() ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              boxShadow: subject.trim() ? '0 2px 6px rgba(22, 163, 74, 0.25)' : 'none',
              touchAction: 'manipulation',
              transition: 'all 0.15s ease'
            }}
            className={subject.trim() ? 'hover-scale-mini' : undefined}
          >
            <Send size={16} />
          </button>
        </form>
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
      <form onSubmit={handleSubmit} onKeyDown={e => { if (e.key === 'Escape') handleClose(); }}>
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

        {/* BETREFF / THEMENTITEL (Enter zum sofortigen Veröffentlichen) */}
        <div style={{ marginBottom: '8px' }}>
          <input
            ref={subjectInputRef}
            type="text"
            placeholder="Betreff / Thementitel (Enter zum Eröffnen) *"
            value={subject}
            onChange={e => {
              setSubject(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
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

        {/* NACHRICHTENTEXT (OPTIONAL) */}
        <div style={{ marginBottom: '10px' }}>
          <textarea
            rows={isMobile ? 3 : 4}
            placeholder={isGroup 
              ? "Optionale Nachricht eingeben... Details oder Absprachen für die Gruppe (optional)." 
              : `Optionale Nachricht eingeben... Details oder Absprachen für ${recipientDisplayName || 'den Empfänger'} (optional).`}
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
            disabled={isSubmitting || !subject.trim()}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: isSubmitting || !subject.trim() ? '#cbd5e1' : '#16a34a',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isSubmitting || !subject.trim() ? 'not-allowed' : 'pointer',
              boxShadow: subject.trim() ? '0 2px 4px rgba(22, 163, 74, 0.2)' : 'none'
            }}
          >
            <Send size={13} />
            <span>{isSubmitting ? 'Wird veröffentlicht...' : 'Thema eröffnen'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
