import React, { useEffect } from 'react';
import { Users, RotateCcw, Zap, Plus } from 'lucide-react';
import { generateRandomBandName } from '../../utils/bandNameGenerator';

export interface BandFoundingModalsHubProps {
  user: any;
  brandColor?: string;
  suggestingSkill: any;
  setSuggestingSkill: (val: any) => void;
  foundingName: string;
  setFoundingName: (val: string) => void;
  foundingLanguage: 'de' | 'en';
  setFoundingLanguage: (val: 'de' | 'en') => void;
  teachers: any[];
  selectedCoachId: string;
  setSelectedCoachId: (val: string) => void;
  handleFoundBand: (skill: any) => void;
  dismissSuggestion: (skillId: any) => void;
  userBands: any[];
  globalSongs: any[];
  handleSuggestToBand: (bandId: string, skill: any) => void;
  supabase: any;
  fetchDashboardData: (userId: string, isHome?: boolean) => Promise<any>;
  setActiveStudentTab: (tab: string) => void;
}

/**
 * 🎸 BandFoundingModalsHub (Monolith Goldstandard Hub)
 * Kapselt alle Bandgründungs-, Coach-Auswahl- und Matching-Vorschlags-Dialoge
 * nach Abschluss eines Songs oder bei vollständiger Formation.
 */
