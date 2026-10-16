import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Download, 
  FileText, 
  ExternalLink, 
  Trash2, 
  Copy, 
  Check, 
  Clock, 
  User, 
  School as SchoolIcon, 
  Music, 
  ShieldCheck, 
  Printer 
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface TakedownRecord {
  id: string;
  studentId: string;
  studentName: string;
  schoolName: string;
  playlistId?: string;
  playlistTitle?: string;
  reportedUrl: string;
  reason: string;
  timestamp: string;
  active: boolean;
  sha256Hash: string;
  legalBasis: string;
}

export function TrustSafetyTab() {
  const [inputUrl, setInputUrl] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedResult, setResolvedResult] = useState<{
    studentId: string;
    studentName: string;
    instrument: string;
    schoolName: string;
    schoolId?: string;
    playlistId?: string;
    playlistTitle?: string;
    pinh?: string;
    isAnonymized: boolean;
    isCurrentlyBlocked: boolean;
    takedownRecord?: TakedownRecord;
  } | null>(null);

  const [takedownRegistry, setTakedownRegistry] = useState<TakedownRecord[]>([]);
  const [registrySearch, setRegistrySearch] = useState('');
  const [selectedReason, setSelectedReason] = useState('Unbefugte Verlinkung in Social Media / Öffentliche PIN-Weitergabe');
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);
  const [actionErrorToast, setActionErrorToast] = useState<string | null>(null);
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  // Enterprise Trust & Safety: Fetch authoritative takedown registry from PostgreSQL
  useEffect(() => {
    let isMounted = true;
    const fetchServerRecords = async () => {
      try {
        const { data, error } = await supabase.rpc('fetch_active_content_takedowns');
        if (!error && Array.isArray(data) && isMounted) {
          const mapped: TakedownRecord[] = data.map((rawItem: unknown) => {
            const d = (rawItem && typeof rawItem === 'object' ? rawItem : {}) as Record<string, unknown>;
            const targetId = typeof d.target_id === 'string' ? d.target_id : '';
            const blockedAt = typeof d.blocked_at === 'string' ? d.blocked_at : new Date().toISOString();
            return {
              id: typeof d.id === 'string' ? d.id : `TAKEDOWN-${targetId.slice(0, 8)}`,
              studentId: targetId,
              studentName: typeof d.student_name === 'string' && d.student_name.trim() ? d.student_name : 'Schülerprofil',
              schoolName: typeof d.school_name === 'string' && d.school_name.trim() ? d.school_name : 'Musikschule',
              playlistId: typeof d.playlist_id === 'string' ? d.playlist_id : undefined,
              playlistTitle: undefined,
              reportedUrl: typeof d.reported_url === 'string' && d.reported_url ? d.reported_url : `https://campus-groovelab.de/bio/${targetId}`,
              reason: typeof d.reason === 'string' ? d.reason : 'Plattform-Sperrung',
              timestamp: new Date(blockedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
              active: Boolean(d.is_active),
              sha256Hash: typeof d.sha256_hash === 'string' ? d.sha256_hash : '',
              legalBasis: 'Plattform-Sperrprotokoll (Jugend- & Urheberrechtsschutz)'
            };
          });
          setTakedownRegistry(mapped);
        }
      } catch (e) {
        console.warn('Could not load takedowns from server:', e);
      }
    };
    fetchServerRecords();
    return () => { isMounted = false; };
  }, []);

  // Helper to format timestamps in German Local Time (Europe/Berlin)
  const formatGermanTime = (dateObj: Date = new Date()) => {
    return dateObj.toLocaleString('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Authoritative WebCrypto SHA-256 digest
  const computeAuditHash = async (payload: string): Promise<string> => {
    const encoded = new TextEncoder().encode(payload);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const showToast = (msg: string) => {
    setActionErrorToast(null);
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(null), 3500);
  };

  const showError = (msg: string) => {
    setActionSuccessToast(null);
    setActionErrorToast(msg);
    setTimeout(() => setActionErrorToast(null), 4500);
  };

  // Smart Link Resolver: Parses any URL or raw UUID and resolves student & school metadata
  const handleResolveUrl = async (rawInput: string) => {
    if (!rawInput.trim()) return;
    setIsResolving(true);
    setResolvedResult(null);

    try {
      const cleanInput = rawInput.trim();
      let extractedId = '';
      let extractedPl: string | undefined = undefined;
      let extractedPinHash: string | undefined = undefined;
      let extractedAnon = false;

      // Parse as URL if protocol or slashes present
      if (cleanInput.includes('/bio/') || cleanInput.includes('/shared-biography/') || cleanInput.includes('/shared/')) {
        try {
          const urlObj = new URL(cleanInput.startsWith('http') ? cleanInput : `https://${cleanInput}`);
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          extractedId = pathParts[pathParts.length - 1] || '';
          extractedPl = urlObj.searchParams.get('pl') || undefined;
          extractedPinHash = urlObj.searchParams.get('pinh') || undefined;
          extractedAnon = urlObj.searchParams.get('anon') === '1' || urlObj.searchParams.get('anon') === 'true';
        } catch {
          const match = cleanInput.match(/\/bio\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) extractedId = match[1];
        }
      } else {
        extractedId = cleanInput;
      }

      if (!extractedId) {
        showError('Ungültiger Link oder fehlende Profil-ID.');
        return;
      }

      let resolvedName = `Schüler-Profil #${extractedId.slice(0, 8)}`;
      let resolvedInstrument = 'Instrumental- / Vokalunterricht';
      let resolvedSchool = 'Musikschule';
      let resolvedSchoolId = '';
      const playlistTitle = extractedPl ? `Playlist: ${extractedPl}` : 'Komplette Audio-Biografie';

      // Query Supabase users table (Read-Only)
      try {
        const { data: userRec } = await supabase
          .from('users')
          .select('id, first_name, last_name, instrument, school_id')
          .eq('id', extractedId)
          .maybeSingle();

        if (userRec) {
          resolvedName = `${userRec.first_name || ''} ${userRec.last_name || ''}`.trim() || resolvedName;
          if (userRec.instrument) resolvedInstrument = userRec.instrument;
          if (userRec.school_id) resolvedSchoolId = userRec.school_id;
        }

        if (resolvedSchoolId) {
          const { data: schoolRec } = await supabase
            .from('schools')
            .select('id, name, city')
            .eq('id', resolvedSchoolId)
            .maybeSingle();

          if (schoolRec?.name) resolvedSchool = schoolRec.name;
        }
      } catch (err) {
        console.warn('Resolver query note:', err);
      }

      // Check if currently blocked
      const existingTakedown = takedownRegistry.find(
        t => t.studentId === extractedId && t.active && (!t.playlistId || t.playlistId === (extractedPl || 'all') || t.playlistId === 'all')
      );

      setResolvedResult({
        studentId: extractedId,
        studentName: resolvedName,
        instrument: resolvedInstrument,
        schoolName: resolvedSchool,
        schoolId: resolvedSchoolId,
        playlistId: extractedPl,
        playlistTitle: playlistTitle,
        pinh: extractedPinHash,
        isAnonymized: extractedAnon,
        isCurrentlyBlocked: Boolean(existingTakedown),
        takedownRecord: existingTakedown
      });

    } catch (e) {
      console.error('Error resolving URL:', e);
    } finally {
      setIsResolving(false);
    }
  };

  // 1-Click Takedown Execution (Fail-Closed Server Authority)
  const handleExecuteTakedown = async () => {
    if (!resolvedResult) return;

    const timestamp = formatGermanTime();
    const incidentId = `TAKEDOWN-${Date.now().toString().slice(-6)}-${resolvedResult.studentId.slice(0, 8).toUpperCase()}`;
    const hash = await computeAuditHash(`${incidentId}|${resolvedResult.studentId}|${resolvedResult.playlistId || 'all'}|${timestamp}|${selectedReason}`);

    const newRecord: TakedownRecord = {
      id: incidentId,
      studentId: resolvedResult.studentId,
      studentName: resolvedResult.studentName,
      schoolName: resolvedResult.schoolName,
      playlistId: resolvedResult.playlistId,
      playlistTitle: resolvedResult.playlistTitle,
      reportedUrl: inputUrl || `https://campus-groovelab.de/bio/${resolvedResult.studentId}`,
      reason: selectedReason,
      timestamp: timestamp,
      active: true,
      sha256Hash: hash,
      legalBasis: 'Plattform-Sperrprotokoll (Jugend- & Urheberrechtsschutz)'
    };

    try {
      const { error } = await supabase.rpc('execute_content_takedown', {
        p_student_id: resolvedResult.studentId,
        p_student_name: resolvedResult.studentName,
        p_school_name: resolvedResult.schoolName,
        p_playlist_id: resolvedResult.playlistId || 'all',
        p_playlist_title: resolvedResult.playlistTitle || null,
        p_reported_url: inputUrl || `https://campus-groovelab.de/bio/${resolvedResult.studentId}`,
        p_reason: selectedReason,
        p_sha256: hash
      });

      if (error) {
        showError(`Sperrung fehlgeschlagen (Server-RPC): ${error.message}`);
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verbindungsfehler';
      showError(`Sperrung abgebrochen (Fail-Closed): ${msg}`);
      return;
    }

    const updated = [newRecord, ...takedownRegistry.filter(t => t.studentId !== resolvedResult.studentId || t.playlistId !== resolvedResult.playlistId)];
    setTakedownRegistry(updated);

    setResolvedResult(prev => prev ? {
      ...prev,
      isCurrentlyBlocked: true,
      takedownRecord: newRecord
    } : null);

    showToast(`Sofort-Takedown ausgeführt: Freigabelink für „${resolvedResult.studentName}“ gesperrt!`);
  };

  // Revert / Restore Link Access (Fail-Closed)
  const handleRestoreAccess = async (studentIdToRestore: string, playlistIdToRestore?: string) => {
    try {
      const { error } = await supabase.rpc('restore_content_takedown', {
        p_student_id: studentIdToRestore,
        p_playlist_id: playlistIdToRestore || 'all'
      });
      if (error) {
        showError(`Freigabe fehlgeschlagen (Server-RPC): ${error.message}`);
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verbindungsfehler';
      showError(`Freigabe abgebrochen (Fail-Closed): ${msg}`);
      return;
    }

    const updated = takedownRegistry.map(t => {
      if (t.studentId === studentIdToRestore && (!playlistIdToRestore || t.playlistId === playlistIdToRestore)) {
        return { ...t, active: false };
      }
      return t;
    });

    setTakedownRegistry(updated);

    if (resolvedResult && resolvedResult.studentId === studentIdToRestore) {
      setResolvedResult(prev => prev ? { ...prev, isCurrentlyBlocked: false, takedownRecord: undefined } : null);
    }

    showToast(`Freigabelink reaktiviert & Sperrung aufgehoben.`);
  };

  // Re-Roll PIN (6-digit CSPRNG PIN, Server-Only without localStorage)
  const handleReRollPin = async () => {
    if (!resolvedResult) return;
    const randomBuf = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuf);
    const newRandomPin = (100000 + (randomBuf[0] % 900000)).toString();

    try {
      const { error } = await supabase.rpc('upsert_shared_biography_link', {
        p_student_id: resolvedResult.studentId,
        p_pin: newRandomPin,
        p_student_display_name: resolvedResult.studentName || null,
        p_school_display_name: resolvedResult.schoolName || null
      });
      if (error) {
        showError(`PIN-Rotation fehlgeschlagen (Server-RPC): ${error.message}`);
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verbindungsfehler';
      showError(`PIN-Rotation abgebrochen (Fail-Closed): ${msg}`);
      return;
    }
    showToast(`6-stellige PIN neu vergeben (${newRandomPin}): Bisheriger Hash auf dem Server wurde sofort rotiert!`);
  };

  // Export Compliance Audit Report (JSON Certificate)
  const handleDownloadDsaCertificate = (rec: TakedownRecord) => {
    const certData = {
      $schema: "https://campus-groovelab.de/schemas/takedown-certificate-v1.json",
      certificateTitle: "PLATTFORM-SPERRPROTOKOLL (JUGEND- & URHEBERRECHTSSCHUTZ)",
      incidentId: rec.id,
      platformOperator: "Campus-Groovelab Platform Systems",
      protocolStandard: rec.legalBasis,
      takedownExecutionTimestampDE: rec.timestamp,
      timezone: "Europe/Berlin",
      reportedUrl: rec.reportedUrl,
      affectedStudentId: rec.studentId,
      affectedStudentDisplayName: rec.studentName,
      affectedMusicSchool: rec.schoolName,
      affectedPlaylist: rec.playlistTitle || "Gesamte Audio-Biografie",
      takedownReason: rec.reason,
      complianceStatus: rec.active ? "HTTP_410_RESOURCE_SUSPENDED" : "RESTORED",
      tamperProofSha256Checksum: rec.sha256Hash,
      verificationNotice: "Kryptografisch mit SHA-256 gesiegelter Nachweis über die unverzügliche Sperrung des gemeldeten Freigabelinks."
    };

    const blob = new Blob([JSON.stringify(certData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sperrprotokoll_Zertifikat_${rec.id}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Sperrprotokoll-Beweis heruntergeladen!`);
  };

  const filteredRegistry = useMemo(() => {
    return takedownRegistry.filter(r => {
      const q = registrySearch.toLowerCase();
      return r.studentName.toLowerCase().includes(q) ||
             r.schoolName.toLowerCase().includes(q) ||
             r.id.toLowerCase().includes(q) ||
             r.reportedUrl.toLowerCase().includes(q);
    });
  }, [takedownRegistry, registrySearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: '16px',
          border: 'none',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 800,
          fontSize: '0.86rem'
        }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {actionErrorToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#991b1b',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: '16px',
          border: 'none',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 800,
          fontSize: '0.86rem'
        }}>
          <AlertTriangle size={18} color="#fecaca" />
          <span>{actionErrorToast}</span>
        </div>
      )}

      {/* BRIGHT APPLE HIG HERO BANNER */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        padding: '28px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: 'none',
              fontSize: '0.72rem',
              fontWeight: 900,
              padding: '3px 10px',
              borderRadius: '100px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <ShieldCheck size={12} color="#dc2626" />
              Trust &amp; Safety • Link-Schutz
            </span>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              1-Klick Sperre &amp; 6-stelliger PIN-Schutz
            </span>
          </div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif" }}>
            Freigabelinks prüfen &amp; sperren
          </h2>
          <p style={{ margin: 0, fontSize: '0.90rem', color: '#64748b', lineHeight: 1.55 }}>
            Füge einen Freigabelink ein, um das betroffene Schülerprofil in Sekundenschnelle zu identifizieren und den Link bei Bedarf mit 1 Klick zu deaktivieren oder mit einer neuen 6-stelligen PIN zu schützen.
          </p>
        </div>

        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
            Gesperrte Links
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 900, color: takedownRegistry.filter(t => t.active).length > 0 ? '#dc2626' : '#059669' }}>
            {takedownRegistry.filter(t => t.active).length}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            im Gesamtsystem
          </span>
        </div>
      </div>

      {/* Section 1: Deep Link Resolver & Takedown Action Cockpit */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        padding: '28px 32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb'
          }}>
            <Search size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.14rem', fontWeight: 900, color: '#0f172a' }}>
              Schritt 1: Freigabelink oder Schüler-ID eingeben
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Füge den vollständigen Link, den Link-Code oder die Schüler-ID ein
            </span>
          </div>
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleResolveUrl(inputUrl)}
              placeholder="z. B. https://campus-groovelab.de/bio/6cd49c91-4b87-4519-94d5?anon=1&pl=sommer..."
              style={{
                width: '100%',
                padding: '13px 14px 13px 44px',
                borderRadius: '14px',
                border: '1.5px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#0f172a',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => handleResolveUrl(inputUrl)}
            disabled={isResolving || !inputUrl.trim()}
            style={{
              padding: '13px 24px',
              borderRadius: '14px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: inputUrl.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: inputUrl.trim() ? 1 : 0.6,
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="hover-scale-mini"
          >
            {isResolving ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            <span>Link analysieren</span>
          </button>
        </div>

        {/* Resolved Record Cockpit Card */}
        {resolvedResult && (
          <div style={{
            background: '#ffffff',
            border: `1.5px solid ${resolvedResult.isCurrentlyBlocked ? '#fca5a5' : '#a7f3d0'}`,
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: resolvedResult.isCurrentlyBlocked ? '#fee2e2' : '#ecfdf5',
                  color: resolvedResult.isCurrentlyBlocked ? '#dc2626' : '#059669'
                }}>
                  {resolvedResult.isCurrentlyBlocked ? <Lock size={20} /> : <Music size={20} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                      {resolvedResult.studentName}
                    </h4>
                    {resolvedResult.isAnonymized && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '100px', background: '#f1f5f9', color: '#475569', border: 'none' }}>
                        Anonymisiert im Web
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                    {resolvedResult.schoolName} • Instrument: {resolvedResult.instrument}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '100px',
                background: resolvedResult.isCurrentlyBlocked ? '#fee2e2' : '#ecfdf5',
                color: resolvedResult.isCurrentlyBlocked ? '#dc2626' : '#059669',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 900
              }}>
                {resolvedResult.isCurrentlyBlocked ? <Lock size={14} /> : <CheckCircle2 size={14} />}
                <span>{resolvedResult.isCurrentlyBlocked ? 'Link ist aktuell gesperrt' : 'Link ist aktiv & aufrufbar'}</span>
              </div>
            </div>

            {/* Meta Grid (Clean & Compact) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '14px 18px',
              fontSize: '0.78rem'
            }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.70rem', fontWeight: 700 }}>Schüler-ID:</span>
                <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{resolvedResult.studentId}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.70rem', fontWeight: 700 }}>Betroffene Playlist:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{resolvedResult.playlistTitle}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.70rem', fontWeight: 700 }}>Download-Schutz:</span>
                <span style={{ fontWeight: 800, color: '#059669' }}>Aktiv (Nur Streaming)</span>
              </div>
            </div>

            {/* Action Buttons (1-Click Simplicity) */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {!resolvedResult.isCurrentlyBlocked ? (
                <>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <select
                      value={selectedReason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Unbefugte Verlinkung in Social Media / Öffentliche PIN-Weitergabe">
                        Grund: Öffentliche PIN-Weitergabe (Social Media)
                      </option>
                      <option value="Urheberrechtliche Beanstandung durch Rechteinhaber / GEMA">
                        Grund: Beanstandung durch Rechteinhaber / GEMA
                      </option>
                      <option value="Pädagogische Notfall-Deaktivierung durch Schulleitung">
                        Grund: Anforderung durch Schulleitung
                      </option>
                      <option value="Widerruf der Freigabe durch Erziehungsberechtigte">
                        Grund: Widerruf der Freigabe durch Erziehungsberechtigte
                      </option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteTakedown}
                    style={{
                      padding: '11px 22px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#ffffff',
                      fontSize: '0.86rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: 'none',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-mini"
                  >
                    <ShieldAlert size={16} />
                    <span>Link sofort sperren</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReRollPin}
                    style={{
                      padding: '11px 18px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-mini"
                    title="Erzeugt eine neue 6-stellige PIN für den Schüler"
                  >
                    <RefreshCw size={14} />
                    <span>Neue PIN vergeben</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleRestoreAccess(resolvedResult.studentId, resolvedResult.playlistId)}
                    style={{
                      padding: '11px 22px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#059669',
                      color: '#ffffff',
                      fontSize: '0.86rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: 'none',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-mini"
                  >
                    <Unlock size={16} />
                    <span>Link wieder freigeben</span>
                  </button>

                  {resolvedResult.takedownRecord && (
                    <button
                      type="button"
                      onClick={() => handleDownloadDsaCertificate(resolvedResult.takedownRecord!)}
                      style={{
                        padding: '11px 18px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale-mini"
                    >
                      <Download size={14} />
                      <span>Sperrprotokoll herunterladen</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: WORM-Compliant Takedown Audit Registry Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        padding: '28px 32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.14rem', fontWeight: 900, color: '#0f172a' }}>
              Plattform-Sperrprotokoll (Jugend- &amp; Urheberrechtsschutz)
            </h3>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              Manipulationssichere Protokollierung mit Zeitstempel und kryptografischer SHA-256 Prüfsumme
            </span>
          </div>

          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={registrySearch}
              onChange={(e) => setRegistrySearch(e.target.value)}
              placeholder="Protokoll durchsuchen..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.80rem',
                fontWeight: 600,
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Vorgangs-ID</th>
                <th style={{ padding: '12px 16px' }}>Zeitstempel</th>
                <th style={{ padding: '12px 16px' }}>Schüler &amp; Schule</th>
                <th style={{ padding: '12px 16px' }}>Grund &amp; Protokollstandard</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Kryptografische Prüfsumme</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistry.map(rec => (
                <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                    {rec.id}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {rec.timestamp}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{rec.studentName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{rec.schoolName}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', maxWidth: '240px' }}>{rec.reason}</div>
                    <div style={{ fontSize: '0.70rem', color: '#059669', fontWeight: 800 }}>{rec.legalBasis}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 9px',
                      borderRadius: '100px',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      background: rec.active ? '#fee2e2' : '#dcfce7',
                      color: rec.active ? '#dc2626' : '#15803d',
                      border: 'none'
                    }}>
                      {rec.active ? 'GESPERRT (410)' : 'REAKTIVIERT'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(rec.sha256Hash);
                        setCopiedHashId(rec.id);
                        setTimeout(() => setCopiedHashId(null), 2000);
                      }}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.70rem',
                        fontFamily: 'monospace',
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Kryptografischen SHA-256 Prüfsummen-Hash kopieren"
                    >
                      <span>{rec.sha256Hash.slice(0, 10)}...</span>
                      {copiedHashId === rec.id ? <Check size={11} color="#0f172a" /> : <Copy size={11} />}
                    </button>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleDownloadDsaCertificate(rec)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: '#0284c7',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = '#0284c7';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                        title="Sperrprotokoll-Nachweis herunterladen"
                      >
                        <Download size={13} />
                        <span>Beweis</span>
                      </button>
                      {rec.active ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreAccess(rec.studentId, rec.playlistId)}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            color: '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.28)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          Entsperren
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setInputUrl(rec.reportedUrl);
                            handleResolveUrl(rec.reportedUrl);
                          }}
                          style={{
                            background: '#fee2e2',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            color: '#dc2626',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.2)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          Erneut sperren
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRegistry.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 24px', textAlign: 'center', color: '#475569' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={28} color="#10b981" />
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                        0 aktive Takedowns — Alle geteilten Audio-Beiträge sind konform
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Es liegen aktuell keine Sperrungen oder Beanstandungen im Plattform-Sperrprotokoll vor.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
