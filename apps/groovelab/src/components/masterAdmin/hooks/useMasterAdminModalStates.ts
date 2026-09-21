import { useState, useCallback } from 'react';

export function useMasterAdminModalStates() {
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [isAkademieOpen, setIsAkademieOpen] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);
  const [showLegalNoticeModal, setShowLegalNoticeModal] = useState(false);
  const [selectedReportMonth] = useState(() => new Date().toISOString().substring(0, 7));

  const showToast = useCallback((msg: string) => {
    setSaveSuccessToast(msg);
    const timer = setTimeout(() => setSaveSuccessToast(null), 3500);
    return () => clearTimeout(timer);
  }, []);

  return {
    saveSuccessToast,
    setSaveSuccessToast,
    showToast,
    commandPaletteOpen,
    setCommandPaletteOpen,
    commandSearch,
    setCommandSearch,
    isAkademieOpen,
    setIsAkademieOpen,
    showMonthlyReportModal,
    setShowMonthlyReportModal,
    showLegalNoticeModal,
    setShowLegalNoticeModal,
    selectedReportMonth,
  };
}
