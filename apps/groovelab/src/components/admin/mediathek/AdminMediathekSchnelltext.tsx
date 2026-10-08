import React, { useState, useMemo } from 'react';
import { Settings, Zap, Check } from 'lucide-react';
import {
  getTextbausteinCategoryTheme,
  TEXTBAUSTEIN_CATEGORY_THEMES
} from '../../../services/textbausteineService';

export interface AdminMediathekSchnelltextProps {
  mediathekTab: 'songs' | 'lehrwerke' | 'schnelltext' | 'notenschnipsel';
  textbausteine: any[];
  brandColor: string;
  songSearch: string;
  copiedTbId: string | null;
  setCopiedTbId: (id: string | null) => void;
  setShowTextbausteinModal: (val: boolean) => void;
  setPreviewingTextbaustein: (tb: any) => void;
  selectedLehrwerkForDetail?: any;
  selectedSongForDetail?: any;
  selectedStudentForProgress?: any;
  setNewHomeworkNoteText: React.Dispatch<React.SetStateAction<string>>;
  setSongLessonNotes: React.Dispatch<React.SetStateAction<string>>;
}

export const AdminMediathekSchnelltext: React.FC<AdminMediathekSchnelltextProps> = ({
  mediathekTab,
  textbausteine,
  brandColor,
  songSearch,
  copiedTbId,
  setCopiedTbId,
  setShowTextbausteinModal,
  setPreviewingTextbaustein,
  selectedLehrwerkForDetail,
  selectedSongForDetail,
  selectedStudentForProgress,
  setNewHomeworkNoteText,
  setSongLessonNotes
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'rhythm' | 'technique' | 'performance'>('all');

  const activeBausteine = useMemo(() => {
    return textbausteine.filter((tb: any) => tb.active !== false);
  }, [textbausteine]);

  const counts = useMemo(() => {
    return {
      all: activeBausteine.length,
      rhythm: activeBausteine.filter((tb: any) => tb.category === 'rhythm').length,
      technique: activeBausteine.filter((tb: any) => tb.category === 'technique').length,
      performance: activeBausteine.filter((tb: any) => tb.category === 'performance').length
    };
  }, [activeBausteine]);

  const filteredBausteine = useMemo(() => {
    const q = songSearch.trim().toLowerCase();
    return activeBausteine.filter((tb: any) => {
      const matchesCat = selectedCategory === 'all' || tb.category === selectedCategory;
      const matchesSearch = !q || (tb.label || '').toLowerCase().includes(q) || (tb.text || '').toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [activeBausteine, selectedCategory, songSearch]);

  const categories = [
    { id: 'all', label: `Alle (${counts.all})` },
    { id: 'rhythm', label: `🥁 Rhythmus (${counts.rhythm})` },
    { id: 'technique', label: `🎹 Technik (${counts.technique})` },
    { id: 'performance', label: `🎭 Ausdruck (${counts.performance})` }
  ] as const;

  return (
    <div 
      style={{ display: mediathekTab === 'schnelltext' ? 'flex' : 'none', flexDirection: 'column', gap: '16px', width: '100%' }}
      className={`mediathek-col-card mediathek-col-schnelltext ${mediathekTab === 'schnelltext' ? 'mobile-active-card' : 'mobile-hidden-card'}`}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: `${brandColor}15`, color: brandColor, padding: '3px 6px', borderRadius: '6px', fontSize: '0.95rem' }}>⚡</span>
          Schnell-Text ({filteredBausteine.length})
        </h3>
        <button 
          type="button"
          onClick={() => setShowTextbausteinModal(true)}
          style={{ 
            background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
            color: '#ffffff', 
            border: 'none', 
            padding: '6px 14px', 
            borderRadius: '10px', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '0.75rem', 
            fontWeight: 900,
            boxShadow: `0 4px 10px -3px ${brandColor}40`,
            transition: 'all 0.2s ease'
          }}
        >
          <Settings size={14} /> Verwalten
        </button>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '4px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const theme = cat.id !== 'all' ? TEXTBAUSTEIN_CATEGORY_THEMES[cat.id] : null;

          let pillBg = 'transparent';
          let pillColor = '#64748b';
          if (isSelected) {
            if (theme) {
              pillBg = theme.border;
              pillColor = theme.text;
            } else {
              pillBg = brandColor;
              pillColor = '#ffffff';
            }
          }

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: pillBg,
                color: pillColor,
                fontWeight: 800,
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      {filteredBausteine.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <Zap size={32} color="#94a3b8" style={{ margin: '0 auto 8px auto', display: 'block' }} />
          <div style={{ fontWeight: 800, color: '#475569', fontSize: '0.9rem' }}>Keine Schnell-Textbausteine gefunden</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            {songSearch ? 'Passen Sie den Suchbegriff an oder wählen Sie eine andere Kategorie.' : 'Erstellen Sie neue Vorlagen über den Verwalten-Button.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', width: '100%' }}>
          {filteredBausteine.map((tb: any) => {
            const parts = (tb.label || '').split(' ');
            const hasEmoji = parts[0] && /\p{Emoji}/u.test(parts[0]);
            const emoji = hasEmoji ? parts[0] : '🎵';
            const name = hasEmoji ? parts.slice(1).join(' ') : tb.label;
            const isCopied = copiedTbId === tb.id;
            const theme = getTextbausteinCategoryTheme(tb.category);

            const handleCardClick = () => {
              if (selectedLehrwerkForDetail && selectedStudentForProgress) {
                setNewHomeworkNoteText(prev => prev ? `${prev}\n\n${tb.text}` : tb.text);
                setCopiedTbId(tb.id);
                setTimeout(() => setCopiedTbId(null), 850);
              } else if (selectedSongForDetail && selectedStudentForProgress) {
                setSongLessonNotes(prev => prev ? `${prev}\n\n${tb.text}` : tb.text);
                setCopiedTbId(tb.id);
                setTimeout(() => setCopiedTbId(null), 850);
              } else {
                setPreviewingTextbaustein(tb);
              }
            };

            return (
              <div 
                key={tb.id} 
                onClick={handleCardClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick();
                  }
                }}
                style={{ 
                  border: 'none', 
                  borderRadius: '16px', 
                  padding: '12px 10px', 
                  background: isCopied ? theme.accent : theme.bg,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                  gap: '8px',
                  boxShadow: isCopied ? `0 4px 14px ${theme.glow}` : `0 2px 8px ${theme.glow}`,
                  minHeight: '120px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: isCopied ? 'scale(0.96)' : 'none',
                  outline: 'none'
                }}
                className="hover-scale-mini"
              >
                {/* Tone-in-Tone Squircle Container */}
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: isCopied ? 'rgba(255, 255, 255, 0.2)' : theme.badgeBg,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  marginTop: '2px'
                }}>
                  {isCopied ? <Check size={18} color="#ffffff" strokeWidth={3} /> : emoji}
                </div>
                
                {/* Title */}
                <span style={{ 
                  fontSize: '0.74rem', 
                  fontWeight: 800, 
                  color: isCopied ? '#ffffff' : theme.text, 
                  display: '-webkit-box', 
                  WebkitLineClamp: 2, 
                  WebkitBoxOrient: 'vertical', 
                  overflow: 'hidden', 
                  lineHeight: '1.25', 
                  height: '2.5em', 
                  wordBreak: 'break-word'
                }}>
                  {isCopied ? (selectedLehrwerkForDetail || selectedSongForDetail ? 'Eingefügt! ✓' : 'Kopiert! ✓') : name}
                </span>

                {/* Subtle Category Label */}
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: isCopied ? 'rgba(255, 255, 255, 0.9)' : theme.accent,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {theme.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminMediathekSchnelltext;
