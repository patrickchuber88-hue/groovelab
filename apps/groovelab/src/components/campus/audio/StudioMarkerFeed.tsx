import React from 'react';
import { 
  Play, 
  Repeat, 
  Trash2, 
  Edit3, 
  Check, 
  Clock, 
  Lightbulb,
  Target,
  Star,
  User,
  GraduationCap,
  CheckCircle2,
  Circle,
  Bookmark,
  Mic,
  Sparkles
} from 'lucide-react';
import { AudioTimelineNote, AudioNoteTag } from '../../../utils/audioNotesStorage';
import { RainbowMarkerColor, getMarkerColor } from '../AudioNotesModal';

export const QUICK_FEEDBACK_CHIPS: Array<{ label: string; tag: AudioNoteTag; text: string; icon: React.ReactNode }> = [
  { label: 'Rhythmus / Timing', tag: 'tip', text: 'Rhythmus beachten: auf gleichmäßiges Tempo achten', icon: <Clock size={12} strokeWidth={2.4} /> },
  { label: 'Intonation', tag: 'tip', text: 'Tonhöhe sauber kontrollieren und exakt greifen/intonieren', icon: <Target size={12} strokeWidth={2.4} /> },
  { label: 'Fingersatz / Haltung', tag: 'tip', text: 'Locker bleiben: Fingersatz und Handhaltung entspannen', icon: <User size={12} strokeWidth={2.4} /> },
  { label: 'Dynamik', tag: 'tip', text: 'Dynamik gestalten: sanfter anspielen und Akzente setzen', icon: <Lightbulb size={12} strokeWidth={2.4} /> },
  { label: 'Klasse gespielt!', tag: 'highlight', text: 'Hervorragend gespielt! Schöner Ton und sicher im Takt', icon: <Star size={12} strokeWidth={2.4} /> }
];

export const TAG_CONFIG: Record<AudioNoteTag, { label: string; icon: React.ReactNode; bg: string; color: string }> = {
  tip: {
    label: 'Übe-Tipp',
    icon: <Lightbulb size={12} strokeWidth={2.4} />,
    bg: 'rgba(234, 179, 8, 0.12)',
    color: '#b45309'
  },
  bar: {
    label: 'Takt / Stelle',
    icon: <Target size={12} strokeWidth={2.4} />,
    bg: 'rgba(124, 58, 237, 0.12)',
    color: '#6d28d9'
  },
  highlight: {
    label: 'Highlight',
    icon: <Star size={12} strokeWidth={2.4} />,
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#047857'
  },
  general: {
    label: 'Marker',
    icon: <Bookmark size={12} strokeWidth={2.4} />,
    bg: 'rgba(100, 116, 139, 0.12)',
    color: '#334155'
  }
};

export interface StudioMarkerFeedProps {
  notes: AudioTimelineNote[];
  duration: number;
  isStudent: boolean;
  isMobile: boolean;
  formatTime: (secs: number) => string;
  // Note creation drawer
  isAddingNote: boolean;
  setIsAddingNote: (open: boolean) => void;
  newNoteTime: number;
  newNoteText: string;
  setNewNoteText: React.Dispatch<React.SetStateAction<string>>;
  newNoteTag: AudioNoteTag;
  setNewNoteTag: (tag: AudioNoteTag) => void;
  onSaveNewNote: () => void;
  noteInputRef: React.RefObject<HTMLTextAreaElement>;
  // Note editing
  editingNoteId: string | null;
  setEditingNoteId: (id: string | null) => void;
  editingText: string;
  setEditingText: (text: string) => void;
  editingTag: AudioNoteTag;
  setEditingTag: (tag: AudioNoteTag) => void;
  editingTime: number;
  setEditingTime: React.Dispatch<React.SetStateAction<number>>;
  onSaveEditedNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  // Spot loop & pre-roll
  spotLoopNoteId: string | null;
  getNoteLoopDuration: (note: AudioTimelineNote) => number;
  onToggleSpotLoop: (note: AudioTimelineNote) => void;
  onAdjustLoopDuration: (note: AudioTimelineNote, duration: number) => void;
  onPlayNotePreRoll: (time: number) => void;
  onTogglePracticed: (noteId: string) => void;
  // Voice dictation
  isListening: boolean;
  activeVoiceTarget: 'new' | 'edit';
  onToggleVoiceDictation: (target: 'new' | 'edit') => void;
  onOpenNoteAtTime: (time: number) => void;
  currentPlayTime: number;
}