export const BandFoundingModalsHub: React.FC<BandFoundingModalsHubProps> = ({
  user,
  brandColor = '#eab308',
  suggestingSkill,
  setSuggestingSkill,
  foundingName,
  setFoundingName,
  foundingLanguage,
  setFoundingLanguage,
  teachers,
  selectedCoachId,
  setSelectedCoachId,
  handleFoundBand,
  dismissSuggestion,
  userBands,
  globalSongs,
  handleSuggestToBand,
  supabase,
  fetchDashboardData,
  setActiveStudentTab,
}) => {
  // Escape-Taste zum Schließen des aktiven Dialogs
  useEffect(() => {
    if (!suggestingSkill) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissSuggestion(suggestingSkill.id || suggestingSkill.skill_id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestingSkill, dismissSuggestion]);

  if (!suggestingSkill) return null;

  return (
    <>
      {/* 1. Band Founding Modal bei vollständiger Formation */}
      {suggestingSkill.formation_group && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Band gründen"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 6000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(2, 6, 23, 0.95)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            className="animation-pop-in"
            style={{
              background: 'white',
              padding: '50px',
              borderRadius: '40px',
              maxWidth: '550px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '35px',
                background: '#fefce8',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
                boxShadow: '0 10px 30px rgba(234, 179, 8, 0.2)',
              }}
            >
              <Users size={50} />
            </div>

            <h2
              className="animation-glow-text"
              style={{
                fontSize: '2.3rem',
                fontWeight: 1000,
                color: '#1e293b',
                marginBottom: '8px',
                letterSpacing: '-0.04em',
              }}
            >
              BAND GRÜNDEN 🎸
            </h2>
            <p
              style={{
                fontSize: '1.15rem',
                color: '#64748b',
                lineHeight: 1.5,
                marginBottom: '32px',
                fontWeight: 600,
              }}
            >
              Eure Formation für <strong>{suggestingSkill.songs?.title || suggestingSkill.title}</strong> ist vollständig!
            </p>

            {suggestingSkill.isLeader ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '24px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                  }}
                >
                  {/* Band Name Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 900,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Wie soll eure Band heißen?
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          gap: '4px',
                          background: '#f1f5f9',
                          padding: '3px',
                          borderRadius: '8px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFoundingLanguage('de');
                            setFoundingName(generateRandomBandName('de'));
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: foundingLanguage === 'de' ? '#eab308' : 'transparent',
                            color: foundingLanguage === 'de' ? '#0f172a' : '#64748b',
                            transition: 'all 0.15s',
                          }}
                        >
                          DE
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFoundingLanguage('en');
                            setFoundingName(generateRandomBandName('en'));
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: foundingLanguage === 'en' ? '#eab308' : 'transparent',
                            color: foundingLanguage === 'en' ? '#0f172a' : '#64748b',
                            transition: 'all 0.15s',
                          }}
                        >
                          EN
                        </button>
                      </div>
                    </div>
                    <div style={{ width: '100%', position: 'relative' }}>
                      <input
                        type="text"
                        value={foundingName}
                        onChange={(e) => setFoundingName(e.target.value)}
                        placeholder="Z.B. Die wilden Töne"
                        style={{
                          width: '100%',
                          padding: '16px 50px 16px 16px',
                          background: 'white',
                          border: '1px solid #cbd5e1',
                          borderRadius: '16px',
                          color: '#1e293b',
                          fontSize: '1rem',
                          fontWeight: 700,
                          outline: 'none',
                          transition: 'all 0.2s',
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#eab308')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFoundingName(generateRandomBandName(foundingLanguage));
                        }}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#eab308',
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Neuen Namen würfeln"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Coach Selection Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Wähle euren Bandcoach (Lehrer): *
                    </label>
                    {teachers.length === 0 ? (
                      <div
                        style={{
                          background: '#f1f5f9',
                          borderRadius: '16px',
                          padding: '20px',
                          textAlign: 'center',
                          color: '#94a3b8',
                          fontSize: '0.9rem',
                        }}
                      >
                        Keine Lehrer gefunden
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                          gap: '10px',
                        }}
                      >
                        {teachers
                          .filter((t) => !t.is_observer)
                          .map((t) => {
                            const isSelected = selectedCoachId === t.id;
                            const initials = `${(t.first_name || '')[0] || ''}${(t.last_name || '')[0] || ''}`.toUpperCase();
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setSelectedCoachId(t.id)}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '16px 10px',
                                  background: isSelected
                                    ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.12), rgba(234, 179, 8, 0.04))'
                                    : 'white',
                                  border: isSelected ? '2.5px solid #eab308' : '2px solid #e2e8f0',
                                  borderRadius: '18px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                  transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                                  boxShadow: isSelected
                                    ? '0 8px 24px rgba(234, 179, 8, 0.2)'
                                    : '0 2px 8px rgba(0,0,0,0.06)',
                                  position: 'relative',
                                  minWidth: 0,
                                }}
                              >
                                {isSelected && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '8px',
                                      right: '8px',
                                      width: '18px',
                                      height: '18px',
                                      background: '#eab308',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '10px',
                                      color: 'white',
                                      fontWeight: 900,
                                    }}
                                  >
                                    ✓
                                  </div>
                                )}
                                {t.photo_url ? (
                                  <img
                                    src={t.photo_url}
                                    alt={t.first_name}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                    style={{
                                      width: '52px',
                                      height: '52px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      border: isSelected ? '3px solid #eab308' : '3px solid #e2e8f0',
                                      transition: 'border 0.2s',
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: '52px',
                                      height: '52px',
                                      borderRadius: '50%',
                                      background: isSelected
                                        ? 'linear-gradient(135deg, #eab308, #ca8a04)'
                                        : 'linear-gradient(135deg, #94a3b8, #64748b)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '1.1rem',
                                      fontWeight: 900,
                                      color: isSelected ? '#0f172a' : 'white',
                                      letterSpacing: '-0.02em',
                                      transition: 'background 0.2s',
                                    }}
                                  >
                                    {initials || '?'}
                                  </div>
                                )}
                                <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                                  <div
                                    style={{
                                      fontWeight: 800,
                                      fontSize: '0.82rem',
                                      color: isSelected ? '#eab308' : '#1e293b',
                                      transition: 'color 0.2s',
                                    }}
                                  >
                                    {t.first_name}
                                  </div>
                                  {t.last_name && (
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        color: isSelected ? 'rgba(234, 179, 8, 0.8)' : '#64748b',
                                        transition: 'color 0.2s',
                                      }}
                                    >
                                      {t.last_name}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0', lineHeight: 1.4 }}>
                      💡 <em>Lehrer können den Bandcoach nachträglich jederzeit ändern.</em>
                    </p>
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedCoachId) {
                      alert('Bitte wähle euren Bandcoach aus, um die Band zu gründen!');
                      return;
                    }
                    handleFoundBand(suggestingSkill);
                  }}
                  className="hero-cta-artistic"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #ca8a04, #eab308)',
                    border: 'none',
                    padding: '20px',
                    borderRadius: '18px',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 10px 25px rgba(234, 179, 8, 0.3)',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                  }}
                >
                  <Zap size={20} fill="#0f172a" /> EIGENE BAND GRÜNDEN 🚀
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: '#f8fafc',
                  padding: '30px',
                  borderRadius: '24px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎸</div>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem', marginBottom: '8px' }}>
                  Eure Formation ist vollständig!
                </div>
                <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  Dein Teamkollege{' '}
                  <span style={{ color: brandColor, fontWeight: 900 }}>{suggestingSkill.leaderName}</span> wurde als
                  Bandleader ausgewählt und gründet gerade eure neue Band mit einem Coach.
                </p>
                <div
                  style={{
                    marginTop: '20px',
                    fontSize: '0.75rem',
                    color: brandColor,
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                  }}
                  className="animate-pulse"
                >
                  BITTE KURZ WARTEN...
                </div>

                <button
                  type="button"
                  onClick={() => dismissSuggestion(suggestingSkill.id || suggestingSkill.skill_id)}
                  style={{
                    marginTop: '24px',
                    width: '100%',
                    background: brandColor,
                    border: 'none',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    fontSize: '1rem',
                    fontWeight: 900,
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: `0 8px 20px ${brandColor}20`,
                    transition: 'all 0.2s',
                    minHeight: '44px',
                  }}
                >
                  ZURÜCK ZUM DASHBOARD
                </button>
              </div>
            )}

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => dismissSuggestion(suggestingSkill.id || suggestingSkill.skill_id)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#94a3b8',
                cursor: 'pointer',
                marginTop: '16px',
                minHeight: '44px',
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* 2. Skill Suggestion Modal bei gemeistertem Song ohne Formation */}
      {suggestingSkill && !suggestingSkill.formation_group && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Glückwunsch zum Song-Abschluss"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 6000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(2, 6, 23, 0.9)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            className="animation-pop-in"
            style={{
              background: 'white',
              padding: '60px',
              borderRadius: '40px',
              maxWidth: '550px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 40px 120px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '35px',
                background: '#fef3c7',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 32px auto',
                boxShadow: '0 10px 30px rgba(245, 158, 11, 0.2)',
              }}
            >
              <Zap size={50} fill="currentColor" />
            </div>
            <h2
              className="animation-glow-text"
              style={{
                fontSize: '2.5rem',
                fontWeight: 1000,
                color: '#1e293b',
                marginBottom: '16px',
                letterSpacing: '-0.04em',
              }}
            >
              GLÜCKWUNSCH! 🏆
            </h2>
            <p
              style={{
                fontSize: '1.25rem',
                color: '#64748b',
                lineHeight: 1.6,
                marginBottom: '40px',
                fontWeight: 600,
              }}
            >
              Du hast <strong>{suggestingSkill.songs?.title || suggestingSkill.title}</strong> gemeistert.
              <br />
              Bist du bereit für den nächsten Schritt?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
              {/* Option 1 Panel */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '24px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      background: brandColor,
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                    }}
                  >
                    1
                  </div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 900,
                      color: '#1e293b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Song einer deiner Bands vorschlagen
                  </div>
                </div>

                {userBands.length > 0 ? (
                  (() => {
                    const filteredBands = userBands.filter((band) => {
                      const myMember = (band.band_members || []).find((m: any) => m.user_id === user?.id);
                      if (!myMember) return false;

                      const bandSong = (band.band_songs || []).find(
                        (bs: any) => (bs.songs?.id || bs.song_id) === suggestingSkill.song_id
                      );
                      if (!bandSong) return true;

                      const song = globalSongs.find((s) => s.id === suggestingSkill.song_id);
                      if (!song || !song.instrumentation) return true;

                      const req = song.instrumentation;
                      const slots = bandSong.band_song_slots || [];
                      const isComplete = Object.keys(req).every((inst) => {
                        const needed = req[inst] || 0;
                        if (needed === 0) return true;
                        const filled = slots.filter((sl: any) => sl.instrument === inst).length;
                        return filled >= needed;
                      });

                      return !isComplete;
                    });

                    if (filteredBands.length === 0) {
                      return (
                        <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', padding: '8px 0' }}>
                          Dieser Song wurde bereits komplett besetzt oder deine Bands haben keine passenden Slots.
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredBands.map((band) => (
                          <button
                            key={band.id}
                            type="button"
                            onClick={() => handleSuggestToBand(band.id, suggestingSkill)}
                            style={{
                              width: '100%',
                              background: 'white',
                              border: '1px solid #e2e8f0',
                              padding: '16px',
                              borderRadius: '16px',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                              minHeight: '44px',
                            }}
                          >
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: brandColor,
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                              }}
                            >
                              {band.name?.[0]}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 800, color: '#1e293b' }}>{band.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mitglieder benachrichtigen</div>
                            </div>
                            <Plus size={20} color={brandColor} />
                          </button>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', padding: '8px 0' }}>
                    Du bist derzeit noch in keiner Band registriert.
                  </div>
                )}
              </div>

              {/* Option 2 Panel */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '24px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      background: brandColor,
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                    }}
                  >
                    2
                  </div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 900,
                      color: '#1e293b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Neue Formation suchen oder gründen
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const newId = `form_${Math.random().toString(36).substr(2, 9)}`;

                        // 1. Close modal instantly and mark as ignored to prevent auto-retriggering
                        if (user) {
                          const sId = suggestingSkill.song_id || suggestingSkill.songs?.id;
                          if (sId) {
                            const inst = (suggestingSkill.instrument || '').toLowerCase();
                            localStorage.setItem(`groovelab_founding_ignored_${user.id}_${sId}_${inst}`, 'true');
                          }
                          const skillRecordId = suggestingSkill.id || suggestingSkill.skill_id;
                          if (skillRecordId) {
                            const storageKey = `groovelab_prompted_${user.id}`;
                            const promptedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
                            if (!promptedIds.includes(skillRecordId)) {
                              promptedIds.push(skillRecordId);
                              localStorage.setItem(storageKey, JSON.stringify(promptedIds));
                            }
                          }
                        }
                        setSuggestingSkill(null);

                        // 2. Resolve skill record ID with database fallback
                        let skillRecordId = suggestingSkill.id || suggestingSkill.skill_id;
                        const songId = suggestingSkill.song_id || suggestingSkill.songs?.id;

                        if (!skillRecordId && user && songId) {
                          const { data } = await supabase
                            .from('user_song_skills')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('song_id', songId)
                            .maybeSingle();

                          if (data) {
                            skillRecordId = data.id;
                          } else {
                            const { data: newRecord } = await supabase
                              .from('user_song_skills')
                              .insert({
                                user_id: user.id,
                                song_id: songId,
                                instrument: suggestingSkill.instrument || 'Gitarre',
                                difficulty_level: suggestingSkill.difficulty_level || 'starter',
                                progress_percent: 100,
                                is_stage_ready: true,
                              })
                              .select('id')
                              .maybeSingle();
                            if (newRecord) {
                              skillRecordId = newRecord.id;
                            }
                          }
                        }

                        if (skillRecordId) {
                          // 3. Open public formation slot
                          const { error } = await supabase
                            .from('user_song_skills')
                            .update({ formation_group: newId })
                            .eq('id', skillRecordId);

                          if (error) {
                            console.error('[Option 2] Error opening slot:', error);
                            alert('Fehler beim Öffnen des Matching-Slots: ' + error.message);
                          } else {
                            // 4. Background sync and navigate
                            if (user) await fetchDashboardData(user.id, false);

                            // 5. Show visual success alert
                            alert(
                              `Erfolg! 🎉\n\nEin neuer, öffentlicher Matching-Slot für „${
                                suggestingSkill.songs?.title || suggestingSkill.title || 'deinen Song'
                              }“ wurde für dich geöffnet!\n\nDeine Teamkollegen können sich nun im Matching-Board eintragen.`
                            );

                            setActiveStudentTab('matching');
                          }
                        } else {
                          console.error('[Option 2] Could not resolve skill record ID');
                          alert('Konnte keinen passenden Skill-Datensatz finden oder erstellen.');
                        }
                      } catch (err: any) {
                        console.error('[Option 2] Error in new formation search:', err);
                        alert('Ein Fehler ist aufgetreten: ' + err.message);
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      color: '#1e293b',
                      padding: '16px',
                      borderRadius: '16px',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      minHeight: '44px',
                    }}
                  >
                    <Users size={18} /> NEUE FORMATION SUCHEN
                  </button>
                </div>
              </div>

              {/* Maybe later button */}
              <button
                type="button"
                onClick={() => dismissSuggestion(suggestingSkill.id)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  marginTop: '-8px',
                  minHeight: '44px',
                }}
              >
                Vielleicht später
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
