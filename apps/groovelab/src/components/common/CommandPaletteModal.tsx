import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  User,
  BookOpen,
  Plus,
  DoorOpen,
  Sparkles,
  Layers,
  Music,
  Zap,
  Mic,
  SlidersHorizontal,
  Calendar,
  Command,
  ArrowRight
} from 'lucide-react';
import { maskStudentName } from '../../services/notesService';

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: any;
  shortcut?: string;
  onSelect: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStudents?: any[];
  onOpenNotesBoard?: () => void;
  onOpenQuickNote?: () => void;
  onOpenStudentHomework?: (student: any) => void;
  onOpenSchedule?: () => void;
  onOpenRoomPlanner?: () => void;
  onOpenMeisterwerk?: () => void;
  onOpenGrooveLab?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  allStudents = [],
  onOpenNotesBoard,
  onOpenQuickNote,
  onOpenStudentHomework,
  onOpenSchedule,
  onOpenRoomPlanner,
  onOpenMeisterwerk,
  onOpenGrooveLab
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global ⌘K trigger listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Command items builder
  const allItems: CommandItem[] = useMemo(() => {
    const actions: CommandItem[] = [
      {
        id: 'action-quick-note',
        title: 'Neue Notiz / To-Do erfassen',
        subtitle: 'Schnellnotiz, @Schüler, !Raum oder Checkbox',
        category: 'Aktionen',
        icon: Plus,
        shortcut: '⌘N',
        onSelect: () => {
          onClose();
          onOpenQuickNote?.();
        }
      },
      {
        id: 'action-notes-board',
        title: 'Notizen-Board öffnen',
        subtitle: 'Kanban-Board, Dichte Liste & Schüler-Pivot',
        category: 'Aktionen',
        icon: Layers,
        shortcut: '⌘J',
        onSelect: () => {
          onClose();
          onOpenNotesBoard?.();
        }
      },
      {
        id: 'action-meisterwerk',
        title: 'Meisterwerk-Dokumentation',
        subtitle: 'Protokoll, Play-Along Studio & Fortschritte',
        category: 'Aktionen',
        icon: Sparkles,
        onSelect: () => {
          onClose();
          onOpenMeisterwerk?.();
        }
      },
      {
        id: 'action-room',
        title: 'Raumplaner & Equipment',
        subtitle: 'Raumbelegung und Mängel prüfen',
        category: 'Aktionen',
        icon: DoorOpen,
        onSelect: () => {
          onClose();
          onOpenRoomPlanner?.();
        }
      },
      {
        id: 'action-schedule',
        title: 'Stundenplan-Designer',
        subtitle: 'Unterrichtszeiten & Terminänderungen',
        category: 'Aktionen',
        icon: Calendar,
        onSelect: () => {
          onClose();
          onOpenSchedule?.();
        }
      },
      {
        id: 'action-groovelab',
        title: 'GrooveLab Modul öffnen',
        subtitle: 'Bands, Songs & Repertoire-Planer',
        category: 'Aktionen',
        icon: Music,
        onSelect: () => {
          onClose();
          onOpenGrooveLab?.();
        }
      }
    ];

    const studentItems: CommandItem[] = allStudents.map(student => ({
      id: `student-${student.id}`,
      title: maskStudentName(student.first_name || student.name || 'Schüler') || 'Schüler',
      subtitle: `${student.instrument || 'Instrument'} • Hausaufgabenheft öffnen`,
      category: 'Schüler & Aufgabenheft',
      icon: User,
      onSelect: () => {
        onClose();
        onOpenStudentHomework?.(student);
      }
    }));

    return [...actions, ...studentItems];
  }, [allStudents, onClose, onOpenNotesBoard, onOpenQuickNote, onOpenStudentHomework, onOpenSchedule, onOpenRoomPlanner, onOpenMeisterwerk, onOpenGrooveLab]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 8);
    const q = query.toLowerCase().trim();
    return allItems
      .filter(item => (item.title || '').toLowerCase().includes(q) || (item.subtitle || '').toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [allItems, query]);

  // Keyboard navigation inside Command Palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(filteredItems.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Search size={18} color="#94a3b8" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Befehl, Schüler (@Jonah) oder Aktion suchen..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#0f172a'
            }}
          />
          <kbd style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '2px 6px',
            fontSize: '0.64rem',
            fontFamily: 'monospace',
            color: '#64748b',
            fontWeight: 700
          }}>
            ESC
          </kbd>
        </div>

        {/* Results Stream */}
        <div style={{
          maxHeight: '380px',
          overflowY: 'auto',
          padding: '8px'
        }} className="custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              Keine Treffer für „{query}“ gefunden
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = selectedIndex === index;
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: isSelected ? '#f8fafc' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                    boxShadow: isSelected ? 'inset 0 0 0 1px #e2e8f0' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: isSelected ? '#0f172a' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.12s ease'
                    }}>
                      <IconComp size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 750, color: '#0f172a' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 550 }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.shortcut && (
                      <kbd style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        padding: '1px 5px',
                        fontSize: '0.62rem',
                        fontFamily: 'monospace',
                        color: '#64748b'
                      }}>
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight size={13} color="#0f172a" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint Bar */}
        <div style={{
          padding: '8px 16px',
          background: '#f8fafc',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.68rem',
          color: '#94a3b8',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>↑↓ Navigieren</span>
            <span>↵ Auswählen</span>
            <span>ESC Schließen</span>
          </div>
          <span>Campus-Groovelab Spotlight</span>
        </div>
      </div>
    </div>
  );
};
