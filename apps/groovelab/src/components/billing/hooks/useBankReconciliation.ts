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

      // Autoritativer Server-RPC Aufruf (Zero-Trust, Zero localStorage)
      const allMatches = [...camtParsedResult.b2bMatches, ...camtParsedResult.b2cMatches];
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('reconcile_camt_bank_statement', {
        p_statement_id: camtParsedResult.statementId,
        p_transactions: allMatches
      });

      if (rpcErr || !rpcRes?.success) {
        throw new Error(rpcErr?.message || rpcRes?.error || 'Fehler beim Abgleich über Server-RPC reconcile_camt_bank_statement.');
      }

      b2bBooked = rpcRes.b2b_reconciled || 0;
      b2cBooked = rpcRes.b2c_reconciled || 0;

      showActionToast(`✓ Automatischer Zahlungsabgleich: ${b2bBooked} Schulrechnungen & ${b2cBooked} Schülerzugänge in PostgreSQL aktiviert!`);
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
