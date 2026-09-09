import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CreditCard, Search, Tag, Shield, Clock, RefreshCw, Check, CheckCircle, 
  Upload, FileText, Copy, AlertCircle, Building2, User, ChevronRight, X,
  Download, FileSpreadsheet, Sparkles
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PendingUser {
  id: string;
  first_name?: string;
  last_name?: string;
  school_id: string;
  role?: string;
  is_campus_active?: boolean;
  is_groovelab_active?: boolean;
  is_active?: boolean;
  ausweis_nummer?: string;
  is_pin_activated?: boolean;
  created_at?: string;
  payment_status?: string;
  is_hardship_exempt?: boolean;
  student_billing_payment_method?: string;
  student_billing_cash_paid?: boolean;
  operator_notes?: string;
  [key: string]: any;
}

interface School {
  id: string;
  name: string;
  primary_color?: string;
  logo_url?: string | null;
  student_billing_option?: string;
  [key: string]: any;
}

interface MasterPricing {
  priceCampus: number;
  priceGroovelab: number;
  priceKombi: number;
  priceTeacher: number;
  priceStudent: number;
}

interface ReconciliationTabProps {
  pendingUsers: PendingUser[];
  schools: School[];
  masterPricing: MasterPricing;
  loadingPending: boolean;
  onRefresh: () => void;
  onBatchActivate: (ids: string[]) => Promise<void>;
  onSingleActivate: (id: string) => Promise<void>;
}