export const StudioMarkerFeed: React.FC<StudioMarkerFeedProps> = ({
  notes,
  duration,
  isStudent,
  isMobile,
  formatTime,
  isAddingNote,
  setIsAddingNote,
  newNoteTime,
  newNoteText,
  setNewNoteText,
  newNoteTag,
  setNewNoteTag,
  onSaveNewNote,
  noteInputRef,
  editingNoteId,
  setEditingNoteId,
  editingText,
  setEditingText,
  editingTag,
  setEditingTag,
  editingTime,
  setEditingTime,
  onSaveEditedNote,
  onDeleteNote,
  spotLoopNoteId,
  getNoteLoopDuration,
  onToggleSpotLoop,
  onAdjustLoopDuration,
  onPlayNotePreRoll,
  onTogglePracticed,
  isListening,
  activeVoiceTarget,
  onToggleVoiceDictation,
  onOpenNoteAtTime,
  currentPlayTime
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 📝 New Note / Marker Creation Drawer (Instagram Creator Style) */}
      {isAddingNote && (
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fef2f2 100%)',
            borderRadius: '20px',
            border: '2px solid #ef4444',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 10px 30px -5px rgba(239, 68, 68, 0.15)',
            animation: 'fadeIn 0.18s ease-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Bookmark size={15} strokeWidth={2.4} color="#ef4444" fill="#ef4444" />
                <span>Neuer Marker bei <strong style={{ color: '#ef4444' }}>{formatTime(newNoteTime)}</strong></span>
              </span>

              {/* 1,5s Pre-Roll Vorhören Button */}
              <button
                type="button"
                onClick={() => onPlayNotePreRoll(newNoteTime)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                className="hover-scale-mini"
                title="1,5 Sekunden vor dieser Stelle abspielen"
              >
                <Play size={10} fill="currentColor" />
                <span>Vorhören (-1,5s)</span>
              </button>
            </div>

            {/* Quick-Tags */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(Object.keys(TAG_CONFIG) as AudioNoteTag[]).map((t) => {
                const cfg = TAG_CONFIG[t];
                const isSelected = newNoteTag === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewNoteTag(t)}
                    style={{
                      background: isSelected ? cfg.color : cfg.bg,
                      color: isSelected ? '#ffffff' : cfg.color,
                      border: 'none',
                      fontSize: '0.68rem',
                      fontWeight: isSelected ? 900 : 750,
                      padding: '4px 8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ⚡ 1-Tap Quick-Feedback Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {QUICK_FEEDBACK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setNewNoteText((prev) => (prev.trim() ? `${prev.trim()} • ${chip.text}` : chip.text));
                  setNewNoteTag(chip.tag);
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '5px 9px',
                  fontSize: '0.72rem',
                  fontWeight: 750,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.12s ease'
                }}
                className="hover-scale-mini"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Textarea mit 16px Anti-Zoom auf iOS */}
          <textarea
            ref={noteInputRef}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="z. B. Takt 12: Daumen locker lassen oder Stelle noch 3x langsam wiederholen..."
            rows={2}
            style={{
              width: '100%',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              padding: '10px 12px',
              fontSize: '16px',
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* 🎙️ Voice Dictation Button */}
            <button
              type="button"
              onClick={() => onToggleVoiceDictation('new')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '999px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                border: isListening && activeVoiceTarget === 'new' ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                background: isListening && activeVoiceTarget === 'new' ? '#fef2f2' : '#ffffff',
                color: isListening && activeVoiceTarget === 'new' ? '#dc2626' : '#334155',
                boxShadow: isListening && activeVoiceTarget === 'new' ? '0 0 14px rgba(239, 68, 68, 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Spracheingabe nutzen (Taste: D)"
            >
              <Mic size={14} color={isListening && activeVoiceTarget === 'new' ? '#ef4444' : '#0284c7'} />
              <span>{isListening && activeVoiceTarget === 'new' ? 'Hört zu... (Klick zum Stoppen)' : 'Diktieren (Taste: D)'}</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsAddingNote(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 750,
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>

              <button
                type="button"
                disabled={!newNoteText.trim()}
                onClick={onSaveNewNote}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontSize: '0.80rem',
                  fontWeight: 850,
                  cursor: newNoteText.trim() ? 'pointer' : 'not-allowed',
                  opacity: newNoteText.trim() ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                <Check size={15} strokeWidth={2.6} />
                <span>Marker sichern</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📋 Moments & Marker Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
            Moments & Übe-Marker
          </span>
          <span
            style={{
              background: '#f1f5f9',
              color: '#0f172a',
              fontSize: '0.68rem',
              fontWeight: 850,
              padding: '2px 8px',
              borderRadius: '999px'
            }}
          >
            {notes.length}
          </span>
        </div>
      </div>

      {/* 📭 Empty State: Instagram Creator Style Teaser */}
      {notes.length === 0 ? (
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: '1.5px dashed #cbd5e1',
            borderRadius: '20px',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
            }}
          >
            <Sparkles size={24} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: '0.90rem', fontWeight: 850, color: '#0f172a', marginBottom: '4px' }}>
              Halte deine besten Stellen fest
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '340px', lineHeight: 1.45 }}>
              Tippe auf die Wellenform oder nutze <strong>+ Marker</strong>, um wichtige Stellen, schwierige Takte oder 4-Sekunden-Übeschleifen zu markieren.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenNoteAtTime(currentPlayTime)}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '0.78rem',
              fontWeight: 850,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}
            className="hover-scale-mini"
          >
            <Bookmark size={14} fill="currentColor" />
            <span>Jetzt ersten Marker setzen</span>
          </button>
        </div>
      ) : (
        /* 📱 Populated Feed: Story-Style Cards */
        notes.map((n, idx) => {
          const tagCfg = n.tag && TAG_CONFIG[n.tag] ? TAG_CONFIG[n.tag] : TAG_CONFIG.general;
          const isEditing = editingNoteId === n.id;
          const isAuthorTeacher = n.authorRole === 'teacher';
          const isSpotLoopActive = spotLoopNoteId === n.id;
          const isPracticed = !!n.isPracticed;
          const rainbowColor = getMarkerColor(idx);

          if (isEditing) {
            return (
              <div
                key={n.id}
                style={{
                  background: '#ffffff',
                  border: '2px solid #ef4444',
                  borderRadius: '16px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 850, color: '#0f172a' }}>
                      Zeitpunkt: <strong style={{ color: '#ef4444' }}>{formatTime(editingTime)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingTime((t) => Math.max(0, Number((t - 0.1).toFixed(1))))}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '3px 7px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      title="0,1s zurück"
                    >
                      -0.1s
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTime((t) => Math.min(duration, Number((t + 0.1).toFixed(1))))}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '3px 7px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      title="0,1s vor"
                    >
                      +0.1s
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '3px' }}>
                    {(Object.keys(TAG_CONFIG) as AudioNoteTag[]).map((t) => {
                      const cfg = TAG_CONFIG[t];
                      const isSel = editingTag === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEditingTag(t)}
                          style={{
                            background: isSel ? cfg.color : cfg.bg,
                            color: isSel ? '#ffffff' : cfg.color,
                            border: 'none',
                            fontSize: '0.66rem',
                            fontWeight: isSel ? 900 : 750,
                            padding: '3px 7px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    padding: '8px 10px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => onToggleVoiceDictation('edit')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: isListening && activeVoiceTarget === 'edit' ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      background: isListening && activeVoiceTarget === 'edit' ? '#fef2f2' : '#ffffff',
                      color: isListening && activeVoiceTarget === 'edit' ? '#dc2626' : '#334155'
                    }}
                  >
                    <Mic size={12} color={isListening && activeVoiceTarget === 'edit' ? '#ef4444' : '#0284c7'} />
                    <span>{isListening && activeVoiceTarget === 'edit' ? 'Hört zu...' : 'Diktieren (D)'}</span>
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingNoteId(null)}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 750,
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveEditedNote(n.id)}
                      style={{
                        background: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '0.74rem',
                        fontWeight: 850,
                        color: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      Übernehmen
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={n.id}
              style={{
                background: isPracticed ? '#f0fdf4' : '#ffffff',
                border: `1.5px solid ${isPracticed ? '#bbf7d0' : '#f1f5f9'}`,
                borderLeft: `4px solid ${rainbowColor.bg}`,
                borderRadius: '16px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
            >
              {/* 🔝 Zeile 1: Checkbox, Index, Timestamp, Tag, Author & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {/* Practice Checkbox */}
                  <button
                    type="button"
                    onClick={() => onTogglePracticed(n.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: isPracticed ? '#16a34a' : '#94a3b8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={isPracticed ? 'Als noch offen markieren' : 'Als geübt abhaken'}
                  >
                    {isPracticed ? <CheckCircle2 size={19} strokeWidth={2.4} /> : <Circle size={19} strokeWidth={2.0} />}
                  </button>

                  {/* Rainbow Index Badge */}
                  <span
                    style={{
                      background: rainbowColor.lightBg,
                      border: 'none',
                      color: rainbowColor.bg,
                      fontSize: '0.70rem',
                      fontWeight: 900,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: rainbowColor.bg }} />
                    <span>#{idx + 1}</span>
                  </span>

                  {/* Timestamp */}
                  <span
                    style={{
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.70rem',
                      fontWeight: 850,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Clock size={11} strokeWidth={2.2} color="#64748b" />
                    <span>{formatTime(n.time)}</span>
                  </span>

                  {/* Tag Badge */}
                  <span
                    style={{
                      background: tagCfg.bg,
                      color: tagCfg.color,
                      fontSize: '0.68rem',
                      fontWeight: 850,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {tagCfg.icon}
                    <span>{tagCfg.label}</span>
                  </span>

                  {/* Author Pill */}
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    {isAuthorTeacher ? <GraduationCap size={11} strokeWidth={2.4} /> : <User size={11} strokeWidth={2.4} />}
                    <span>{isAuthorTeacher ? 'Lehrkraft' : 'Schüler'}{n.authorName ? ` (${n.authorName})` : ''}</span>
                  </span>

                  {/* Geübt Badge */}
                  {isPracticed && (
                    <span
                      style={{
                        background: '#10b981',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.64rem',
                        fontWeight: 850,
                        padding: '2px 7px',
                        borderRadius: '6px'
                      }}
                    >
                      ✓ Geübt
                    </span>
                  )}
                </div>

                {/* Edit & Delete Actions */}
                {(!isStudent || n.authorRole === 'student') && (
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNoteId(n.id);
                        setEditingText(n.text);
                        setEditingTag(n.tag || 'general');
                        setEditingTime(n.time);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Marker bearbeiten"
                    >
                      <Edit3 size={15} strokeWidth={2.2} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteNote(n.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f87171',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Marker löschen"
                    >
                      <Trash2 size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                )}
              </div>

              {/* 📝 Zeile 2: Notizentext */}
              <div
                style={{
                  fontSize: isMobile ? '0.84rem' : '0.88rem',
                  color: '#0f172a',
                  fontWeight: 650,
                  lineHeight: 1.45,
                  wordBreak: 'break-word',
                  paddingLeft: isMobile ? '0px' : '26px'
                }}
              >
                {n.text}
              </div>

              {/* 🎬 Zeile 3: Vorhören & 1-Tap 4s-Loop Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  paddingLeft: isMobile ? '0px' : '26px',
                  marginTop: '2px',
                  flexWrap: 'wrap'
                }}
              >
                {/* Pre-Roll Play */}
                <button
                  type="button"
                  onClick={() => onPlayNotePreRoll(n.time)}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)'
                  }}
                  className="hover-scale-mini"
                  title="1,5s vor dieser Stelle abspielen"
                >
                  <Play size={11} fill="currentColor" />
                  <span>Vorhören (-1,5s)</span>
                </button>

                {/* 1-Tap Übe-Schleife (YouTube/DAW Style) */}
                <button
                  type="button"
                  onClick={() => onToggleSpotLoop(n)}
                  style={{
                    background: isSpotLoopActive ? '#ef4444' : '#f8fafc',
                    color: isSpotLoopActive ? '#ffffff' : '#0f172a',
                    border: isSpotLoopActive ? 'none' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '5px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: isSpotLoopActive ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none'
                  }}
                  className="hover-scale-mini"
                  title={`${getNoteLoopDuration(n)}s Übeschleife`}
                >
                  <Repeat size={12} strokeWidth={isSpotLoopActive ? 2.8 : 2.0} />
                  <span>{isSpotLoopActive ? `Loop aktiv (${getNoteLoopDuration(n).toFixed(1)}s)` : `${getNoteLoopDuration(n).toFixed(1)}s Loop`}</span>
                </button>
              </div>

              {/* 🎚️ Stufenloser Loop-Slider Expander bei aktivem Loop */}
              {isSpotLoopActive && (
                <div
                  style={{
                    marginLeft: isMobile ? '0px' : '26px',
                    marginTop: '4px',
                    background: '#fef2f2',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', fontWeight: 800, color: '#b91c1c' }}>
                    <Repeat size={13} strokeWidth={2.4} />
                    <span>Länge: <strong>{getNoteLoopDuration(n).toFixed(1)}s</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '140px' }}>
                    <span style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 700 }}>1s</span>
                    <input
                      type="range"
                      min="1.0"
                      max="15.0"
                      step="0.5"
                      value={getNoteLoopDuration(n)}
                      onChange={(e) => onAdjustLoopDuration(n, parseFloat(e.target.value))}
                      style={{
                        flex: 1,
                        cursor: 'pointer',
                        accentColor: '#ef4444',
                        height: '4px'
                      }}
                      title={`Loop-Länge einstellen: ${getNoteLoopDuration(n)}s`}
                    />
                    <span style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 700 }}>15s</span>
                  </div>

                  {/* Presets */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[2.0, 4.0, 8.0].map((preset) => {
                      const isCurrent = Math.abs(getNoteLoopDuration(n) - preset) < 0.1;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => onAdjustLoopDuration(n, preset)}
                          style={{
                            background: isCurrent ? '#ef4444' : '#ffffff',
                            color: isCurrent ? '#ffffff' : '#b91c1c',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '0.68rem',
                            fontWeight: 850,
                            cursor: 'pointer'
                          }}
                        >
                          {preset}s
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
