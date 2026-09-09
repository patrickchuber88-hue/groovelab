import React, { useState, useEffect } from 'react';
import { X, Copy, Pencil, Trash2, Search } from 'lucide-react';

export interface AdminTextbausteinModalProps {
  isOpen: boolean;
  onClose: () => void;
  textbausteine: any[];
  setTextbausteine: React.Dispatch<React.SetStateAction<any[]>>;
  brandColor?: string;
  previewingTextbaustein?: any | null;
  onClosePreview?: () => void;
  copiedTbId?: string | null;
  setCopiedTbId?: (id: string | null) => void;
}

export const AdminTextbausteinModal: React.FC<AdminTextbausteinModalProps> = ({
  isOpen,
  onClose,
  textbausteine,
  setTextbausteine,
  brandColor = '#e11d48',
  previewingTextbaustein,
  onClosePreview,
  copiedTbId,
  setCopiedTbId
}) => {
  const [editingTextbaustein, setEditingTextbaustein] = useState<any | null>(null);
  const [tbLabel, setTbLabel] = useState('');
  const [tbText, setTbText] = useState('');
  const [tbType, setTbType] = useState<'songs' | 'lehrwerke' | 'both'>('both');
  const [tbCategory, setTbCategory] = useState<'rhythm' | 'technique' | 'performance'>('rhythm');
  const [tbSearch, setTbSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'rhythm' | 'technique' | 'performance'>('all');
  const [selectedIcon, setSelectedIcon] = useState('🎵');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [localCopiedTbId, setLocalCopiedTbId] = useState<string | null>(null);

  const activeCopiedTbId = copiedTbId !== undefined ? copiedTbId : localCopiedTbId;
  const updateCopiedTbId = setCopiedTbId || setLocalCopiedTbId;

  const AVAILABLE_ICONS = [
    '🐌', '🚀', '🕵️‍♂️', '🧩', '🥁', '🎹', '🎸', '🎷', '🎧', '🎤', '🎼', '🏆', 
    '🎖️', '🌟', '🎯', '⚡', '💡', '🔍', '🦖', '🦁', '🦊', '🦉', '🦄', '🔥', 
    '👑', '🌈', '🎨', '🎬', '⏱️', '🎵', '🎺', '🎻', '🔔', '📢', '🏰', '🎈', 
    '👽', '🍿', '🧊', '🦾', '🧠', '✨', '🍀', '🍕', '🐱', '🐶', '🧁', '💿', 
    '📻', '🎙️', '🎛️', '🎚️', '🎶', '🦾', '🦸‍♂️', '🧙‍♂️', '🏃‍♂️', '🧗‍♂️', '🏄‍♂️', '🧘‍♂️', 
    '👾', '🛸', '💎', '🔑', '🧭', '🗺️', '🎪', '🎢', '🎳', '🎮', '🧪', '🧬', 
    '⚙️', '🛠️', '🧱', '🎉', '🎊', '🔇', '🔈', '🗯️', '💭', '✏️', '📝', '📂', 
    '📈', '📬', '🏷️', '❤️', '🍀', '🌈'
  ];

  useEffect(() => {
    if (editingTextbaustein) {
      const parts = editingTextbaustein.label.split(' ');
      const hasEmoji = parts[0] && /\p{Emoji}/u.test(parts[0]);
      if (hasEmoji) {
        setSelectedIcon(parts[0]);
        setTbLabel(parts.slice(1).join(' '));
      } else {
        setSelectedIcon('🎵');
        setTbLabel(editingTextbaustein.label);
      }
      setTbCategory(editingTextbaustein.category || 'rhythm');
    } else {
      const used = textbausteine.map(tb => tb.label.split(' ')[0]);
      const firstAvail = AVAILABLE_ICONS.find(icon => !used.includes(icon)) || '🎵';
      setSelectedIcon(firstAvail);
      setTbLabel('');
      setTbCategory('rhythm');
    }
  }, [editingTextbaustein, textbausteine]);

  const handleClose = () => {
    onClose();
    setEditingTextbaustein(null);
    setTbLabel('');
    setTbText('');
    setTbType('both');
    setTbCategory('rhythm');
    setTbSearch('');
    setSelectedCategoryFilter('all');
  };

  const handleDeleteTextbaustein = (id: string) => {
    setTextbausteine(prev => prev.filter(tb => tb.id !== id));
    if (editingTextbaustein?.id === id) {
      setEditingTextbaustein(null);
      setTbLabel('');
      setTbText('');
      setTbType('both');
      setTbCategory('rhythm');
    }
  };

  const handleSaveTextbaustein = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tbLabel.trim() || !tbText.trim()) return;

    const fullLabel = `${selectedIcon} ${tbLabel.trim()}`;

    if (editingTextbaustein) {
      setTextbausteine(prev => prev.map(tb => tb.id === editingTextbaustein.id ? { ...tb, label: fullLabel, text: tbText.trim(), type: tbType, category: tbCategory } : tb));
      setEditingTextbaustein(null);
    } else {
      const newTb = {
        id: String(Date.now()),
        label: fullLabel,
        text: tbText.trim(),
        type: tbType,
        category: tbCategory,
        active: true
      };
      setTextbausteine(prev => [...prev, newTb]);
    }
    setTbLabel('');
    setTbText('');
    setTbType('both');
    setTbCategory('rhythm');
  };

  const handleToggleTextbausteinActive = (id: string) => {
    setTextbausteine(prev => prev.map(tb => tb.id === id ? { ...tb, active: !tb.active } : tb));
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-label="Textbausteine verwalten"
          style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div className="animation-slide-up" style={{ background: '#ffffff', padding: '32px', borderRadius: '32px', maxWidth: '950px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡</span>
                  <span>Textbausteine verwalten</span>
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0', fontWeight: 600 }}>
                  Erstelle, bearbeite oder lösche deine Schnell-Notizvorlagen.
                </p>
              </div>
              <button 
                type="button" 
                onClick={handleClose} 
                aria-label="Textbaustein-Editor schließen"
                title="Schließen"
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content: Form and List in Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', minHeight: 0, flex: 1 }}>
              
              {/* Form Column */}
              <form onSubmit={handleSaveTextbaustein} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff', padding: '20px', borderRadius: '20px', border: '1.5px solid #e2e8f0', justifyContent: 'space-between', height: '100%', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                    {editingTextbaustein ? '✏️ Baustein bearbeiten' : '➕ Neuer Baustein'}
                  </h3>

                  {/* Icon selector button trigger */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Wähle ein Icon</label>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: 'white',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        outline: 'none'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = brandColor}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                      <span style={{ fontSize: '1.8rem', background: '#f1f5f9', width: '48px', height: '48px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedIcon}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>Emoji auswählen</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Klicken, um die Emoji-Liste anzuzeigen</span>
                      </div>
                    </button>
                  </div>

                  {/* Label (Name) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Schnell-Textname (ohne Icon)</label>
                    <input 
                      required 
                      placeholder="z.B. Schnecken-Tempo" 
                      value={tbLabel} 
                      onChange={e => setTbLabel(e.target.value)} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                    />
                  </div>

                  {/* Inhalt des Textbausteins */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Inhalt des Textbausteins</label>
                    <textarea 
                      required 
                      placeholder="Dieser Text wird beim Klicken eingefügt..." 
                      value={tbText} 
                      onChange={e => setTbText(e.target.value)} 
                      rows={8} 
                      style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 650, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  {/* Kategorie */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Kategorie</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { id: 'rhythm', label: '🥁 Rhythmus' },
                        { id: 'technique', label: '🎹 Technik' },
                        { id: 'performance', label: '🎭 Ausdruck' }
                      ].map(cat => {
                        const isSelected = tbCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setTbCategory(cat.id as any)}
                            style={{
                              flex: 1,
                              padding: '8px 4px',
                              borderRadius: '10px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              border: isSelected ? `1.5px solid ${brandColor}` : '1.5px solid #cbd5e1',
                              background: isSelected ? `${brandColor}10` : 'white',
                              color: isSelected ? brandColor : '#475569',
                              transition: 'all 0.15s'
                            }}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scope */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Bereich zuordnen</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(['both', 'songs', 'lehrwerke'] as const).map(type => {
                        const labelMap = { both: 'Beide', songs: 'Songs', lehrwerke: 'Lehrwerke' };
                        const isSelected = tbType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setTbType(type)}
                            style={{
                              flex: 1,
                              padding: '8px 6px',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              border: isSelected ? `1.5px solid ${brandColor}` : '1.5px solid #e2e8f0',
                              background: isSelected ? `${brandColor}10` : 'white',
                              color: isSelected ? brandColor : '#475569',
                              transition: 'all 0.15s'
                            }}
                          >
                            {labelMap[type]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
                  <button 
                    type="submit" 
                    style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Speichern
                  </button>
                  {editingTextbaustein && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingTextbaustein(null);
                        setTbLabel('');
                        setTbText('');
                        setTbType('both');
                        setTbCategory('rhythm');
                      }} 
                      style={{ flex: 1, background: '#e2e8f0', color: '#475569', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Abbrechen
                    </button>
                  )}
                </div>
              </form>

              {/* List Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Bestehende Bausteine</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '4px 10px', borderRadius: '9999px' }}>
                      {textbausteine.length}
                    </span>
                  </h3>
                </div>

                {/* Search Field */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Bausteine durchsuchen..."
                    value={tbSearch}
                    onChange={e => setTbSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 650,
                      outline: 'none',
                      background: 'white'
                    }}
                  />
                </div>

                {/* Category tabs */}
                <div style={{ display: 'flex', gap: '4px', padding: '2px', background: '#f1f5f9', borderRadius: '12px' }}>
                  {[
                    { id: 'all', label: 'Alle' },
                    { id: 'rhythm', label: '🥁 Rhythmus' },
                    { id: 'technique', label: '🎹 Technik' },
                    { id: 'performance', label: '🎭 Ausdruck' }
                  ].map(cat => {
                    const isSelected = selectedCategoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat.id as any)}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          borderRadius: '10px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: 'none',
                          background: isSelected ? 'white' : 'transparent',
                          color: isSelected ? '#1f2937' : '#64748b',
                          boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all 0.15s'
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
                  {textbausteine
                    .filter((tb: any) => {
                      if (selectedCategoryFilter !== 'all' && tb.category !== selectedCategoryFilter) return false;
                      if (tbSearch.trim() !== '') {
                        const query = tbSearch.toLowerCase();
                        return tb.label.toLowerCase().includes(query) || tb.text.toLowerCase().includes(query);
                      }
                      return true;
                    })
                    .map((tb: any) => {
                      const badgeStyle = 
                        tb.type === 'songs' 
                          ? { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5', label: 'Songs' }
                          : tb.type === 'lehrwerke'
                            ? { bg: '#f5f3ff', text: '#6d28d9', border: '#ede9fe', label: 'Lehrwerke' }
                            : { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe', label: 'Beide' };

                      const isCurrentEditing = editingTextbaustein?.id === tb.id;

                      return (
                        <div 
                          key={tb.id} 
                          onClick={() => {
                            setEditingTextbaustein(tb);
                            setTbLabel(tb.label); // Note: useEffect will cleanly split label and selectedIcon!
                            setTbText(tb.text);
                            setTbType(tb.type);
                            setTbCategory(tb.category || 'rhythm');
                          }}
                          style={{ 
                            border: isCurrentEditing ? `2px solid ${brandColor}` : '1px solid #e2e8f0', 
                            borderRadius: '16px', 
                            padding: '14px', 
                            background: isCurrentEditing ? `${brandColor}05` : 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            opacity: tb.active ? 1 : 0.6,
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            cursor: 'pointer'
                          }}
                          className="hover-scale-mini"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', filter: 'grayscale(100%)' }}>
                              {tb.label}
                            </span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, background: badgeStyle.bg, color: badgeStyle.text, border: `1px solid ${badgeStyle.border}`, padding: '3px 8px', borderRadius: '8px' }}>
                              {badgeStyle.label}
                            </span>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', lineHeight: '1.4', fontWeight: 650 }}>
                            {tb.text}
                          </p>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px dashed #f1f5f9', paddingTop: '10px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTextbausteinActive(tb.id);
                              }}
                              style={{
                                background: tb.active ? '#e6f4ea' : '#f1f5f9',
                                color: tb.active ? '#34a853' : '#64748b',
                                border: tb.active ? '1px solid #e6f4ea' : '1px solid #e2e8f0',
                                padding: '6px 12px',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s'
                              }}
                            >
                              {tb.active ? '● Aktiv' : '○ Inaktiv'}
                            </button>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTextbaustein(tb);
                                  setTbLabel(tb.label);
                                  setTbText(tb.text);
                                  setTbType(tb.type);
                                  setTbCategory(tb.category || 'rhythm');
                                }}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '8px',
                                  transition: 'all 0.15s'
                                }}
                                className="hover-bg"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTextbaustein(tb.id);
                                }}
                                style={{
                                  background: '#fff1f2',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '8px',
                                  transition: 'all 0.15s'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {showEmojiPicker && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-label="Icon auswählen"
          style={{ position: 'fixed', inset: 0, zIndex: 7000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div className="animation-scale-up" style={{ background: '#ffffff', padding: '32px', borderRadius: '28px', maxWidth: '640px', width: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Icon auswählen</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Wähle ein passendes Icon für diesen Textbaustein</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEmojiPicker(false)}
                aria-label="Icon-Auswahl schließen"
                title="Schließen"
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(8, 1fr)', 
              gap: '10px', 
              background: '#f8fafc', 
              padding: '16px', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0', 
              overflowY: 'auto', 
              flex: 1 
            }}>
              {AVAILABLE_ICONS.filter(icon => {
                const usedIcons = textbausteine
                   .filter(tb => !editingTextbaustein || tb.id !== editingTextbaustein.id)
                   .map(tb => tb.label.split(' ')[0]);
                return !usedIcons.includes(icon);
              }).map(icon => {
                const isSelected = selectedIcon === icon;
                return (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      setSelectedIcon(icon);
                      setShowEmojiPicker(false);
                    }}
                    style={{
                      fontSize: '1.8rem',
                      padding: '10px',
                      borderRadius: '12px',
                      border: isSelected ? `2.5px solid ${brandColor}` : '2px solid transparent',
                      background: isSelected ? `${brandColor}15` : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {icon}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {previewingTextbaustein && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Textbaustein-Vorschau"
          style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '450px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: 'Inter, sans-serif'
          }}>
            <button
              type="button"
              onClick={() => onClosePreview?.()}
              aria-label="Vorschau schließen"
              title="Schließen"
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.8rem' }}>
                {previewingTextbaustein.label.split(' ')[0] && /\p{Emoji}/u.test(previewingTextbaustein.label.split(' ')[0])
                  ? previewingTextbaustein.label.split(' ')[0]
                  : '📝'}
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b', fontWeight: 900 }}>
                  {previewingTextbaustein.label.split(' ')[0] && /\p{Emoji}/u.test(previewingTextbaustein.label.split(' ')[0])
                    ? previewingTextbaustein.label.split(' ').slice(1).join(' ')
                    : previewingTextbaustein.label}
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Schnell-Text Vorlage</span>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              fontSize: '0.86rem',
              color: '#334155',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              maxHeight: '200px',
              overflowY: 'auto',
              fontFamily: 'monospace'
            }}>
              {previewingTextbaustein.text}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(previewingTextbaustein.text);
                  updateCopiedTbId(previewingTextbaustein.id);
                  alert('Vorlage in die Zwischenablage kopiert!');
                  onClosePreview?.();
                  setTimeout(() => updateCopiedTbId(null), 1000);
                }}
                style={{
                  flex: 1,
                  background: '#34a853',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <Copy size={16} />
                <span>In die Zwischenablage kopieren</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminTextbausteinModal;
