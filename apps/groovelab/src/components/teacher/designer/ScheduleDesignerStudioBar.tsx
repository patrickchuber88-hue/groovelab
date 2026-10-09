import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Copy,
  RotateCcw,
  CalendarPlus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Grid3X3,
  MoreVertical,
  Send,
  Upload,
  Sparkles,
  ChevronDown,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { DayBoard } from '../../../domain/schedule/scheduleBoardTypes';

export type { DayBoard };

export interface ScheduleDraft {
  id: string;
  name: string;
  boards: DayBoard[];
}

export interface ScheduleDesignerStudioBarProps {
  drafts: ScheduleDraft[];
  activeDraftId: string;
  submittedDraftId: string;
  isSecretaryWorkspace: boolean;
  selectedTeacherId: string;
  userId: string;
  gridSnapMinutes: number;
  showRealNames: boolean;
  brandColor?: string;
  undoCount: number;
  unassignedCount: number;
  assignedCount: number;
  totalBoardsCount: number;
  onSwitchDraft: (draftId: string) => void;
  onCreateDraftWithMode: (mode: 'duplicate_with_students' | 'duplicate_empty' | 'fresh_setup') => void;
  onRenameDraft: (draftId: string, newName: string) => void;
  onDeleteDraft: (draftId: string) => void;
  onChangeGridSnap: (minutes: number) => void;
  onToggleRealNames: () => void;
  onEditAvailability: () => void;
  onAddDayBoard?: () => void;
  onAutoAssign: () => void;
  onUndo: () => void;
  onResetAllAssignments: () => void;
  onDeleteAllBoards: () => void;
  onCopyOnboardingLink: () => void;
  onRestoreFromPdf: () => void;
  onHardResetSystem: () => void;
}

