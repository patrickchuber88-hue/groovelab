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
        borderRadius: '16px',
        padding: '8px 14px',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}
    >
      {/* ── LEFT: DRAFT STUDIO (TABS + PROMINENT ADD BUTTON) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1 }}>
        <span style={{ 
          fontSize: '0.70rem', 
          fontWeight: 800, 
          color: '#64748b', 
          textTransform: 'uppercase', 
          letterSpacing: '0.04em', 
          fontFamily: 'Urbanist, sans-serif', 
          flexShrink: 0 
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

                {/* Edit / Rename Icon on Active Tab */}
                {isActive && (
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
                      padding: '4px 6px 4px 2px',
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
                )}
              </div>
            );
          })}
        </div>

        {/* 🌟 HERO ACTION BUTTON: [+ Neuer Entwurf ▾] */}
        <div ref={newDraftBtnRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowNewDraftDropdown(prev => !prev)}
            aria-expanded={showNewDraftDropdown}
            aria-haspopup="menu"
            style={{
              background: showNewDraftDropdown 
                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' 
                : 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(22, 163, 74, 0.08) 100%)',
              color: showNewDraftDropdown ? '#ffffff' : '#15803d',
              border: '1.5px solid rgba(34, 197, 94, 0.35)',
              borderRadius: '9px',
              padding: '5px 11px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: 'none',
              transition: 'all 0.16s ease',
              flexShrink: 0
            }}
            onMouseOver={e => {
              if (!showNewDraftDropdown) {
                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.18)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={e => {
              if (!showNewDraftDropdown) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(22, 163, 74, 0.08) 100%)';
                e.currentTarget.style.transform = 'none';
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
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.14)',
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

      {/* ── CENTER: CANVAS TOOLS (MAGNET-RASTER, DATENSCHUTZ, ZEITEN, MEHR) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Magnet-Raster Selector */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'rgba(255,255,255,0.9)', 
            border: '1px solid rgba(0,0,0,0.08)', 
            borderRadius: '9px', 
            padding: '3px 8px', 
            minHeight: '32px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)' 
          }} 
          title="Magnetisches Zeilen-Raster für Unterrichtstermine"
        >
          <Grid3X3 size={13} style={{ color: brandColor }} />
          <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Raster:
          </span>
          <select
            value={gridSnapMinutes}
            onChange={(e) => onChangeGridSnap(Number(e.target.value))}
            style={{ 
              border: 'none', 
              fontSize: '0.76rem', 
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

        {/* Wunsch / Ausweich Legende */}
        <div 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'rgba(255,255,255,0.9)', 
            border: '1px solid rgba(0,0,0,0.08)', 
            borderRadius: '9px', 
            padding: '3px 8px', 
            minHeight: '32px' 
          }} 
          title="Farb-Semantik im Designer: Grün = Schüler-Wunschzeit erfüllt • Weiß = Ausweichzeit"
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, color: '#15803d' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            ★ Wunsch
          </span>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ffffff', border: '1.5px solid #cbd5e1', display: 'inline-block' }} />
            ○ Ausweich
          </span>
        </div>

        {/* Apple HIG Button Group */}
        <div className="apple-btn-group" style={{ height: '32px' }}>
          {/* Namen schützen / anzeigen */}
          <button
            type="button"
            onClick={onToggleRealNames}
            className={`apple-btn ${showRealNames ? 'active' : ''}`}
            style={{ color: showRealNames ? brandColor : undefined, fontSize: '0.74rem', padding: '0 8px' }}
            title={showRealNames ? "Schüler-Nachnamen sind gekürzt (Datenschutz aktiv)" : "Vollständige Schülernamen anzeigen"}
          >
            {showRealNames ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>{showRealNames ? "Namen schützen" : "Namen anzeigen"}</span>
          </button>

          <div style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.08)', margin: '0 2px' }} />

          {/* Zeiten ändern */}
          {!isSecretaryWorkspace && selectedTeacherId === userId ? (
            <button
              type="button"
              onClick={onEditAvailability}
              className="apple-btn"
              style={{ fontSize: '0.74rem', padding: '0 8px' }}
              title="Unterrichtszeiten & Wunschtage der Lehrkraft anpassen"
            >
              <Clock size={12} />
              <span>Zeiten ändern</span>
            </button>
          ) : (
            onAddDayBoard && (
              <button
                type="button"
                onClick={onAddDayBoard}
                className="apple-btn"
                style={{ fontSize: '0.74rem', padding: '0 8px' }}
                title="Weiteren Unterrichtstag hinzufügen"
              >
                <Plus size={12} />
                <span>Tag anlegen</span>
              </button>
            )
          )}

          <div style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.08)', margin: '0 2px' }} />

          {/* Mehr Dropdown */}
          <div ref={moreBtnRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowMoreMenu(prev => !prev)}
              className={`apple-btn ${showMoreMenu ? 'active' : ''}`}
              style={{ fontSize: '0.74rem', padding: '0 8px' }}
              title="Weitere Optionen & Datensicherung"
            >
              <MoreVertical size={12} />
              <span>Mehr</span>
            </button>

            {showMoreMenu && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px) saturate(190%)',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '12px',
                padding: '5px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                zIndex: 1100,
                minWidth: '220px'
              }}>
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
                    padding: '8px 10px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: '#1d1d1f',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Send size={13} />
                  <span>Onboarding-Link kopieren</span>
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
                    padding: '8px 10px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: '#1d1d1f',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Upload size={13} />
                  <span>PDF-Backup wiederherstellen</span>
                </button>

                {drafts.length > 1 && (
                  <>
                    <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '3px 0' }} />
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onDeleteDraft(activeDraftId);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        color: '#b91c1c',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 size={13} />
                      <span>Aktuellen Entwurf löschen</span>
                    </button>
                  </>
                )}

                <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '3px 0' }} />

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
                    padding: '8px 10px',
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.08)',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: '#ef4444',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                >
                  <AlertTriangle size={13} />
                  <span>System-Reset</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: PRIMARY AUTO-ASSIGN & UNDO TOOLBAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
        {/* 🌟 HERO FLAGGSCHIFF: Automatisch zuteilen */}
        <button
          type="button"
          onClick={onAutoAssign}
          disabled={unassignedCount === 0}
          title={unassignedCount === 0 ? "Alle Schüler sind bereits eingeteilt" : "Universitäre 4-Phasen-Auto-Zuteilung starten"}
          style={{
            background: unassignedCount === 0
              ? 'rgba(0, 0, 0, 0.04)'
              : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            color: unassignedCount === 0 ? '#94a3b8' : '#ffffff',
            border: unassignedCount === 0 ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(22, 163, 74, 0.4)',
            fontWeight: 800,
            padding: '6px 14px',
            borderRadius: '9px',
            fontSize: '0.76rem',
            cursor: unassignedCount === 0 ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: unassignedCount === 0
              ? 'none'
              : '0 3px 12px rgba(22, 163, 74, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)',
            transition: 'all 0.16s ease',
            pointerEvents: unassignedCount === 0 ? 'none' : 'auto'
          }}
          onMouseOver={e => {
            if (unassignedCount > 0) {
              e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
            }
          }}
          onMouseOut={e => {
            if (unassignedCount > 0) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
            }
          }}
        >
          <Sparkles size={13} strokeWidth={2.4} />
          <span>Automatisch zuteilen</span>
        </button>

        {/* Apple HIG Button Group (Rückgängig | Zurücksetzen | Löschen) */}
        <div className="apple-btn-group" style={{ height: '32px' }}>
          {/* Rückgängig */}
          <button
            type="button"
            onClick={onUndo}
            disabled={undoCount === 0}
            className="apple-btn"
            style={{
              opacity: undoCount > 0 ? 1 : 0.45,
              cursor: undoCount > 0 ? 'pointer' : 'not-allowed',
              color: undoCount > 0 ? '#0f172a' : '#94a3b8',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title={undoCount > 0 ? `Letzte Verschiebung rückgängig machen (⌘Z) – ${undoCount} im Speicher` : "Keine Änderungen zum Rückgängig machen"}
          >
            <RotateCcw size={11} strokeWidth={2.4} />
            <span>Rückgängig{undoCount > 0 ? ` (${undoCount})` : ''}</span>
          </button>

          <div style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.08)', margin: '0 2px' }} />

          {/* Zuteilung zurücksetzen */}
          <button
            type="button"
            onClick={onResetAllAssignments}
            disabled={assignedCount === 0}
            className="apple-btn"
            style={{
              opacity: assignedCount > 0 ? 1 : 0.45,
              cursor: assignedCount > 0 ? 'pointer' : 'not-allowed',
              color: assignedCount > 0 ? '#0f172a' : '#94a3b8',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title={assignedCount > 0 ? "Alle Schüler vom Board in die Seitenleiste zurücksetzen" : "Keine eingeteilten Schüler zum Zurücksetzen"}
          >
            <RotateCcw size={11} strokeWidth={2.4} />
            <span>Zurücksetzen</span>
          </button>

          <div style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.08)', margin: '0 2px' }} />

          {/* Alle Tage löschen */}
          <button
            type="button"
            onClick={onDeleteAllBoards}
            disabled={totalBoardsCount === 0}
            className="apple-btn"
            style={{
              opacity: totalBoardsCount > 0 ? 1 : 0.45,
              cursor: totalBoardsCount > 0 ? 'pointer' : 'not-allowed',
              color: totalBoardsCount > 0 ? '#ef4444' : '#94a3b8',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title={totalBoardsCount > 0 ? "Alle Unterrichtstage leeren & von vorne beginnen" : "Keine Tage vorhanden"}
          >
            <Trash2 size={11} strokeWidth={2.4} />
            <span>Löschen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
