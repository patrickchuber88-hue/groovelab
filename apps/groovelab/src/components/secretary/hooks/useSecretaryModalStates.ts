import { useState } from 'react';

export interface UseSecretaryModalStatesOptions {
  schoolId?: string;
}

export interface UseSecretaryModalStatesReturn {
  showAgb: boolean;
  setShowAgb: React.Dispatch<React.SetStateAction<boolean>>;
  showPrivacy: boolean;
  setShowPrivacy: React.Dispatch<React.SetStateAction<boolean>>;
  showDpoIdCardModal: boolean;
  setShowDpoIdCardModal: React.Dispatch<React.SetStateAction<boolean>>;
  showDpoPortalModal: boolean;
  setShowDpoPortalModal: React.Dispatch<React.SetStateAction<boolean>>;
  showOwnQrModal: boolean;
  setShowOwnQrModal: React.Dispatch<React.SetStateAction<boolean>>;
  qrModalUser: any | null;
  setQrModalUser: React.Dispatch<React.SetStateAction<any | null>>;
  showGuidanceModal: boolean;
  setShowGuidanceModal: React.Dispatch<React.SetStateAction<boolean>>;
  showParentInfoSheetModal: boolean;
  setShowParentInfoSheetModal: React.Dispatch<React.SetStateAction<boolean>>;
  guidanceInitialTab: 'teacher' | 'parent';
  setGuidanceInitialTab: React.Dispatch<React.SetStateAction<'teacher' | 'parent'>>;
  showDualRoleNotice: boolean;
  setShowDualRoleNotice: React.Dispatch<React.SetStateAction<boolean>>;
  isAvvSigned: boolean;
  setIsAvvSigned: React.Dispatch<React.SetStateAction<boolean>>;
  showAvvModal: boolean;
  setShowAvvModal: React.Dispatch<React.SetStateAction<boolean>>;
  isFeedbackModalOpen: boolean;
  setIsFeedbackModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dismissedInvoiceAlert: boolean;
  setDismissedInvoiceAlert: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useSecretaryModalStates({ schoolId }: UseSecretaryModalStatesOptions): UseSecretaryModalStatesReturn {
  const [showAgb, setShowAgb] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);
  const [showDpoIdCardModal, setShowDpoIdCardModal] = useState<boolean>(false);
  const [showDpoPortalModal, setShowDpoPortalModal] = useState<boolean>(false);
  const [showOwnQrModal, setShowOwnQrModal] = useState<boolean>(false);
  const [qrModalUser, setQrModalUser] = useState<any | null>(null);
  const [showGuidanceModal, setShowGuidanceModal] = useState<boolean>(false);
  const [showParentInfoSheetModal, setShowParentInfoSheetModal] = useState<boolean>(false);
  const [guidanceInitialTab, setGuidanceInitialTab] = useState<'teacher' | 'parent'>('teacher');

  const [showDualRoleNotice, setShowDualRoleNotice] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && sessionStorage.getItem('groovelab_dual_role_switched_notice') === 'true';
    } catch {
      return false;
    }
  });

  const [isAvvSigned, setIsAvvSigned] = useState<boolean>(true);
  const [showAvvModal, setShowAvvModal] = useState<boolean>(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  const [dismissedInvoiceAlert, setDismissedInvoiceAlert] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && schoolId ? localStorage.getItem(`dismissedInvoiceAlert_${schoolId}`) === 'true' : false;
    } catch {
      return false;
    }
  });

  return {
    showAgb,
    setShowAgb,
    showPrivacy,
    setShowPrivacy,
    showDpoIdCardModal,
    setShowDpoIdCardModal,
    showDpoPortalModal,
    setShowDpoPortalModal,
    showOwnQrModal,
    setShowOwnQrModal,
    qrModalUser,
    setQrModalUser,
    showGuidanceModal,
    setShowGuidanceModal,
    showParentInfoSheetModal,
    setShowParentInfoSheetModal,
    guidanceInitialTab,
    setGuidanceInitialTab,
    showDualRoleNotice,
    setShowDualRoleNotice,
    isAvvSigned,
    setIsAvvSigned,
    showAvvModal,
    setShowAvvModal,
    isFeedbackModalOpen,
    setIsFeedbackModalOpen,
    dismissedInvoiceAlert,
    setDismissedInvoiceAlert
  };
}
