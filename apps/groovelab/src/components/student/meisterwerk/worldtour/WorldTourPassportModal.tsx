import React, { useState, useEffect, useMemo } from 'react';
import { X, Star, Printer, Compass, Award, Plane, Lock, ChevronRight } from 'lucide-react';
import { ContinentId, WorldTourStudentProgress, WorldTourCountry } from '../../../../types/worldTour';
import { CONTINENTS, WORLD_TOUR_COUNTRIES } from '../../../../domain/worldTourCatalog';
import { WorldTourFlightEngine } from '../../../../domain/worldTourFlightGraph';
import { WorldTourCountryFlag } from './WorldTourCountryFlags';

interface WorldTourPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  studentInstrument?: string | null;
  studentAvatarUrl?: string | null;
  uiLevel?: 'junior' | 'teen' | 'pro';
  progressMap: Record<string, WorldTourStudentProgress>;
  currentLandedCountryCode?: string;
  onSelectCountry?: (countryCode: string) => void;
  onNavigateToCountry?: (countryCode: string) => void;
  onOpenDiploma?: () => void;
}

export const WorldTourPassportModal: React.FC<WorldTourPassportModalProps> = ({
  isOpen,
  onClose,
  studentName = 'Linus',
  studentInstrument = 'Gitarre',
  studentAvatarUrl,
  uiLevel = 'junior',
  progressMap,
  currentLandedCountryCode = 'DE',
  onSelectCountry,
  onNavigateToCountry,
  onOpenDiploma
}) => {
  const [selectedContinent, setSelectedContinent] = useState<ContinentId | 'all'>('all');
  const [selectedLockedCountry, setSelectedLockedCountry] = useState<WorldTourCountry | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute travel & mastery stats
  const stats = useMemo(() => {
    const total = WORLD_TOUR_COUNTRIES.length;
    let masteredCount = 0;
    let totalXp = 0;
    const continentCounts: Record<ContinentId, { mastered: number; total: number }> = {
      europe: { mastered: 0, total: 0 },
      americas: { mastered: 0, total: 0 },
      africa: { mastered: 0, total: 0 },
      asia: { mastered: 0, total: 0 },
      oceania: { mastered: 0, total: 0 }
    };

    WORLD_TOUR_COUNTRIES.forEach(c => {
      continentCounts[c.continent].total += 1;
      const prog = progressMap[c.code];
      if (prog && prog.stars >= 1) {
        masteredCount += 1;
        continentCounts[c.continent].mastered += 1;
        totalXp += prog.stars === 3 ? 150 : prog.stars === 2 ? 100 : 50;
      }
    });

    const isWorldCompleted = masteredCount === total;

    return {
      masteredCount,
      total,
      totalXp,
      continentCounts,
      isWorldCompleted
    };
  }, [progressMap]);

  // Filter countries for right page
  const displayedCountries = useMemo(() => {
    if (selectedContinent === 'all') return WORLD_TOUR_COUNTRIES;
    return WORLD_TOUR_COUNTRIES.filter(c => c.continent === selectedContinent);
  }, [selectedContinent]);

  if (!isOpen) return null;

  const cleanStudentName = (studentName || 'Linus').trim();
  const cleanInstrument = (studentInstrument || 'Gitarre').trim();
  const avatarImageSrc = studentAvatarUrl || '/avatars/gitarre_avatar_new.png';
  const passportNumber = `CG-2026-${cleanStudentName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'LINUS'}`;

  // 100% ICAO Doc 9303 konforme Maschinenlesezone (MRZ, TD3-Format, exakt 44 Zeichen)
  // DSGVO Art. 5 Datenminimierung: Kein Erheben/Speichern von Geburtsdatum oder Geschlecht.
  // Gemäß ICAO Doc 9303 Teil 4 Abs. 9.7 werden nicht erhobene Daten standardkonform mit '<' gefüllt.
  const sanitizedMrzName = cleanStudentName.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const mrzLine1 = `P<CGD<<${sanitizedMrzName.slice(0, 20).padEnd(20, '<')}<<<<<<<<<<<<<<<<<`;
  const mrzLine2 = `CG2026001<0CGD<<<<<<<<<<<<<<<<<<<<<<<<<<<<<0`;

  // Deterministic vintage ink styles for visa rubber stamps
  const getContinentInkStyle = (continent: ContinentId) => {
    switch (continent) {
      case 'europe':
        return { color: '#1e3a8a', bg: 'rgba(30, 58, 138, 0.05)', border: '#1e3a8a' };
      case 'americas':
        return { color: '#c2410c', bg: 'rgba(194, 65, 12, 0.05)', border: '#c2410c' };
      case 'africa':
        return { color: '#b45309', bg: 'rgba(180, 83, 9, 0.05)', border: '#b45309' };
      case 'asia':
        return { color: '#be185d', bg: 'rgba(190, 24, 93, 0.05)', border: '#be185d' };
      case 'oceania':
        return { color: '#047857', bg: 'rgba(4, 120, 87, 0.05)', border: '#047857' };
      default:
        return { color: '#1e293b', bg: 'rgba(30, 41, 59, 0.05)', border: '#1e293b' };
    }
  };

  const handleStampClick = (country: WorldTourCountry) => {
    const prog = progressMap[country.code];
    const isMastered = Boolean(prog && prog.stars >= 1);
    const isCurrentLanded = country.code === currentLandedCountryCode;
    const canFlyDirectly = Boolean(
      currentLandedCountryCode &&
      WorldTourFlightEngine.canFlyDirectly(currentLandedCountryCode, country.code, progressMap)
    );

    if (isMastered || isCurrentLanded) {
      if (onSelectCountry) {
        onSelectCountry(country.code);
        onClose();
      }
    } else if (canFlyDirectly) {
      if (onNavigateToCountry) {
        onNavigateToCountry(country.code);
        onClose();
      } else if (onSelectCountry) {
        onSelectCountry(country.code);
        onClose();
      }
    } else {
      // 🔒 Noch gesperrt: Kein direkter Teleportations-Bypass!
      setSelectedLockedCountry(country);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Campus-Groovelab Expeditions-Reisepass"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.76)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 📖 Offener Reisepass (2-Seiten Papier-Bogen / Spread) */}
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          background: '#fbf9f4',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(226, 218, 201, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          animation: 'fade-in 0.22s ease-out'
        }}
      >
        {/* 🛂 Dezente obere Pass-Leiste mit Schließen-Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            background: '#f2ede2',
            borderBottom: '1px solid #e5ded0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} strokeWidth={2.4} color="#78350f" />
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#78350f', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Expeditions-Reisepass • Musik-Weltreise
            </span>
            <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 700, opacity: 0.85 }}>
              Pass-Nr. {passportNumber}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => window.print()}
              aria-label="Expeditions-Reisepass drucken"
              title="Expeditions-Reisepass als A4-Erinnerung drucken"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #d6cbba',
                background: '#ffffff',
                color: '#78350f',
                fontSize: '0.72rem',
                fontWeight: 850,
                cursor: 'pointer',
                touchAction: 'manipulation',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
              className="hover-scale"
            >
              <Printer size={13} color="#78350f" />
              <span>Pass drucken</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Reisepass schließen"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                touchAction: 'manipulation',
                transition: 'background 0.15s ease'
              }}
              className="hover-scale"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 📄 Doppelseite: Links Ausweis, Rechts Stempelseite */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            minHeight: 0,
            overflowY: 'auto',
            background: '#faf8f3'
          }}
        >
          {/* ========================================================================= */}
          {/* 📖 LINKE SEITE: OFFIZIELLER EXPEDITIONS-AUSWEIS                          */}
          {/* ========================================================================= */}
          <div
            style={{
              flex: '1 1 360px',
              minWidth: '320px',
              padding: '24px 22px',
              borderRight: '1px solid #e7dfd1',
              boxShadow: 'inset -3px 0 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              background: '#fdfcf9'
            }}
          >
            {/* Guilloche Sicherheitsband oben */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #b45309 0%, #1e3a8a 35%, #166534 70%, #b45309 100%)',
                opacity: 0.85
              }}
            />

            <div>
              {/* Hoheitskopf des Dokuments */}
              <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px solid #ede6d8', paddingBottom: '12px' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 900, color: '#78350f', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Bundesrepublik Campus-Groovelab
                </div>
                <div style={{ fontSize: '1.12rem', fontWeight: 950, color: '#0f172a', letterSpacing: '0.04em', marginTop: '2px' }}>
                  EXPEDITIONS-AUSWEIS
                </div>
                <div style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.06em' }}>
                  OFFICIAL MUSICIAN PASSPORT • KLANGFORSCHER
                </div>
              </div>

              {/* Foto & Identitätsdaten-Grid */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                {/* 📸 Offizielles Passfoto mit echtem Avatar & Amtssiegel */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    style={{
                      width: '104px',
                      height: '128px',
                      borderRadius: '8px',
                      border: '2px solid #cbd5e1',
                      background: '#ffffff',
                      overflow: 'hidden',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img
                      src={avatarImageSrc}
                      alt={cleanStudentName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        // Fallback zum offiziellen 3D-Gitarrenavatar statt fehlerhafter Emojis
                        (e.target as HTMLImageElement).src = '/avatars/gitarre_avatar_new.png';
                      }}
                    />
                  </div>

                  {/* Violetter Prüfstempel über der Bildecke (Handstempel-Optik) */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-8px',
                      right: '-10px',
                      padding: '3px 7px',
                      borderRadius: '6px',
                      border: '1.5px solid #4f46e5',
                      background: 'rgba(255, 255, 255, 0.94)',
                      color: '#4338ca',
                      fontSize: '0.58rem',
                      fontWeight: 950,
                      letterSpacing: '0.05em',
                      transform: 'rotate(-10deg)',
                      boxShadow: '0 2px 6px rgba(79, 70, 229, 0.2)',
                      pointerEvents: 'none',
                      textTransform: 'uppercase'
                    }}
                  >
                    Amtlich Gültig
                  </div>
                </div>

                {/* 📝 Stammdatenfelder (Klare Passport-Typografie) */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Name des Entdeckers
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cleanStudentName}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                        Instrument
                      </div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 900, color: '#0369a1' }}>
                        {cleanInstrument}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                        Stufe
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                        {uiLevel === 'junior' ? 'Junior (6–10)' : uiLevel === 'teen' ? 'Teen (11–15)' : 'Pro (16+)'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                        Nationalität
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 850, color: '#475569' }}>
                        Weltmusiker
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                        Ausgestellt
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 850, color: '#475569' }}>
                        2026
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status-Plakette */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: '#f4efe4',
                  border: '1px solid #e5ded0',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#78350f',
                  marginBottom: '14px'
                }}
              >
                <span>🌍 Erforschte Länder:</span>
                <span style={{ fontWeight: 950, color: '#0f172a' }}>{stats.masteredCount} von {stats.total}</span>
              </div>
            </div>

            {/* 🛡️ Amtliche 2-zeilige MRZ (Machine Readable Zone) auf Sicherheitspapier */}
            <div
              style={{
                background: '#eee8da',
                border: '1px dashed #d6cbba',
                borderRadius: '6px',
                padding: '8px 10px',
                fontFamily: 'Courier New, Courier, monospace',
                fontSize: '0.66rem',
                color: '#334155',
                lineHeight: 1.4,
                letterSpacing: '0.12em',
                userSelect: 'none',
                overflow: 'hidden'
              }}
            >
              <div>{mrzLine1}</div>
              <div>{mrzLine2}</div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 🛂 RECHTE SEITE: VISA & STEMPELSEITE (SAMMELN & REISEN)                  */}
          {/* ========================================================================= */}
          <div
            style={{
              flex: '1.2 1 420px',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '440px',
              background: '#faf8f3'
            }}
          >
            {/* Header der Stempelseite */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '1.08rem', fontWeight: 950, color: '#0f172a', letterSpacing: '0.02em' }}>
                  VISA & STEMPEL
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                  Tippe auf einen Stempel, um direkt zum Stück zu reisen
                </div>
              </div>

              {/* Fortschritts-Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '100px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '0.74rem',
                  fontWeight: 900
                }}
              >
                <span>⭐</span>
                <span>{stats.masteredCount} / {stats.total}</span>
              </div>
            </div>

            {/* Subtile Kontinent-Filterchips auf dem Papier */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '12px',
                scrollbarWidth: 'none'
              }}
            >
              <button
                onClick={() => setSelectedContinent('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '100px',
                  border: selectedContinent === 'all' ? '1px solid #1e293b' : '1px solid #e2dac9',
                  background: selectedContinent === 'all' ? '#1e293b' : '#ffffff',
                  color: selectedContinent === 'all' ? '#ffffff' : '#64748b',
                  fontSize: '0.70rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  touchAction: 'manipulation'
                }}
              >
                Alle ({WORLD_TOUR_COUNTRIES.length})
              </button>

              {CONTINENTS.map(cont => {
                const isSel = selectedContinent === cont.id;
                const count = stats.continentCounts[cont.id];
                return (
                  <button
                    key={cont.id}
                    onClick={() => setSelectedContinent(cont.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '100px',
                      border: isSel ? '1px solid #1e293b' : '1px solid #e2dac9',
                      background: isSel ? '#1e293b' : '#ffffff',
                      color: isSel ? '#ffffff' : '#64748b',
                      fontSize: '0.70rem',
                      fontWeight: 850,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      touchAction: 'manipulation'
                    }}
                  >
                    {cont.label} ({count.mastered}/{count.total})
                  </button>
                );
              })}
            </div>

            {/* 📮 STEMPEL-RASTER (Authentische Vintage-Gummistempel & Flug-Stationen) */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '8px',
                overflowY: 'auto',
                paddingRight: '4px',
                paddingBottom: '16px'
              }}
            >
              {displayedCountries.map((country) => {
                const prog = progressMap[country.code];
                const isMastered = Boolean(prog && prog.stars >= 1);
                const isCurrentLanded = country.code === currentLandedCountryCode;
                const canFlyDirectly = Boolean(
                  currentLandedCountryCode &&
                  !isMastered &&
                  !isCurrentLanded &&
                  WorldTourFlightEngine.canFlyDirectly(currentLandedCountryCode, country.code, progressMap)
                );
                const isLocked = !isMastered && !isCurrentLanded && !canFlyDirectly;

                const stars = prog?.stars || 0;
                const ink = getContinentInkStyle(country.continent);

                // Organischer Handstempel-Winkel ($-2.4^\circ$ bis $+2.4^\circ$) für gemeisterte Stempel
                const charCode = country.code.charCodeAt(0) + country.code.charCodeAt(1);
                const rotationDeg = isMastered ? ((charCode % 5) - 2) * 1.1 : 0;

                // Flugdistanz für direkte Anschlussflüge (fail-safe)
                const distanceKm = canFlyDirectly && currentLandedCountryCode
                  ? Math.round(
                      typeof WorldTourFlightEngine?.getDistanceKm === 'function'
                        ? WorldTourFlightEngine.getDistanceKm(currentLandedCountryCode, country.code)
                        : (WorldTourFlightEngine?.getRouteInfo?.(currentLandedCountryCode, country.code)?.distanceKm || 0)
                    )
                  : 0;

                return (
                  <div
                    key={country.code}
                    role="button"
                    tabIndex={0}
                    aria-label={`${country.name}: ${country.pieceTitle}. ${
                      isMastered
                        ? `${stars} Sterne gemeistert, Visum erteilt`
                        : isCurrentLanded
                        ? 'Aktueller Standort des Flugzeugs'
                        : canFlyDirectly
                        ? `Direktes Flugtor frei, Distanz ${distanceKm} km`
                        : 'Flugroute noch gesperrt'
                    }`}
                    onClick={() => handleStampClick(country)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleStampClick(country);
                      }
                    }}
                    style={{
                      minHeight: '112px',
                      padding: '8px 6px',
                      borderRadius: '12px',
                      background: isMastered
                        ? ink.bg
                        : isCurrentLanded
                        ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, #ffffff 100%)'
                        : canFlyDirectly
                        ? '#f0f9ff'
                        : '#f8fafc',
                      border: isMastered
                        ? `3px double ${ink.border}`
                        : isCurrentLanded
                        ? '2px solid #0284c7'
                        : canFlyDirectly
                        ? '1.5px dashed #0284c7'
                        : '1.5px dashed #cbd5e1',
                      boxShadow: isMastered
                        ? '0 3px 8px rgba(0,0,0,0.06)'
                        : isCurrentLanded
                        ? '0 0 0 2px rgba(2, 132, 199, 0.25), 0 4px 12px rgba(2, 132, 199, 0.15)'
                        : 'none',
                      transform: `rotate(${rotationDeg}deg)`,
                      opacity: isLocked ? 0.45 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'center',
                      cursor: isLocked ? 'default' : 'pointer',
                      touchAction: 'manipulation',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                      position: 'relative'
                    }}
                    className={!isLocked ? 'hover-scale' : undefined}
                  >
                    {/* Flaggen-Medaillon */}
                    <div style={{ filter: isLocked ? 'grayscale(100%) opacity(0.4)' : 'none' }}>
                      <WorldTourCountryFlag countryCode={country.code} size={28} />
                    </div>

                    {/* Titel & Stück */}
                    <div style={{ width: '100%', padding: '0 2px' }}>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          color: isMastered
                            ? ink.color
                            : isCurrentLanded
                            ? '#0369a1'
                            : canFlyDirectly
                            ? '#0284c7'
                            : '#64748b',
                          lineHeight: 1.15
                        }}
                      >
                        {country.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.60rem',
                          color: isMastered ? '#475569' : '#94a3b8',
                          fontWeight: 700,
                          marginTop: '1px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '108px',
                          margin: '0 auto'
                        }}
                      >
                        {country.pieceTitle}
                      </div>
                    </div>

                    {/* Status-Badge je nach Zustand */}
                    {isMastered ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                        <div style={{ display: 'flex', gap: '2px', color: '#eab308' }}>
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Star
                              key={i}
                              size={11}
                              fill={i < stars ? '#eab308' : '#e2e8f0'}
                              stroke={i < stars ? '#ca8a04' : '#cbd5e1'}
                              strokeWidth={1.5}
                            />
                          ))}
                        </div>
                        <div
                          style={{
                            fontSize: '0.50rem',
                            fontWeight: 950,
                            letterSpacing: '0.06em',
                            color: ink.color,
                            textTransform: 'uppercase',
                            marginTop: '1px'
                          }}
                        >
                          ★ Visum 2026 ★
                        </div>
                      </div>
                    ) : isCurrentLanded ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.58rem',
                          fontWeight: 900,
                          color: '#0284c7',
                          padding: '2px 6px',
                          borderRadius: '100px',
                          background: '#e0f2fe',
                          border: '1px solid #bae6fd'
                        }}
                      >
                        <Plane size={10} strokeWidth={2.6} />
                        <span>STANDORT</span>
                      </div>
                    ) : canFlyDirectly ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.56rem',
                          fontWeight: 850,
                          color: '#0369a1',
                          padding: '2px 5px',
                          borderRadius: '100px',
                          background: '#e0f2fe'
                        }}
                      >
                        <span>🛫 FLUG FREI</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.54rem',
                          fontWeight: 800,
                          color: '#94a3b8',
                          padding: '1px 5px',
                          borderRadius: '100px',
                          background: '#f1f5f9'
                        }}
                      >
                        <Lock size={9} />
                        <span>GESPERRT</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 🔒 Didaktischer Routing-Hinweis bei Antippen eines gesperrten Landes */}
            {selectedLockedCountry && (
              <div
                style={{
                  marginTop: '8px',
                  marginBottom: '6px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
                  animation: 'fade-in 0.2s ease-out'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ fontSize: '1.1rem', flexShrink: 0 }}>✈️</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#1e3a8a' }}>
                      Flugroute nach {selectedLockedCountry.name} gesperrt
                    </div>
                    <div style={{ fontSize: '0.64rem', color: '#1e40af', fontWeight: 700, lineHeight: 1.3 }}>
                      Dein Flugzeug steht in <strong>{WORLD_TOUR_COUNTRIES.find(c => c.code === currentLandedCountryCode)?.name || 'Deutschland'}</strong>. Meistere erst dein aktuelles Stück (&gt;60%) oder fliege ein direktes Nachbarland an!
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (onNavigateToCountry) {
                      onNavigateToCountry(currentLandedCountryCode);
                    }
                    onClose();
                  }}
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 9px',
                    borderRadius: '7px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.68rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    touchAction: 'manipulation'
                  }}
                  className="hover-scale"
                >
                  <span>Zum Standort</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            )}

            {/* 🏆 Optionale Diplom-Auszeichnung bei Vollendung */}
            {stats.isWorldCompleted && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  border: '1.5px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(234, 179, 8, 0.15)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} color="#b45309" />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#78350f' }}>
                      Weltreise vollständig gemeistert!
                    </div>
                    <div style={{ fontSize: '0.64rem', color: '#92400e', fontWeight: 700 }}>
                      Alle 21 Länder bereist • Diplom verfügbar
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onOpenDiploma) {
                      onOpenDiploma();
                    } else {
                      window.print();
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 850,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    touchAction: 'manipulation'
                  }}
                  className="hover-scale"
                >
                  <Award size={13} color="#eab308" />
                  <span>Diplom anzeigen</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
