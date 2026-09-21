import { useState } from 'react';

export function useTeacherModalStates() {
  const [showStageToolbox, setShowStageToolbox] = useState<any>(null);
  const [editingBand, setEditingBand] = useState<any>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [activeTeacherSettingsModal, setActiveTeacherSettingsModal] = useState<any>(null);
  const [leftColumnTab, setLeftColumnTab] = useState<'briefing' | 'notes' | 'toolbox'>('briefing');
  const [bypassAbsenceView, setBypassAbsenceView] = useState(false);
  const [dismissedBanners, setDismissedBanners] = useState<Record<string, boolean>>({});

  return {
    showStageToolbox,
    setShowStageToolbox,
    editingBand,
    setEditingBand,
    showCommandPalette,
    setShowCommandPalette,
    showNotesDrawer,
    setShowNotesDrawer,
    isFeedbackModalOpen,
    setIsFeedbackModalOpen,
    isHelpCenterOpen,
    setIsHelpCenterOpen,
    activeTeacherSettingsModal,
    setActiveTeacherSettingsModal,
    leftColumnTab,
    setLeftColumnTab,
    bypassAbsenceView,
    setBypassAbsenceView,
    dismissedBanners,
    setDismissedBanners
  };
}
