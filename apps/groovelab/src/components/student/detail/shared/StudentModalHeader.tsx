import React, { useState } from 'react';
import { X, Calendar, Pencil, Eye, EyeOff, Award, QrCode, Trophy } from 'lucide-react';
import { formatSingleStudentAnonymized } from '../../../../utils/nameHelper';

export interface StudentModalHeaderProps {
  mode: 'admin' | 'teacher';
  student: any;
  firstName: string;
  lastName: string;
  displayAvatarSrc: string;
  memberSince: string;
  activeColor: string;
  isPlatformCampus?: boolean;
  groupStudents?: any[];
  isLastNameRevealedLocally?: boolean;
  onToggleLastNameRevealed?: () => void;
  onSaveName?: (newFirst: string, newLast: string) => Promise<void>;
  onOpenIDCard?: () => void;
  onQuickQr?: () => void;
  onClose: () => void;
}

export const StudentModalHeader: React.FC<StudentModalHeaderProps> = ({
  mode,
  student,
  firstName,
  lastName,
  displayAvatarSrc,
  memberSince,
  activeColor,
  groupStudents = [],
  isLastNameRevealedLocally = false,
  onToggleLastNameRevealed,
  onSaveName,
  onOpenIDCard,
  onQuickQr,
  onClose,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editFirst, setEditFirst] = useState(firstName);
  const [editLast, setEditLast] = useState(lastName);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setEditFirst(firstName);
    setEditLast(lastName);
  }, [firstName, lastName]);

  const handleStartEdit = () => {
    setEditFirst(firstName);
    setEditLast(lastName);
    setIsEditingName(true);
  };

  const handleSave = async () => {
    if (!editFirst.trim() || !editLast.trim()) {
      alert('Vor- und Nachname dürfen nicht leer sein.');
      return;
    }
    if (onSaveName) {
      try {
        setIsSaving(true);
        await onSaveName(editFirst.trim(), editLast.trim());
        setIsEditingName(false);
      } catch (err: any) {
        alert('Fehler beim Speichern: ' + err.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div
      className="student-detail-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '24px',
        position: 'relative'
      }}
    >
      {/* Left: Avatar & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, minWidth: 0 }}>
        <div
          style={{
            position: 'relative',
            width: '68px',
            height: '68px',
            borderRadius: '22px',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
            border: `2px solid ${activeColor}`
          }}
        >
          <img
            src={displayAvatarSrc}
            alt={firstName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e: any) => { e.target.src = '/avatars/gitarre_avatar_new.png'; }}
          />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          {isEditingName && mode === 'admin' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={editFirst}
                onChange={(e) => setEditFirst(e.target.value)}
                placeholder="Vorname"
                aria-label="Vorname"
                style={{
                  padding: '6px 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  outline: 'none',
                  color: '#0f172a'
                }}
              />
              <input
                type="text"
                value={editLast}
                onChange={(e) => setEditLast(e.target.value)}
                placeholder="Nachname"
                aria-label="Nachname"
                style={{
                  padding: '6px 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  outline: 'none',
                  color: '#0f172a'
                }}
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                aria-label="Geänderten Namen speichern"
                style={{
                  background: '#34a853',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                aria-label="Namensbearbeitung abbrechen"
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <h2
              style={{
                fontSize: '1.55rem',
                fontWeight: 950,
                color: '#1e293b',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                letterSpacing: '-0.02em',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <span>
                {mode === 'admin' ? (
                  `${firstName} ${lastName}`.trim()
                ) : isLastNameRevealedLocally ? (
                  `${firstName} ${lastName}`.trim()
                ) : (
                  formatSingleStudentAnonymized(firstName, lastName, student?.id, true)
                )}
                {groupStudents.length > 0 && (
                  <span style={{ color: '#3b82f6', fontWeight: 800 }}>
                    {groupStudents
                      .map((g) =>
                        ` & ${
                          mode === 'admin' || isLastNameRevealedLocally
                            ? `${g.first_name || ''} ${g.last_name || ''}`.trim()
                            : formatSingleStudentAnonymized(g.first_name, g.last_name, g.id, true)
                        }`
                      )
                      .join('')}
                  </span>
                )}
              </span>

              {groupStudents.length > 0 && (
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: '12px'
                  }}
                >
                  👥 Partner-Gruppe
                </span>
              )}

              {/* Mode-specific actions next to name */}
              {mode === 'teacher' && onToggleLastNameRevealed && (
                <button
                  type="button"
                  onClick={onToggleLastNameRevealed}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: isLastNameRevealedLocally ? '#3b82f6' : '#94a3b8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    borderRadius: '50%',
                    transition: 'all 0.15s ease'
                  }}
                  title={
                    isLastNameRevealedLocally
                      ? 'Nachnamen verbergen (Anonymisiert)'
                      : 'Nachnamen enthüllen (Klarname zur Anwesenheitskontrolle)'
                  }
                  className="hover-scale-mini"
                  aria-label="Nachname Unmaskieren"
                >
                  {isLastNameRevealedLocally ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}

              {mode === 'admin' && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    borderRadius: '50%',
                    transition: 'all 0.15s ease'
                  }}
                  title="Stammdaten: Vorname & Nachname korrigieren"
                  className="hover-scale-mini"
                  aria-label="Name bearbeiten"
                >
                  <Pencil size={15} />
                </button>
              )}
            </h2>
          )}

          {/* Subtitle / Badges */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#64748b', fontWeight: 650 }}>
              <Calendar size={14} /> Member seit {memberSince}
            </div>

            {student?.nickname && (
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '3px 10px',
                  borderRadius: '100px',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Aktueller Musiker-Nickname für Ranglisten & Hall of Groove"
              >
                <Trophy size={11} color="#d97706" />
                <span>Nickname: {student.nickname}</span>
              </span>
            )}

            {mode === 'admin' && (
              <span
                style={{
                  background: student?.status === 'pausiert' ? '#fef3c7' : student?.status === 'inaktiv' ? '#fee2e2' : '#e6f4ea',
                  color: student?.status === 'pausiert' ? '#b45309' : student?.status === 'inaktiv' ? '#dc2626' : '#15803d',
                  padding: '3px 10px',
                  borderRadius: '100px',
                  fontSize: '0.72rem',
                  fontWeight: 900
                }}
              >
                {student?.status === 'pausiert' ? '⏸️ Vertrag pausiert' : student?.status === 'inaktiv' ? '🛑 Vertrag inaktiv' : '✓ Vertrag aktiv'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Action & Close */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {mode === 'admin' && onOpenIDCard && (
          <button
            type="button"
            onClick={onOpenIDCard}
            aria-label="Schülerausweis drucken"
            style={{
              background: '#ffffff',
              color: '#ea4335',
              border: '1.5px solid #ea4335',
              borderRadius: '14px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
            className="hover-scale"
            title="Schülerausweis / Campus Pass drucken"
          >
            <Award size={15} />
            <span>Ausweis drucken</span>
          </button>
        )}

        {mode === 'teacher' && onQuickQr && (
          <button
            type="button"
            onClick={onQuickQr}
            aria-label="Ausweis-QR für Schüler-Handy anzeigen"
            style={{
              background: '#f0fdf4',
              color: '#15803d',
              border: '1.5px solid #86efac',
              borderRadius: '14px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
            className="hover-scale"
            title="Ausweis-QR für Schüler-Handy vorzeigen"
          >
            <QrCode size={15} />
            <span>Ausweis-QR zeigen</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.15s'
          }}
          className="hover-scale-mini"
          title="Schließen (Esc)"
          aria-label="Schließen"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
