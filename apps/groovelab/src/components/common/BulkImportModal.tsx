import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, Check, AlertTriangle, X, RefreshCw, 
  ShieldCheck, ArrowRight, Download, Users, CheckCircle2,
  GraduationCap, HelpCircle, Eye, Info
} from 'lucide-react';
import { normalizeInstrument } from '../../utils/instruments';
import { executeResilientBatch, BatchProgress } from '../../lib/batchOperations';
import { supabase } from '../../lib/supabase';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string | number;
  schoolName: string;
  teachers?: { id: string; name: string }[];
  onImportComplete?: (count: number) => void;
}

interface ExistingStudent {
  id: string;
  name: string;
  instrument?: string;
  teacher_id?: string;
}

interface ParsedRow {
  originalFirstName: string;
  originalLastName: string;
  sanitizedName: string;
  instrument: string;
  teacherName?: string;
  teacherId?: string;
  email?: string;
  status: 'NEW' | 'EXISTING' | 'INVALID';
  existingStudentId?: string;
  error?: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  teachers = [],
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [step, setStep] = useState<'UPLOAD' | 'PREVIEW' | 'IMPORTING' | 'SUCCESS'>('UPLOAD');
  const [progress, setProgress] = useState<BatchProgress<ParsedRow> | null>(null);
  const [importCount, setImportCount] = useState(0);
  const [existingPreservedCount, setExistingPreservedCount] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [existingStudents, setExistingStudents] = useState<ExistingStudent[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing students from Supabase to enable Smart Delta-Sync (Optimierung 4)
  useEffect(() => {
    if (isOpen && schoolId) {
      fetchExistingStudents();
    }
  }, [isOpen, schoolId]);

  const fetchExistingStudents = async () => {
    setIsLoadingExisting(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, instrument, teacher_id')
        .eq('school_id', schoolId)
        .eq('role', 'student');
      
      if (!error && data) {
        setExistingStudents(data as ExistingStudent[]);
      }
    } catch (err) {
      console.warn('[BulkImportModal] Could not fetch existing students for delta sync:', err);
    } finally {
      setIsLoadingExisting(false);
    }
  };

  if (!isOpen) return null;

  // Optimierung 2: Encoding- & Mojibake-Reparatur (Windows-1252 / ANSI / UTF-8 BOM Fix)
  const fixMojibakeAndEncoding = (str: string): string => {
    if (!str) return '';
    // Strip UTF-8 BOM
    let text = str.replace(/^\uFEFF/, '');
    
    // Replace common Mojibake patterns (ISO-8859-1 / Windows-1252 decoded as UTF-8)
    const mojibakeMap: Record<string, string> = {
      'Ã¤': 'ä', 'Ã¶': 'ö', 'Ã¼': 'ü', 'ÃŸ': 'ß',
      'Ã„': 'Ä', 'Ã–': 'Ö', 'Ãœ': 'Ü',
      'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
      'Ã ': 'à', 'Ã¨': 'è', 'Ã¬': 'ì', 'Ã²': 'ò', 'Ã¹': 'ù',
      'â€“': '–', 'â€”': '—', 'â€ž': '„', 'â€œ': '“', 'â€™': '’',
      'Ã±': 'ñ', 'Ã§': 'ç'
    };

    for (const [bad, good] of Object.entries(mojibakeMap)) {
      text = text.split(bad).join(good);
    }
    return text;
  };

  // Optimierung 5: DSGVO Sanitize Name: "Max Mustermann" -> "Max M."
  const sanitizeStudentName = (firstName: string, lastName: string): string => {
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    if (!cleanLast) return cleanFirst;
    return `${cleanFirst} ${cleanLast.charAt(0).toUpperCase()}.`;
  };

  // Parse CSV / TSV text with bulletproof delimiter detection & data minimization
  const parseCSVContent = (rawText: string) => {
    const text = fixMojibakeAndEncoding(rawText);
    const firstLine = text.split(/\r\n|\n/)[0];
    
    // Delimiter detection: Count semicolons, tabs, and commas (prefer semicolon for German exports)
    const semiCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;

    let delimiter = ';';
    if (tabCount > semiCount && tabCount > commaCount) delimiter = '\t';
    else if (commaCount > semiCount && commaCount > tabCount) delimiter = ',';

    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      alert('Die Datei enthält keine Datenzeilen.');
      return;
    }

    const rawHeaders = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
    setHeaders(rawHeaders);

    // Identify Column Indices
    let firstIdx = rawHeaders.findIndex(h => /vorname|first|fname/i.test(h));
    let lastIdx = rawHeaders.findIndex(h => /nachname|last|lname|familienname|zuname/i.test(h));
    let instrIdx = rawHeaders.findIndex(h => /instrument|fach|kurs|modul|hauptfach/i.test(h));
    let teacherIdx = rawHeaders.findIndex(h => /lehrer|lehrkraft|dozent|teacher|coach|dozent_name|lehrkraft_kuerzel/i.test(h));
    let emailIdx = rawHeaders.findIndex(h => /mail|e-mail/i.test(h));

    // Fallback if only one "Name" or "Schüler" column exists
    if (firstIdx === -1 && lastIdx === -1) {
      firstIdx = rawHeaders.findIndex(h => /schueler|schüler|name|teilnehmer/i.test(h));
    }
    const isCombinedName = firstIdx !== -1 && lastIdx === -1;

    const parsed: ParsedRow[] = [];

    // Pre-index existing students for O(1) matching in Delta-Sync
    const existingMap = new Map<string, ExistingStudent>();
    existingStudents.forEach(s => {
      const cleanName = (s.name || '').toLowerCase().trim();
      const cleanInstr = (s.instrument || '').toLowerCase().trim();
      existingMap.set(`${cleanName}|${cleanInstr}`, s);
      existingMap.set(cleanName, s); // Fallback match by name
    });

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (row.length === 0 || (row.length === 1 && !row[0])) continue;

      let firstName = '';
      let lastName = '';

      if (isCombinedName) {
        const full = row[firstIdx] || '';
        if (full.includes(',')) {
          // Format "Mustermann, Max"
          const parts = full.split(',');
          lastName = parts[0]?.trim() || '';
          firstName = parts[1]?.trim() || '';
        } else {
          // Format "Max Mustermann"
          const parts = full.split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
      } else {
        firstName = firstIdx !== -1 ? row[firstIdx] || '' : (row[0] || '');
        lastName = lastIdx !== -1 ? row[lastIdx] || '' : (row[1] || '');
      }

      // Clean & sanitize
      firstName = fixMojibakeAndEncoding(firstName).trim();
      lastName = fixMojibakeAndEncoding(lastName).trim();

      const rawInstrument = instrIdx !== -1 ? row[instrIdx] || 'Allgemein' : 'Allgemein';
      const instrument = normalizeInstrument(fixMojibakeAndEncoding(rawInstrument));
      const rawTeacher = teacherIdx !== -1 ? fixMojibakeAndEncoding(row[teacherIdx] || '') : '';
      const email = emailIdx !== -1 ? row[emailIdx] || '' : '';

      // Match teacher if available
      let matchedTeacherId: string | undefined;
      if (rawTeacher && teachers.length > 0) {
        const found = teachers.find(t => t.name.toLowerCase().includes(rawTeacher.toLowerCase()) || rawTeacher.toLowerCase().includes(t.name.toLowerCase()));
        if (found) matchedTeacherId = found.id;
      }

      const sanitizedName = sanitizeStudentName(firstName, lastName);
      const isValid = Boolean(sanitizedName && sanitizedName.length >= 2);

      // Optimierung 4: Smart Delta-Sync Classification
      let rowStatus: ParsedRow['status'] = 'NEW';
      let existingMatch: ExistingStudent | undefined;

      if (!isValid) {
        rowStatus = 'INVALID';
      } else if (targetType === 'STUDENT') {
        const lookupKeyWithInstr = `${sanitizedName.toLowerCase()}|${instrument.toLowerCase()}`;
        const lookupKeyNameOnly = sanitizedName.toLowerCase();
        existingMatch = existingMap.get(lookupKeyWithInstr) || existingMap.get(lookupKeyNameOnly);

        if (existingMatch) {
          rowStatus = 'EXISTING';
        }
      }

      parsed.push({
        originalFirstName: firstName,
        originalLastName: lastName,
        sanitizedName,
        instrument,
        teacherName: rawTeacher,
        teacherId: matchedTeacherId,
        email,
        status: rowStatus,
        existingStudentId: existingMatch?.id,
        error: !isValid ? 'Vorname fehlt' : undefined
      });
    }

    setParsedRows(parsed);
    setStep('PREVIEW');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) parseCSVContent(content);
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleDownloadSampleCSV = () => {
    const csv = targetType === 'STUDENT'
      ? 'Vorname;Nachname;Instrument;Lehrkraft\nMax;Mustermann;Klavier;Herr Schmidt\nAnna;Müller;Gitarre;Frau Weber\nLeon;Bauer;Schlagzeug;Herr Schmidt\n'
      : 'Vorname;Nachname;Instrument;E-Mail\nThomas;Schmidt;Klavier;schmidt@musikschule.de\nSarah;Weber;Gitarre;weber@musikschule.de\n';
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Muster_${targetType === 'STUDENT' ? 'Schuelerliste' : 'Lehrerliste'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const executeImport = async () => {
    const newRows = parsedRows.filter(r => r.status === 'NEW');
    const existingRows = parsedRows.filter(r => r.status === 'EXISTING');
    
    setStep('IMPORTING');
    setImportErrors([]);

    let createdCount = 0;

    if (newRows.length > 0) {
      const batchResult = await executeResilientBatch<ParsedRow, any>(
        newRows,
        async (row) => {
          if (targetType === 'STUDENT') {
            const { data, error } = await supabase.from('users').insert([{
              school_id: schoolId,
              name: row.sanitizedName,
              role: 'student',
              instrument: row.instrument,
              teacher_id: row.teacherId || null,
              status: 'active',
              is_campus_active: true,
              is_groovelab_active: false,
              created_at: new Date().toISOString()
            }]).select();

            if (error) throw error;
            return data;
          } else {
            // Teacher Import
            const { data, error } = await supabase.from('users').insert([{
              school_id: schoolId,
              name: `${row.originalFirstName} ${row.originalLastName}`.trim(),
              role: 'teacher',
              instrument: row.instrument,
              email: row.email || null,
              status: 'active',
              created_at: new Date().toISOString()
            }]).select();

            if (error) throw error;
            return data;
          }
        },
        {
          chunkSize: 10,
          maxRetries: 3,
          onProgress: (p) => setProgress(p)
        }
      );

      if (batchResult.success) {
        createdCount = batchResult.results.length;
      } else {
        setImportErrors(batchResult.failedItems.map(f => `Zeile ${f.index + 1}: ${f.error?.message || 'Fehler beim DB-Schreiben'}`));
        setStep('PREVIEW');
        return;
      }
    }

    setImportCount(createdCount);
    setExistingPreservedCount(existingRows.length);
    setStep('SUCCESS');
    if (onImportComplete) onImportComplete(createdCount + existingRows.length);
  };

  const newRowsCount = parsedRows.filter(r => r.status === 'NEW').length;
  const existingRowsCount = parsedRows.filter(r => r.status === 'EXISTING').length;
  const invalidRowsCount = parsedRows.filter(r => r.status === 'INVALID').length;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '28px',
        width: '100%',
        maxWidth: step === 'PREVIEW' ? '920px' : '620px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        transition: 'max-width 0.25s ease'
      }} className="animate-scale-up">
        
