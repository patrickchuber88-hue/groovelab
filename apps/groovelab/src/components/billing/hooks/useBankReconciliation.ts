import { useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { parseBankStatementFile, BankStatementParseResult } from '../../../utils/camtParser';
import { Invoice, getSchoolNumericId } from '../types';

export function useBankReconciliation(
  showActionToast: (msg: string) => void,
  setActiveFinanceSubTab?: (tab: any) => void
) {
  const [camtUploadModalOpen, setCamtUploadModalOpen] = useState<boolean>(false);
  const [camtRawInput, setCamtRawInput] = useState<string>('');
  const [camtParsedResult, setCamtParsedResult] = useState<BankStatementParseResult | null>(null);
  const [camtApplying, setCamtApplying] = useState<boolean>(false);
  const [isDraggingBankFile, setIsDraggingBankFile] = useState<boolean>(false);
  const [bankFileDetails, setBankFileDetails] = useState<{ name: string; size: string } | null>(null);
  const [showManualPaste, setShowManualPaste] = useState<boolean>(false);
  const bankFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleBankFileUpload = (file: File) => {
    if (!file) return;
    setBankFileDetails({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB'
    });
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      if (content) {
        setCamtRawInput(content);
        handleProcessBankStatement(content);
      }
    };
    reader.readAsText(file);
  };

  const handleBankFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBankFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBankFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleProcessBankStatement = (rawContent: string) => {
    try {
      const result = parseBankStatementFile(rawContent);
      setCamtParsedResult(result);
      showActionToast(`🔍 Bankauszug analysiert: ${result.b2bMatches.length} B2B- & ${result.b2cMatches.length} B2C-Zahlungen erkannt.`);
    } catch (err: any) {
      alert('Fehler beim Parsen des Bankauszugs: ' + err.message);
    }
  };

  const handleApplyCamtBookings = async (invoices: Invoice[], fetchBillingData: () => void) => {
    if (!camtParsedResult) return;
    setCamtApplying(true);
    try {
      let b2bBooked = 0;
      let b2cBooked = 0;

      // 1. Verbucht B2B-Zahlungen
      camtParsedResult.b2bMatches.forEach(tx => {
        if (tx.matchedId) {
          const invMatch = invoices.find(inv => {
            const numId = getSchoolNumericId(inv.schoolId);
            const regex = new RegExp(`^RE-${numId}-\\d{4}-\\d{2}$`);
            return regex.test(tx.matchedId || '');
          });
          if (invMatch) {
            let currentPaid: string[] = [];
            try {
              const raw = localStorage.getItem(`paid_invoices_${invMatch.schoolId}`);
              currentPaid = raw ? JSON.parse(raw) : [];
            } catch {
              currentPaid = [];
            }
            if (!currentPaid.includes(tx.matchedId)) {
              localStorage.setItem(`paid_invoices_${invMatch.schoolId}`, JSON.stringify([...currentPaid, tx.matchedId]));
              b2bBooked++;
            }
          }
        }
      });

      // 2. Verbucht B2C-Zahlungen
      for (const tx of camtParsedResult.b2cMatches) {
        if (tx.matchedId) {
          const rawHash = tx.matchedId.replace(/[^A-Z0-9]/gi, '').substring(2, 10).toUpperCase();
          const { data: matchedUsers } = await supabase
            .from('users')
            .select('id, ausweis_nummer')
            .eq('is_active', false);
          
          const found = (matchedUsers || []).find(u => 
            (u.ausweis_nummer || u.id).replace(/[^A-Z0-9]/gi, '').toUpperCase().startsWith(rawHash)
          );

          if (found) {
            await supabase.from('users').update({
              is_active: true,
              is_campus_active: true,
              student_billing_cash_paid: true
            }).eq('id', found.id);
            b2cBooked++;
          }
        }
      }

      showActionToast(`✓ Automatischer Zahlungsabgleich: ${b2bBooked} Schulrechnungen & ${b2cBooked} Schülerzugänge aktiviert!`);
      setCamtUploadModalOpen(false);
      setCamtParsedResult(null);
      setCamtRawInput('');
      fetchBillingData();
    } catch (err: any) {
      alert('Fehler beim automatischen Verbuchen: ' + err.message);
    } finally {
      setCamtApplying(false);
    }
  };

  return {
    camtUploadModalOpen,
    setCamtUploadModalOpen,
    camtRawInput,
    setCamtRawInput,
    camtParsedResult,
    setCamtParsedResult,
    camtApplying,
    isDraggingBankFile,
    setIsDraggingBankFile,
    bankFileDetails,
    setBankFileDetails,
    showManualPaste,
    setShowManualPaste,
    bankFileInputRef,
    handleBankFileUpload,
    handleBankFileDrop,
    handleProcessBankStatement,
    handleApplyCamtBookings
  };
}