export const ReconciliationTab: React.FC<ReconciliationTabProps> = ({
  pendingUsers,
  schools,
  masterPricing,
  loadingPending,
  onRefresh,
  onBatchActivate,
  onSingleActivate
}) => {
  const [activeFilterTab, setActiveFilterTab] = useState<'open' | 'active' | 'exempt' | 'all'>('open');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  
  // Operator internal notes state per student (persisted in localStorage)
  const [userNotes, setUserNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('cg_operator_student_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleUpdateNote = (userId: string, note: string) => {
    const next = { ...userNotes, [userId]: note };
    setUserNotes(next);
    try {
      localStorage.setItem('cg_operator_student_notes', JSON.stringify(next));
    } catch {}
  };
  
  // CSV / CAMT.053 Import Modal State
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [matchedResults, setMatchedResults] = useState<{ 
    hash: string; 
    userId: string; 
    name: string; 
    amount?: string; 
    confidence: 'exact' | 'fuzzy';
    rawNote?: string;
  }[]>([]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Helper to generate unique GoBD reference CG-[HASH8]-[YYMM]
  const getReferenceCode = (user: PendingUser) => {
    const rawHash = (user.ausweis_nummer || user.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `CG-${rawHash}-${yy}${mm}`;
  };

  // Helper to anonymize student name to "Vorname N." (DSGVO compliant according to platform rules)
  const getAnonymizedName = (user: PendingUser) => {
    if (!user.first_name) return `Direktkunde ${user.id.slice(0, 8).toUpperCase()}`;
    const first = user.first_name.trim();
    const lastInitial = user.last_name ? ` ${user.last_name.trim()[0]}.` : '';
    return `${first}${lastInitial}`;
  };

  // Filter pending users
  const filteredUsers = useMemo(() => {
    return pendingUsers.filter(u => {
      // 1. Status Filter
      if (activeFilterTab === 'open' && u.is_campus_active) return false;
      if (activeFilterTab === 'active' && !u.is_campus_active) return false;
      if (activeFilterTab === 'exempt' && !u.is_hardship_exempt) return false;

      // 2. School Filter
      if (selectedSchoolId !== 'all' && u.school_id !== selectedSchoolId) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const school = schools.find(s => s.id === u.school_id);
        const ref = getReferenceCode(u).toLowerCase();
        const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        const matches = name.includes(q) || 
                        (school?.name || '').toLowerCase().includes(q) ||
                        ref.includes(q) ||
                        (u.ausweis_nummer || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [pendingUsers, activeFilterTab, selectedSchoolId, searchQuery, schools]);

  // Keep selectedUser in sync with filtered list
  useEffect(() => {
    if (selectedUser) {
      const updated = pendingUsers.find(u => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    } else if (filteredUsers.length > 0) {
      setSelectedUser(filteredUsers[0]);
    }
  }, [pendingUsers]);

  // Keyboard navigation (macOS HIG: Up/Down arrows to step through items)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (filteredUsers.length === 0) return;

      const currentIndex = selectedUser ? filteredUsers.findIndex(u => u.id === selectedUser.id) : -1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < filteredUsers.length - 1 ? currentIndex + 1 : 0;
        setSelectedUser(filteredUsers[nextIndex]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredUsers.length - 1;
        setSelectedUser(filteredUsers[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredUsers, selectedUser]);

  // Statistics counters
  const openCount = pendingUsers.filter(u => !u.is_campus_active).length;
  const activeCount = pendingUsers.filter(u => u.is_campus_active).length;
  const exemptCount = pendingUsers.filter(u => u.is_hardship_exempt).length;
  const totalOpenAmount = (openCount * (masterPricing.priceStudent || 0.49) * 12).toFixed(2).replace('.', ',');

  // Smart CAMT.053 XML and Bank-CSV Parsing Engine
  const parseBankData = (rawText: string) => {
    if (!rawText.trim()) return;
    const results: { 
      hash: string; 
      userId: string; 
      name: string; 
      amount?: string; 
      confidence: 'exact' | 'fuzzy';
      rawNote?: string;
    }[] = [];
    const seenIds = new Set<string>();

    const isXml = rawText.includes('<BkToCstmrStmt>') || rawText.includes('<Stmt>');
    if (isXml) {
      const entryRegex = /<Ntry>([\s\S]*?)<\/Ntry>/g;
      let entryMatch;
      while ((entryMatch = entryRegex.exec(rawText)) !== null) {
        const entryBlock = entryMatch[1];
        const amtMatch = entryBlock.match(/<Amt[^>]*>([\d.,]+)<\/Amt>/);
        const amount = amtMatch ? `${amtMatch[1]} €` : '5,39 €';

        const ustrdMatches = Array.from(entryBlock.matchAll(/<Ustrd>([\s\S]*?)<\/Ustrd>/g));
        for (const uMatch of ustrdMatches) {
          const textLine = uMatch[1];
          matchTextToStudent(textLine, amount, results, seenIds);
        }
      }
    } else {
      const lines = rawText.split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        const amtMatch = line.match(/(\d+[.,]\d{2})\s*(?:EUR|€)?/i);
        const amount = amtMatch ? `${amtMatch[1].replace('.', ',')} €` : '5,39 €';
        matchTextToStudent(line, amount, results, seenIds);
      }
    }

    setMatchedResults(results);
  };

  const matchTextToStudent = (
    textLine: string, 
    amount: string, 
    results: any[], 
    seenIds: Set<string>
  ) => {
    const exactRegex = /CG-([A-Z0-9]{6,12})-(\d{4})/gi;
    const exactMatches = Array.from(textLine.matchAll(exactRegex));
    
    for (const match of exactMatches) {
      const fullCode = match[0].toUpperCase();
      const hashPart = match[1].toUpperCase();

      const foundUser = pendingUsers.find(u => {
        const uHash = (u.ausweis_nummer || u.id).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return uHash.startsWith(hashPart) || hashPart.startsWith(uHash.slice(0, 8));
      });

      if (foundUser && !seenIds.has(foundUser.id)) {
        seenIds.add(foundUser.id);
        results.push({
          hash: fullCode,
          userId: foundUser.id,
          name: getAnonymizedName(foundUser),
          amount,
          confidence: 'exact',
          rawNote: textLine.slice(0, 80)
        });
        return;
      }
    }

    const fuzzyRegex = /CG[\s-_]*([A-Z0-9]{6,10})/gi;
    const fuzzyMatches = Array.from(textLine.matchAll(fuzzyRegex));
    for (const fMatch of fuzzyMatches) {
      const hashPart = fMatch[1].toUpperCase();
      const foundUser = pendingUsers.find(u => {
        const uHash = (u.ausweis_nummer || u.id).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return uHash.startsWith(hashPart) || hashPart.startsWith(uHash.slice(0, 8));
      });

      if (foundUser && !seenIds.has(foundUser.id)) {
        seenIds.add(foundUser.id);
        results.push({
          hash: getReferenceCode(foundUser),
          userId: foundUser.id,
          name: getAnonymizedName(foundUser),
          amount,
          confidence: 'fuzzy',
          rawNote: textLine.slice(0, 80)
        });
        return;
      }
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      readFileContent(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      readFileContent(e.target.files[0]);
    }
  };

  const readFileContent = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        parseBankData(content);
      }
    };
    reader.readAsText(file);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Verwendungszweck "${text}" in Zwischenablage kopiert!`);
  };

  const handleExemptStudent = async (user: PendingUser) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_hardship_exempt: true, is_campus_active: true })
        .eq('id', user.id);
      if (error) throw error;
      showToast(`Schüler "${getAnonymizedName(user)}" als Härtefall befreit & freigeschaltet.`);
      onRefresh();
    } catch (err: any) {
      showToast('Fehler bei Härtefall-Befreiung: ' + err.message);
    }
  };

  const handleExportDatevCSV = () => {
    if (filteredUsers.length === 0) {
      showToast('Keine Schülerdaten zum Exportieren vorhanden.');
      return;
    }

    const headers = [
      'Belegnummer_GoBD',
      'Belegdatum',
      'Buchungstext',
      'Umsatz_Brutto_EUR',
      'Umsatz_Netto_EUR',
      'USt_Satz_Prozent',
      'USt_Betrag_EUR',
      'Zahlungsstatus',
      'Schueler_Hash',
      'Musikschule',
      'Plattform_Modul'
    ];

    const rows = filteredUsers.map(u => {
      const school = schools.find(s => s.id === u.school_id);
      const ref = getReferenceCode(u);
      const date = u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const status = u.is_campus_active ? 'Bezahlt_Aktiv' : (u.is_hardship_exempt ? 'Befreit_Haertefall' : 'Offen_Ausstehend');
      const gross = '5.39';
      const net = '4.53';
      const vatRate = '19';
      const vat = '0.86';
      const schoolName = (school?.name || 'Musikschule').replace(/;/g, ',');
      const bookingText = `Campus-Groovelab Jahresbeitrag ${ref} ${schoolName}`;

      return [
        ref,
        date,
        `"${bookingText}"`,
        gross,
        net,
        vatRate,
        vat,
        status,
        u.id.slice(0, 8).toUpperCase(),
        `"${schoolName}"`,
        'Campus'
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.href = url;
    link.setAttribute('download', `campus_groovelab_datev_gobd_export_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('DATEV / GoBD Revisions-Export erfolgreich heruntergeladen!');
  };

  const handleGenerateReceiptPDF = async (user: PendingUser) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const school = schools.find(s => s.id === user.school_id);
      const refCode = getReferenceCode(user);
      const now = new Date();
      const dateStr = now.toLocaleDateString('de-DE');

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Campus-Groovelab', 16, 15);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Offizielle Zahlungsbestätigung & GoBD-Beleg', 130, 15);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Zahlungsquittung', 16, 40);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Ausstellungsdatum: ${dateStr}`, 16, 47);
      doc.text(`Beleg-Referenz: ${refCode}`, 16, 52);

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(16, 60, 178, 38, 3, 3, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Empfänger & Zuordnung:', 22, 70);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Schüler/Kunde: ${getAnonymizedName(user)}`, 22, 78);
      doc.text(`Musikschule: ${school?.name || 'Partner-Musikschule'}`, 22, 85);
      doc.text(`Verwendungszweck: ${refCode}`, 22, 92);

      doc.setDrawColor(203, 213, 225);
      doc.line(16, 110, 194, 110);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text('Position / Leistung', 16, 118);
      doc.text('Intervall', 110, 118);
      doc.text('USt.', 145, 118);
      doc.text('Gesamtbetrag', 170, 118);

      doc.line(16, 122, 194, 122);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text('Cloud- & Modul-Bereitstellung: Campus', 16, 132);
      doc.text('Jahresbeitrag (11 Mon.)', 110, 132);
      doc.text('19%', 145, 132);
      doc.text('5,39 EUR', 170, 132);

      doc.line(16, 140, 194, 140);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Nettobetrag:', 130, 150);
      doc.text('4,53 EUR', 170, 150);

      doc.text('USt. (19%):', 130, 157);
      doc.text('0,86 EUR', 170, 157);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Gesamtbetrag (Brutto):', 130, 166);
      doc.text('5,39 EUR', 170, 166);

      doc.setDrawColor(16, 185, 129);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(16, 185, 178, 28, 3, 3, 'FD');

      doc.setTextColor(21, 128, 61);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('✓ ZAHLUNGSEINGANG VERBUCHT & FREIGESCHALTET', 22, 197);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(22, 101, 52);
      doc.text(`Der Betrag wurde erfolgreich verbucht. Das Profil ist für das gesamte Schuljahr aktiv.`, 22, 205);

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Campus-Groovelab Cloud Platform • Revisionssicherer GoBD-Beleg • DSGVO-konform ohne Klartext-Kontoübermittlung', 16, 280);

      doc.save(`Zahlungsquittung_${refCode}.pdf`);
      showToast(`GoBD-Quittung für ${getAnonymizedName(user)} als PDF heruntergeladen!`);
    } catch (err: any) {
      showToast('Fehler bei PDF-Generierung: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.86rem',
          fontWeight: 700
        }}>
          <CheckCircle size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
                Zahlungsabgleich &amp; Aktivierungen
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.86rem', color: '#64748b', fontWeight: 550 }}>
                Zahlungseingänge für Schüler-Aktivierungen abgleichen, Bankauszüge importieren und Zugänge freischalten.
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons Toolbar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {selectedUserIds.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                {selectedUserIds.length} ausgewählt
              </span>
              <button
                onClick={() => onBatchActivate(selectedUserIds)}
                disabled={loadingPending}
                style={{
                  padding: '9px 15px',
                  borderRadius: '10px',
                  background: '#10b981',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Check size={14} /> Ausgewählte freischalten ({selectedUserIds.length})
              </button>
              <button
                onClick={() => setSelectedUserIds([])}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Aufheben
              </button>
            </div>
          )}

          {/* DATEV / GoBD CSV Export Button */}
          <button
            onClick={handleExportDatevCSV}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            title="Exportiert Buchungsdaten nach GoBD/DATEV Revisionsstandard"
          >
            <Download size={14} /> DATEV / GoBD-Export
          </button>

          {/* CAMT.053 & Bank CSV Import Button */}
          <button
            onClick={() => {
              setCsvText('');
              setMatchedResults([]);
              setShowCsvModal(true);
            }}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.25)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.15)';
            }}
          >
            <Upload size={14} /> CAMT.053 &amp; Bank-CSV abgleichen
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loadingPending}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#94a3b8';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <RefreshCw size={13} className={loadingPending ? 'animate-spin' : ''} /> Aktualisieren
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Clock size={14} color="#475569" /> Offene Zahlungen
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>{openCount}</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>({totalOpenAmount} € fällig)</span>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <CheckCircle size={14} color="#475569" /> Gematcht & Aktiv
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', fontFamily: '"Outfit", sans-serif' }}>{activeCount}</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Profile aktiv</span>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Shield size={14} color="#475569" /> Härtefälle / Befreit
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#3b82f6', fontFamily: '"Outfit", sans-serif' }}>{exemptCount}</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Befreite Schüler</span>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Tag size={14} color="#64748b" /> GoBD Referenzschema
          </div>
          <div style={{ marginTop: '6px' }}>
            <code style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px' }}>
              CG-[HASH]-[YYMM]
            </code>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '2px' }}>
          <button
            onClick={() => setActiveFilterTab('open')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeFilterTab === 'open' ? '#ffffff' : 'transparent',
              color: activeFilterTab === 'open' ? '#0f172a' : '#64748b',
              boxShadow: activeFilterTab === 'open' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Offen ({openCount})
          </button>
          <button
            onClick={() => setActiveFilterTab('active')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeFilterTab === 'active' ? '#ffffff' : 'transparent',
              color: activeFilterTab === 'active' ? '#0f172a' : '#64748b',
              boxShadow: activeFilterTab === 'active' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Aktiv & Bezahlt ({activeCount})
          </button>
          <button
            onClick={() => setActiveFilterTab('exempt')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeFilterTab === 'exempt' ? '#ffffff' : 'transparent',
              color: activeFilterTab === 'exempt' ? '#0f172a' : '#64748b',
              boxShadow: activeFilterTab === 'exempt' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Befreit ({exemptCount})
          </button>
          <button
            onClick={() => setActiveFilterTab('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeFilterTab === 'all' ? '#ffffff' : 'transparent',
              color: activeFilterTab === 'all' ? '#0f172a' : '#64748b',
              boxShadow: activeFilterTab === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Alle ({pendingUsers.length})
          </button>
        </div>

        {/* School Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={15} color="#64748b" />
          <select
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#0f172a',
              outline: 'none'
            }}
          >
            <option value="all">Alle Musikschulen ({schools.length})</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Search Field */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Name, Schule, CG-Code..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Main Split-Screen: Master List & Apple HIG Inset-Grouped Detail Stage */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', minHeight: '560px' }}>
        
        {/* Left: Students Master List */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 24px -4px rgba(0,0,0,0.04)'
        }}>
          {/* List Header */}
          <div style={{
            padding: '12px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.76rem',
            color: '#64748b',
            fontWeight: 700
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedUserIds(filteredUsers.map(u => u.id));
                  } else {
                    setSelectedUserIds([]);
                  }
                }}
                style={{ width: '15px', height: '15px', borderRadius: '4px', cursor: 'pointer' }}
              />
              <span>Alle {filteredUsers.length} auswählen</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>↑/↓ Navigieren</span>
              <span>{filteredUsers.length} Einträge</span>
            </div>
          </div>

          {/* List Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', maxHeight: '620px' }}>
            {loadingPending ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#0f172a' }} />
                <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>Lade Schüler- und Zahlungsdaten...</div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '70px 20px', textAlign: 'center', color: '#64748b' }}>
                <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>Keine Zahlungsrückstände</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Alle angezeigten Schüler-Zahlungen sind abgeglichen.</div>
              </div>
            ) : (
              filteredUsers.map(u => {
                const school = schools.find(s => s.id === u.school_id);
                const isSelected = selectedUserIds.includes(u.id);
                const isFocused = selectedUser?.id === u.id;
                const refCode = getReferenceCode(u);

                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: isFocused ? '#eff6ff' : '#ffffff',
                      border: isFocused ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                      marginBottom: '6px',
                      transition: 'all 0.15s ease',
                      boxShadow: isFocused ? '0 2px 8px rgba(59, 130, 246, 0.08)' : 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds(prev => [...prev, u.id]);
                        } else {
                          setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                        }
                      }}
                      style={{ width: '15px', height: '15px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}
                    />

                    {/* Monogram / Avatar */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: school?.primary_color ? `${school.primary_color}18` : '#e0f2fe',
                      color: school?.primary_color || '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      <User size={16} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>
                          {getAnonymizedName(u)}
                        </strong>
                        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: u.is_campus_active ? '#15803d' : '#d97706' }}>
                          5,39 € / J.
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b' }}>
                          {school?.name || 'Musikschule'}
                        </span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <code style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0284c7', background: '#f0f9ff', padding: '1px 5px', borderRadius: '4px' }}>
                          {refCode}
                        </code>
                        {u.is_campus_active ? (
                          <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#15803d', background: '#f0fdf4', padding: '1px 6px', borderRadius: '4px' }}>
                            Aktiv
                          </span>
                        ) : u.is_hardship_exempt ? (
                          <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px' }}>
                            Befreit
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>
                            Offen
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={14} color={isFocused ? '#3b82f6' : '#94a3b8'} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Apple HIG Inset-Grouped Detail Stage */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)'
        }}>
          {selectedUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Detail Header Hero */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: '#f1f5f9',
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: 900
                  }}>
                    {selectedUser.first_name ? selectedUser.first_name[0].toUpperCase() : 'C'}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Schüler-Zahlungsakte &amp; GoBD-Status
                    </span>
                    <h3 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                      {getAnonymizedName(selectedUser)}
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                      {schools.find(s => s.id === selectedUser.school_id)?.name || 'Musikschule'}
                    </span>
                  </div>
                </div>

                {selectedUser.is_campus_active ? (
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '8px' }}>
                    ● Aktiv / Bezahlt
                  </span>
                ) : selectedUser.is_hardship_exempt ? (
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '8px' }}>
                    ● Härtefall befreit
                  </span>
                ) : (
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '8px' }}>
                    ● Zahlung Ausstehend
                  </span>
                )}
              </div>

              {/* Apple Action Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!selectedUser.is_campus_active && (
                  <button
                    onClick={async () => {
                      await onSingleActivate(selectedUser.id);
                      showToast(`Zahlung für ${getAnonymizedName(selectedUser)} bestätigt & Schüler freigeschaltet.`);
                    }}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '10px',
                      background: '#10b981',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Check size={16} /> Zahlungseingang bestätigen &amp; freischalten
                  </button>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {!selectedUser.is_hardship_exempt && (
                    <button
                      onClick={() => handleExemptStudent(selectedUser)}
                      style={{
                        padding: '9px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Shield size={13} /> Härtefall-Befreiung
                    </button>
                  )}

                  <button
                    onClick={() => handleGenerateReceiptPDF(selectedUser)}
                    style={{
                      padding: '9px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <FileText size={13} /> GoBD-Quittung (PDF)
                  </button>
                </div>
              </div>

              {/* Apple Inset Group 1: Verwendungszweck & Revisionscode */}
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Offizieller GoBD Verwendungszweck
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <code style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0284c7', fontFamily: 'monospace' }}>
                    {getReferenceCode(selectedUser)}
                  </code>
                  <button
                    onClick={() => handleCopyCode(getReferenceCode(selectedUser))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      color: '#475569'
                    }}
                  >
                    <Copy size={12} /> Kopieren
                  </button>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '6px' }}>
                  DSGVO-Datenminimierung: Keine Klarnamen von Minderjährigen auf Bankauszügen.
                </div>
              </div>

              {/* Apple Inset Group 2: Abrechnung & Steueraufschlüsselung */}
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Cloud- &amp; Modul-Bereitstellung (Campus)</span>
                  <strong style={{ color: '#0f172a' }}>0,49 € / Mo.</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Modul GrooveLab (Band &amp; Songs)</span>
                  <strong style={{ color: '#10b981' }}>0,00 € (Schule zahlt)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Abrechnungsintervall</span>
                  <strong style={{ color: '#0f172a' }}>Jahresbeitrag (11 Monate, 1. Mo. frei)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Nettobetrag (19% MwSt.)</span>
                  <strong style={{ color: '#0f172a' }}>4,53 € Netto + 0,86 € USt.</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontSize: '0.90rem' }}>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Gesamtbetrag Überweisung</span>
                  <strong style={{ fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>5,39 €</strong>
                </div>
              </div>

              {/* Apple Inset Group 3: Interne Betreiber-Notiz */}
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Interne Betreiber-Notiz (GoBD-Vermerk)
                </div>
                <input
                  type="text"
                  placeholder="z. B. Überweisung eingegangen am 03.09., Quittung #104..."
                  value={userNotes[selectedUser.id] || selectedUser.operator_notes || ''}
                  onChange={(e) => handleUpdateNote(selectedUser.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.76rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>
              <User size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#475569' }}>Kein Schüler ausgewählt</div>
              <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Wähle einen Schüler aus der Liste aus oder nutze ↑/↓ zur Navigation.</div>
            </div>
          )}
        </div>
      </div>

      {/* Smart CAMT.053 & Bank-CSV Abgleich Modal */}
      {showCsvModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            maxWidth: '660px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                    CAMT.053 &amp; Bank-CSV Zahlungsabgleich
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Automatisches Matching mit Zero-Retention (Keine Speicherung von Eltern-IBANs)
                  </span>
                </div>
              </div>
              <button onClick={() => setShowCsvModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Native Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDraggingFile ? '2px dashed #3b82f6' : '2px dashed #cbd5e1',
                background: isDraggingFile ? '#eff6ff' : '#f8fafc',
                borderRadius: '16px',
                padding: '28px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xml"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
              <FileSpreadsheet size={32} color={isDraggingFile ? '#3b82f6' : '#64748b'} style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                Kontoauszug hier hineinziehen oder klicken
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                Unterstützt CAMT.053 XML (SEPA-Standard) sowie alle deutschen Bank-CSVs (Sparkasse, Deutsche Bank, ING, DKB, N26).
              </div>
            </div>

            {/* Textarea Fallback */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                Oder Auszugstext direkt einfügen:
              </div>
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parseBankData(e.target.value);
                }}
                placeholder="Beispiel: 2026-08-13; Überweisung; 5,39 EUR; Verwendungszweck: CG-F63B8EDE-2607..."
                rows={4}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
            </div>

            {/* Match Results */}
            {matchedResults.length > 0 ? (
              <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '16px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} /> {matchedResults.length} Zahlungen erfolgreich erkannt:
                </div>
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                  {matchedResults.map((r, i) => (
                    <div key={i} style={{ fontSize: '0.76rem', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong>{r.name}</strong>
                        <code style={{ fontSize: '0.70rem', color: '#0284c7' }}>{r.hash}</code>
                        {r.confidence === 'fuzzy' && (
                          <span style={{ fontSize: '0.62rem', background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                            Tippfehler korrigiert
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: 800 }}>{r.amount || '5,39 €'}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={async () => {
                    await onBatchActivate(matchedResults.map(r => r.userId));
                    setShowCsvModal(false);
                    showToast(`${matchedResults.length} Schüler per Bankabgleich freigeschaltet.`);
                  }}
                  style={{
                    marginTop: '14px',
                    width: '100%',
                    padding: '11px',
                    borderRadius: '10px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  Alle {matchedResults.length} gematchten Schüler jetzt freischalten
                </button>
              </div>
            ) : csvText.trim() ? (
              <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '12px', border: '1px solid #fde68a', fontSize: '0.78rem', color: '#92400e' }}>
                Keine passenden CG-Verwendungszwecke im eingefügten Text gefunden. Bitte prüfen, ob die Codes das Format <code>CG-[HASH]-[YYMM]</code> aufweisen.
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
};