export const ScheduleDesignerStudioBar: React.FC<ScheduleDesignerStudioBarProps> = ({
  drafts,
  activeDraftId,
  submittedDraftId,
  isSecretaryWorkspace,
  selectedTeacherId,
  userId,
  gridSnapMinutes,
  showRealNames,
  brandColor = '#34a853',
  undoCount,
  unassignedCount,
  assignedCount,
  totalBoardsCount,
  onSwitchDraft,
  onCreateDraftWithMode,
  onRenameDraft,
  onDeleteDraft,
  onChangeGridSnap,
  onToggleRealNames,
  onEditAvailability,
  onAddDayBoard,
  onAutoAssign,
  onUndo,
  onResetAllAssignments,
  onDeleteAllBoards,
  onCopyOnboardingLink,
  onRestoreFromPdf,
  onHardResetSystem
}) => {
  // Dropdown states
  const [showNewDraftDropdown, setShowNewDraftDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editDraftNameInput, setEditDraftNameInput] = useState('');

  const newDraftBtnRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (newDraftBtnRef.current && !newDraftBtnRef.current.contains(e.target as Node)) {
        setShowNewDraftDropdown(false);
      }
      if (moreBtnRef.current && !moreBtnRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Auto-focus input when editing draft name
  useEffect(() => {
    if (editingDraftId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingDraftId]);

  const handleStartRename = (draft: ScheduleDraft) => {
    setEditingDraftId(draft.id);
    setEditDraftNameInput(draft.name);
  };

  const handleSaveRename = () => {
    if (editingDraftId && editDraftNameInput.trim()) {
      onRenameDraft(editingDraftId, editDraftNameInput.trim());
    }
    setEditingDraftId(null);
  };

  const handleCancelRename = () => {
    setEditingDraftId(null);
  };

  return (
    <div
      role="toolbar"
      aria-label="Stundenplan-Designer Werkzeugleiste"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px) saturate(190%)',
        WebkitBackdropFilter: 'blur(20px) saturate(190%)',
        borderRadius: '14px',
        padding: '5px 12px',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'nowrap',
        position: 'relative',
        zIndex: 40,
        height: '42px',
        boxSizing: 'border-box'
      }}
    >
      {/* ── LEFT: DRAFT STUDIO (TABS + PROMINENT ADD BUTTON) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
        <span style={{ 
          fontSize: '0.68rem', 
          fontWeight: 800, 
          color: '#64748b', 
          textTransform: 'uppercase', 
          letterSpacing: '0.04em', 
          fontFamily: 'Urbanist, sans-serif'
        }}>
          Entwürfe:
        </span>

        {/* Drafts Segmented Pill Group */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.04)',
          borderRadius: '10px',
          padding: '2px',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          gap: '2px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          maxWidth: '100%'
        }}>
          {drafts.map(d => {
            const isActive = d.id === activeDraftId;
            const isSubmitted = d.id === submittedDraftId;
            const totalLessons = d.boards?.reduce((acc, b) => acc + (b.students?.length || 0), 0) || 0;

            if (editingDraftId === d.id) {
              return (
                <div
                  key={d.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '2px 6px',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
                    gap: '4px'
                  }}
                >
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editDraftNameInput}
                    onChange={e => setEditDraftNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      outline: 'none',
                      width: '100px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveRename}
                    title="Speichern"
                    aria-label="Speichern"
                    style={{ border: 'none', background: 'transparent', color: '#16a34a', cursor: 'pointer', padding: '2px' }}
                  >
                    <Check size={12} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelRename}
                    title="Abbrechen"
                    aria-label="Abbrechen"
                    style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={d.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: isActive ? '#ffffff' : 'transparent',
                  borderRadius: '8px',
                  boxShadow: isActive ? '0 1px 4px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)' : 'none',
                  transition: 'all 0.16s ease',
                  flexShrink: 0
                }}
              >
                <button
                  type="button"
                  onClick={() => onSwitchDraft(d.id)}
                  style={{
                    background: 'transparent',
                    color: isActive ? '#0f172a' : '#64748b',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px 8px',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 800 : 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                  title={`Zu ${d.name} wechseln`}
                >
                  <span>{d.name}</span>
                  {isSubmitted && (
                    <span
                      title="Verbindlich eingereichter / live Stundenplan"
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#22c55e',
                        display: 'inline-block',
                        boxShadow: 'none',
                        flexShrink: 0
                      }}
                    />
                  )}
                  <span style={{
                    background: isActive ? 'rgba(0, 0, 0, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                    borderRadius: '6px',
                    padding: '1px 5px',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    color: isActive ? '#0f172a' : '#94a3b8',
                    flexShrink: 0
                  }}>
                    {totalLessons}
                  </span>
                </button>

                {/* Actions on Active Tab: Rename & Delete */}
                {isActive && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', paddingRight: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleStartRename(d)}
                      title="Entwurf umbenennen"
                      aria-label="Entwurf umbenennen"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px 3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.color = '#0f172a'}
                      onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                      <Edit2 size={11} />
                    </button>
                    {drafts.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDraft(d.id);
                        }}
                        title={`Entwurf „${d.name}“ löschen`}
                        aria-label={`Entwurf „${d.name}“ löschen`}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '4px 3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.15s ease'
                        }}
                        onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 🌟 HERO ACTION BUTTON: [+ Neuer Entwurf ▾] */}
        <div ref={newDraftBtnRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowNewDraftDropdown(prev => !prev)}
            aria-expanded={showNewDraftDropdown}
            aria-haspopup="menu"
            style={{
              background: showNewDraftDropdown 
                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' 
                : 'rgba(34, 197, 94, 0.10)',
              color: showNewDraftDropdown ? '#ffffff' : '#15803d',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              padding: '4px 9px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: 'none',
              transition: 'all 0.16s ease'
            }}
            onMouseOver={e => {
              if (!showNewDraftDropdown) {
                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.16)';
              }
            }}
            onMouseOut={e => {
              if (!showNewDraftDropdown) {
                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.10)';
              }
            }}
          >
            <Plus size={13} strokeWidth={2.6} />
            <span>Neuer Entwurf</span>
            <ChevronDown size={11} strokeWidth={2.4} style={{ opacity: 0.8 }} />
          </button>

          {/* Floating Apple Glass Dropdown Menu */}
          {showNewDraftDropdown && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 1100,
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(25px) saturate(190%)',
                WebkitBackdropFilter: 'blur(25px) saturate(190%)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '14px',
                padding: '6px',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.16)',
                minWidth: '260px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}
            >
              <div style={{ padding: '4px 10px', fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Entwurf-Optionen
              </div>

              {/* Option 1: Duplizieren mit Schülern */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowNewDraftDropdown(false);
                  onCreateDraftWithMode('duplicate_with_students');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '9px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Copy size={14} />
                </div>
                <div>
                  <div style={{ fontWeight: 800 }}>Entwurf duplizieren</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Übernimmt Zeiten und gesetzte Schüler für Varianten</div>
                </div>
              </button>

              {/* Option 2: Zeiten behalten, Schüler leeren */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowNewDraftDropdown(false);
                  onCreateDraftWithMode('duplicate_empty');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '9px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RotateCcw size={14} />
                </div>
                <div>
                  <div style={{ fontWeight: 800 }}>Neuer Versuch</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Behält Wochentage, leert Schüler für neue Auto-Zuteilung</div>
                </div>
              </button>

              {/* Option 3: Komplett neu */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowNewDraftDropdown(false);
                  onCreateDraftWithMode('fresh_setup');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '9px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarPlus size={14} />
                </div>
                <div>
                  <div style={{ fontWeight: 800 }}>Komplett neu starten</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Öffnet die Einrichtung neuer Unterrichtstage</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── CENTER: APPLE CANVAS PREFERENCES (RASTER & DATENSCHUTZ) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {/* Magnet-Raster Selector mit semantischem Info-Tooltip */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '5px', 
            background: 'rgba(0, 0, 0, 0.04)', 
            border: '1px solid rgba(0, 0, 0, 0.05)', 
            borderRadius: '8px', 
            padding: '3px 8px', 
            height: '28px',
            boxSizing: 'border-box'
          }} 
          title="Magnetisches Raster für Unterrichtstermine • Grün = Wunschzeit erfüllt • Weiß = Ausweichzeit"
        >
          <Grid3X3 size={12} style={{ color: brandColor }} />
          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Raster:
          </span>
          <select
            value={gridSnapMinutes}
            onChange={(e) => onChangeGridSnap(Number(e.target.value))}
            style={{ 
              border: 'none', 
              fontSize: '0.74rem', 
              fontWeight: 800, 
              color: '#0f172a', 
              background: 'transparent', 
              outline: 'none', 
              cursor: 'pointer', 
              padding: 0 
            }}
          >
            <option value={15}>15 Min</option>
            <option value={30}>30 Min</option>
            <option value={60}>60 Min</option>
          </select>
        </div>

        {/* Apple Segment Button: Namen schützen / anzeigen */}
        <button
          type="button"
          onClick={onToggleRealNames}
          style={{
            background: showRealNames ? 'rgba(52, 168, 83, 0.12)' : 'rgba(0, 0, 0, 0.04)',
            border: showRealNames ? '1px solid rgba(52, 168, 83, 0.25)' : '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: '8px',
            padding: '3px 9px',
            height: '28px',
            color: showRealNames ? '#15803d' : '#475569',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
            transition: 'all 0.15s ease'
          }}
          title={showRealNames ? "Schüler-Nachnamen sind gekürzt (Datenschutz aktiv)" : "Vollständige Schülernamen anzeigen"}
        >
          {showRealNames ? <EyeOff size={12} /> : <Eye size={12} />}
          <span>{showRealNames ? "Namen geschützt" : "Namen anzeigen"}</span>
        </button>
      </div>

      {/* ── RIGHT: PRIMARY ACTIONS & UNIFIED APPLE MORE MENU ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
        {/* Undo Button (Subtil, nur aktiv wenn Historie existiert) */}
        <button
          type="button"
          onClick={onUndo}
          disabled={undoCount === 0}
          style={{
            background: undoCount > 0 ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
            border: undoCount > 0 ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid transparent',
            borderRadius: '8px',
            height: '28px',
            padding: '0 8px',
            color: undoCount > 0 ? '#0f172a' : '#cbd5e1',
            cursor: undoCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '0.72rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxSizing: 'border-box',
            transition: 'all 0.15s ease'
          }}
          title={undoCount > 0 ? `Letzte Aktion rückgängig machen (⌘Z) – ${undoCount} im Speicher` : "Keine Aktionen zum Rückgängig machen"}
        >
          <RotateCcw size={12} strokeWidth={2.4} />
          <span>{undoCount > 0 ? `(${undoCount})` : ''}</span>
        </button>

        {/* 🌟 HERO FLAGGSCHIFF: Automatisch zuteilen (Apple Green Pill) */}
        {unassignedCount > 0 && (
          <button
            type="button"
            onClick={onAutoAssign}
            style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '0.74rem',
              height: '28px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
              boxSizing: 'border-box',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'none'}
            title="Universitäre 4-Phasen-Auto-Zuteilung starten"
          >
            <Sparkles size={12} strokeWidth={2.4} style={{ color: 'currentColor' }} />
            <span>Automatisch zuteilen ({unassignedCount})</span>
          </button>
        )}

        {/* ── UNIFIED APPLE MORE MENU [ ⋯ Optionen ] ── */}
        <div ref={moreBtnRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowMoreMenu(prev => !prev)}
            aria-expanded={showMoreMenu}
            aria-haspopup="menu"
            style={{
              background: showMoreMenu ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: '8px',
              height: '28px',
              padding: '0 8px',
              color: '#334155',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxSizing: 'border-box',
              transition: 'all 0.15s ease'
            }}
            title="Weitere Aktionen, Einstellungen & Werkzeuge"
          >
            <MoreVertical size={13} />
            <span>Optionen</span>
          </button>

          {showMoreMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(25px) saturate(190%)',
              WebkitBackdropFilter: 'blur(25px) saturate(190%)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '14px',
              padding: '6px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.16)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              zIndex: 1100,
              minWidth: '240px'
            }}>
              {/* Bereich 1: Zeiten & Tage */}
              <div style={{ padding: '4px 10px 2px 10px', fontSize: '0.64rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Unterrichtstage
              </div>
              {!isSecretaryWorkspace && selectedTeacherId === userId ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onEditAvailability();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Clock size={13} />
                  <span>Unterrichtszeiten & Tage anpassen</span>
                </button>
              ) : (
                onAddDayBoard && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onAddDayBoard();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Plus size={13} />
                    <span>Weiteren Unterrichtstag anlegen</span>
                  </button>
                )
              )}

              <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '3px 0' }} />

              {/* Bereich 2: Aufräumen & Zurücksetzen (Destruktiv geschützt) */}
              <div style={{ padding: '4px 10px 2px 10px', fontSize: '0.64rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Zuteilung & Board
              </div>
              <button
                type="button"
                disabled={assignedCount === 0}
                onClick={() => {
                  setShowMoreMenu(false);
                  onResetAllAssignments();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: assignedCount > 0 ? '#0f172a' : '#cbd5e1',
                  cursor: assignedCount > 0 ? 'pointer' : 'not-allowed',
                  textAlign: 'left'
                }}
                onMouseOver={e => { if (assignedCount > 0) e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)'; }}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <RotateCcw size={13} />
                <span>Schüler vom Board zurücksetzen ({assignedCount})</span>
              </button>

              <button
                type="button"
                disabled={totalBoardsCount === 0}
                onClick={() => {
                  setShowMoreMenu(false);
                  onDeleteAllBoards();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: totalBoardsCount > 0 ? '#dc2626' : '#cbd5e1',
                  cursor: totalBoardsCount > 0 ? 'pointer' : 'not-allowed',
                  textAlign: 'left'
                }}
                onMouseOver={e => { if (totalBoardsCount > 0) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 size={13} />
                <span>Alle Unterrichtstage leeren</span>
              </button>

              <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '3px 0' }} />

              {/* Bereich 3: Teilen & Sicherung */}
              <div style={{ padding: '4px 10px 2px 10px', fontSize: '0.64rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Teilen & Backup
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onCopyOnboardingLink();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <Send size={13} />
                <span>Schüler-Onboarding-Link kopieren</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onRestoreFromPdf();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <Upload size={13} />
                <span>PDF-Backup wiederherstellen</span>
              </button>

              <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '3px 0' }} />

              {/* Bereich 4: Notfall-Reset */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onHardResetSystem();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  border: 'none',
                  background: 'rgba(239, 68, 68, 0.06)',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: '#ef4444',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'}
              >
                <AlertTriangle size={13} />
                <span>System-Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