        {/* ─── HEADER ─── */}
        <div style={{
          padding: '22px 32px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafbfc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a'
            }}>
              <Upload size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ONBOARDING-BOOSTER • {schoolName}
              </span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                {targetType === 'STUDENT' ? 'Schülerliste importieren (CSV/Excel)' : 'Lehrkräfte importieren (CSV/Excel)'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── BODY ─── */}
        <div style={{ padding: '28px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* STEP 1: UPLOAD */}
          {step === 'UPLOAD' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Type Switcher with 100% Monochrome Icons */}
              <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '14px' }}>
                <button
                  type="button"
                  onClick={() => setTargetType('STUDENT')}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: targetType === 'STUDENT' ? '#ffffff' : 'transparent',
                    color: targetType === 'STUDENT' ? '#0f172a' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: targetType === 'STUDENT' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  <GraduationCap size={16} />
                  <span>Schüler-Import (mit DSGVO-Maskierung)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('TEACHER')}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: targetType === 'TEACHER' ? '#ffffff' : 'transparent',
                    color: targetType === 'TEACHER' ? '#0f172a' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: targetType === 'TEACHER' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  <Users size={16} />
                  <span>Lehrkräfte-Import</span>
                </button>
              </div>

              {/* Optimierung 5: DSGVO Info Banner */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <ShieldCheck size={26} color="#16a34a" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.80rem', color: '#166534', lineHeight: 1.5 }}>
                  <strong>DSGVO Zero-PII Autopilot &amp; Smart Delta-Sync:</strong> Du kannst deine gewohnte CSV-Liste aus iMikel, Musikschul-Manager oder WinMusik hochladen. Schülernamen werden automatisch lokal im Browser auf <code>Max M.</code> maskiert. Private Adressen, Bankdaten oder Geburtsdaten werden im Browser sofort verworfen. Bereits bestehende Schüler werden erkannt und ihre Hausaufgaben, Streaks und XP bleiben zu 100% geschützt.
                </div>
              </div>

              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '20px',
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: '#fafbfc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#34a853'; e.currentTarget.style.background = '#f0fdf4'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#fafbfc'; }}
              >
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: '#ffffff',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16a34a'
                }}>
                  <FileText size={26} />
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0f172a' }}>
                  CSV-, Excel- oder Textdatei hier ablegen oder auswählen
                </div>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Unterstützt .csv, .tsv, .txt (Umlaute aus Windows-1252 / Excel werden automatisch korrigiert)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              {/* Sample CSV Download */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleDownloadSampleCSV}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.78rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={14} /> Muster-Vorlage (.csv) herunterladen
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === 'PREVIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Vorschau: {parsedRows.length} Datensätze erkannt
                  </h4>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                    <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
                      {newRowsCount} Neu anlegen
                    </span>
                    {existingRowsCount > 0 && (
                      <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
                        {existingRowsCount} Bereits vorhanden (Geschützt)
                      </span>
                    )}
                    {invalidRowsCount > 0 && (
                      <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626' }} />
                        {invalidRowsCount} Fehlerhaft
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setStep('UPLOAD'); setParsedRows([]); setFile(null); }}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Andere Datei wählen
                  </button>
                </div>
              </div>

              {importErrors.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '12px', color: '#dc2626', fontSize: '0.78rem' }}>
                  <strong>Fehler beim Importversuch:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                    {importErrors.slice(0, 3).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {/* Data Table */}
              <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, borderBottom: '1.5px solid #e2e8f0' }}>
                    <tr style={{ color: '#64748b', fontWeight: 800, fontSize: '0.70rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 14px' }}>#</th>
                      <th style={{ padding: '10px 14px' }}>ORIGINAL-NAME</th>
                      <th style={{ padding: '10px 14px', color: '#16a34a' }}>DSGVO-NAME (IN APP)</th>
                      <th style={{ padding: '10px 14px' }}>INSTRUMENT</th>
                      <th style={{ padding: '10px 14px' }}>STATUS &amp; DELTA-SYNC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        background: row.status === 'INVALID' ? '#fff1f2' : (row.status === 'EXISTING' ? '#f8fafc' : '#ffffff') 
                      }}>
                        <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{row.originalFirstName} {row.originalLastName}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                          <span style={{ 
                            background: row.status === 'EXISTING' ? '#eff6ff' : '#f0fdf4', 
                            color: row.status === 'EXISTING' ? '#1d4ed8' : '#166534', 
                            padding: '2px 8px', 
                            borderRadius: '6px', 
                            border: row.status === 'EXISTING' ? '1px solid #bfdbfe' : '1px solid #bbf7d0' 
                          }}>
                            {row.sanitizedName}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{row.instrument}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {row.status === 'NEW' && (
                            <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                              <Check size={14} /> Neu anlegen
                            </span>
                          )}
                          {row.status === 'EXISTING' && (
                            <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }} title="Historie, Hausaufgaben und XP bleiben geschützt">
                              <ShieldCheck size={14} /> Bereits vorhanden (Geschützt)
                            </span>
                          )}
                          {row.status === 'INVALID' && (
                            <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                              <AlertTriangle size={14} /> {row.error || 'Ungültig'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORTING */}
          {step === 'IMPORTING' && (
            <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <RefreshCw size={36} color="#16a34a" className="animate-spin" />
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                  Resilienter Smart Delta-Import läuft...
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Neue Schüler werden angelegt, bestehende Historien und Hausaufgaben bleiben geschützt.
                </p>
              </div>

              {progress && (
                <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ background: '#e2e8f0', height: '10px', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${progress.percent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #16a34a 0%, #15803d 100%)',
                      borderRadius: '100px',
                      transition: 'width 0.2s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                    <span>{progress.completed} von {progress.total} verarbeitet</span>
                    <span>{progress.percent}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'SUCCESS' && (
            <div style={{ padding: '30px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#f0fdf4',
                border: '2px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a'
              }}>
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Smart Delta-Import erfolgreich abgeschlossen!
                </h4>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                  Es wurden <strong>{importCount} neue {targetType === 'STUDENT' ? 'Schülerprofile' : 'Lehrkräfte'}</strong> datenschutzkonform angelegt.
                  {existingPreservedCount > 0 && (
                    <>
                      <br />
                      <strong>{existingPreservedCount} bestehende Schüler</strong> wurden beibehalten (Hausaufgaben, Streaks und XP blieben geschützt).
                    </>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  marginTop: '12px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px 28px',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)'
                }}
              >
                Fertigstellen &amp; Übersicht aktualisieren
              </button>
            </div>
          )}

        </div>

        {/* ─── FOOTER ─── */}
        {step === 'PREVIEW' && (
          <div style={{
            padding: '18px 32px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fafbfc'
          }}>
            <button
              type="button"
              onClick={() => { setStep('UPLOAD'); setParsedRows([]); setFile(null); }}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '9px 18px',
                borderRadius: '12px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>

            <button
              type="button"
              onClick={executeImport}
              disabled={newRowsCount === 0 && existingRowsCount === 0}
              style={{
                background: (newRowsCount === 0 && existingRowsCount === 0) ? '#e2e8f0' : '#16a34a',
                color: (newRowsCount === 0 && existingRowsCount === 0) ? '#94a3b8' : '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 24px',
                fontSize: '0.84rem',
                fontWeight: 900,
                cursor: (newRowsCount === 0 && existingRowsCount === 0) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: (newRowsCount > 0 || existingRowsCount > 0) ? '0 4px 14px rgba(22, 163, 74, 0.25)' : 'none'
              }}
            >
              <span>{newRowsCount > 0 ? `${newRowsCount} neue Datensätze importieren` : 'Aktualisieren'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
