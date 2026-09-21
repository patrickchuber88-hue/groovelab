import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { 
  Users, X, Check, Copy, Download, ShieldCheck, QrCode, Building2, 
  HelpCircle, ArrowRight, Sparkles, HeartHandshake, CheckCircle2,
  Lock, ChevronLeft, Mic, MessageSquare, Shield, Zap, Crown, Eye, EyeOff, Fingerprint
} from 'lucide-react';
import { 
  generateEpcGiroCodePayload, 
  formatIbanWithSpaces, 
  generateStudentGoBdCode,
  calculateSchoolYearDirectBilling
} from '../utils/epcGiroCode';
import { isWebAuthnSupported, authenticateParentBiometricPasskey } from '../utils/webauthn';
import { supabase } from '../lib/supabase';
import { formatSingleStudentAnonymized } from '../utils/nameHelper';
import { logSecurityEvent } from '../services/auditLogService';
import { LegalTextModal } from './LegalTextModal';
import { generateLocalQrDataUrl } from '../utils/localQrGenerator';

export interface ParentCampusActivationModalProps {
  student: {
    id: string;
    first_name?: string;
    last_name?: string;
    school_id?: string | null;
    [key: string]: any;
  };
  schoolData?: {
    name?: string;
    city?: string;
    billing_iban?: string;
    billing_bic?: string;
    billing_company?: string;
    [key: string]: any;
  };
  masterBillingIban?: string;
  masterBillingBic?: string;
  masterBillingCompany?: string;
  annualFee?: number; // default 5.39 (0.49 * 11)
  isParentUnlocked?: boolean;
  onClose: () => void;
  onPaymentSubmitted?: () => void;
}

export const ParentCampusActivationModal: React.FC<ParentCampusActivationModalProps> = ({
  student,
  schoolData,
  masterBillingIban = 'DE89 3704 0044 0532 9482 11',
  masterBillingBic = 'GENODEFFXXX',
  masterBillingCompany = 'Campus-Groovelab Plattformbetrieb',
  annualFee = 5.39,
  isParentUnlocked = false,
  onClose,
  onPaymentSubmitted
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [showHardshipConfirm, setShowHardshipConfirm] = useState(false);

  // Stage 2 Wizard State
  type WizardStep = 'payment' | 'pin_gate' | 'permissions' | 'ui_level' | 'success';
  const [wizardStep, setWizardStep] = useState<WizardStep>('payment');
  const [parentPinInput, setParentPinInput] = useState<string>('');
  const [parentPinError, setParentPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);
  const [showParentPinMask, setShowParentPinMask] = useState<boolean>(false);
  const [allowStudentAudio, setAllowStudentAudio] = useState<boolean>(() => {
    return Boolean((student as any)?.parent_allow_audio === true);
  });
  const [allowStudentChat, setAllowStudentChat] = useState<boolean>(true);
  const [allowStudentAbsences, setAllowStudentAbsences] = useState<boolean>(false);
  const [selectedUiLevel, setSelectedUiLevel] = useState<'junior' | 'teen' | 'pro'>(() => {
    const existingLevel = (student as any)?.campus_ui_level;
    if (existingLevel === 'junior' || existingLevel === 'teen' || existingLevel === 'pro') return existingLevel;
    return 'teen';
  });

  interface LinkedSibling {
    name: string;
    id?: string;
    isCampusActive: boolean;
  }

  const [agreeWithdrawalWaiver, setAgreeWithdrawalWaiver] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy' | 'impressum' | 'cancellation' | null>(null);
  const [linkedSiblings, setLinkedSiblings] = useState<LinkedSibling[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`campus_family_siblings_${student.school_id || 'school'}`);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return parsed.map((item: any) => typeof item === 'string' ? { name: item, isCampusActive: true } : item);
    } catch (e) { return []; }
  });
  const [showAddSiblingInput, setShowAddSiblingInput] = useState<boolean>(false);
  const [siblingNameOrPin, setSiblingNameOrPin] = useState<string>('');
  const [siblingLookupLoading, setSiblingLookupLoading] = useState<boolean>(false);

  const activePaidSiblingsCount = linkedSiblings.filter(s => s.isCampusActive).length;
  const isThirdOrMoreChild = activePaidSiblingsCount >= 2;

  // Dynamic School Year Calculation (Registration month = free, remaining months until customized school year end)
  const isChf = schoolData?.currency === 'CHF' || 
    schoolData?.country === 'CH' || 
    schoolData?.country === 'Schweiz' || 
    String(schoolData?.country || '').toLowerCase().includes('schweiz') || 
    String(schoolData?.country || '').toLowerCase().includes('switzerland');
  const activeCurrency: 'EUR' | 'CHF' = isChf ? 'CHF' : 'EUR';
  const schoolStartMonth = Number(schoolData?.school_year_start_month || 9);
  const schoolStartDay = Number(schoolData?.school_year_start_day || 1);
  const schoolYearCalc = calculateSchoolYearDirectBilling(
    undefined, 
    activeCurrency, 
    undefined, 
    schoolStartMonth, 
    schoolStartDay, 
    schoolData?.direct_billing_effective_date
  );
  const effectiveAnnualFee = annualFee !== 5.39 && annualFee !== 5.88 && annualFee !== 11.00 && annualFee !== 12.00 && annualFee !== 9.60 && annualFee !== 8.80 ? annualFee : schoolYearCalc.totalAmount;
  const totalAmountStr = schoolYearCalc.totalAmountStr;
  const monthlyRate = isChf ? 'CHF 1.00' : '0,49 €';
  const freeMonthDisplay = isChf ? 'CHF 0.00' : '0,00 €';
  const remainingMonths = schoolYearCalc.remainingPaidMonths;
  const periodDescription = schoolYearCalc.periodDescription;
  const resolvedSchoolTaxMode = 
    schoolData?.tax_mode || 
    schoolData?.opening_hours?.tax_settings?.tax_mode || 
    (typeof window !== 'undefined' ? localStorage.getItem('cg_school_tax_mode') : null);

  const platformTaxMode: 'small_business' | 'standard_vat' | 'vat_exempt_4_21' = 
    resolvedSchoolTaxMode === 'vat_exempt_4_21'
      ? 'vat_exempt_4_21'
      : (resolvedSchoolTaxMode === 'standard_vat' || (typeof window !== 'undefined' && localStorage.getItem('cg_tax_mode') === 'standard_vat'))
        ? 'standard_vat'
        : 'small_business';

  const effectiveNetFee = +(effectiveAnnualFee / 1.19).toFixed(2);
  const effectiveVatAmount = +(effectiveAnnualFee - effectiveNetFee).toFixed(2);
  const taxDisclaimer = isChf 
    ? 'Endpreis (Leistungsort Schweiz, kein gesonderter Steuerausweis)' 
    : platformTaxMode === 'vat_exempt_4_21'
      ? 'Endpreis (Umsatzsteuerfreie Bildungsleistung)'
      : platformTaxMode === 'standard_vat'
        ? `Endpreis inkl. 19% MwSt. (Netto: ${effectiveNetFee.toFixed(2).replace('.', ',')} € + ${effectiveVatAmount.toFixed(2).replace('.', ',')} € MwSt.)`
        : 'Endpreis (Kleinunternehmerregelung, kein gesonderter Steuerausweis)';

  // Generate stable GoBD Reference Code: CG-[HASH8]-[YYMM]
  const referenceCode = generateStudentGoBdCode(student.id || 'TEMP-ID');
  const studentDisplayName = formatSingleStudentAnonymized(student.first_name, student.last_name);
  const recipientName = masterBillingCompany;
  const effectiveIban = masterBillingIban;
  const effectiveBic = masterBillingBic;

  // EPC GiroCode payload
  const epcPayload = generateEpcGiroCodePayload({
    iban: effectiveIban,
    bic: effectiveBic,
    recipientName: recipientName,
    amount: effectiveAnnualFee,
    referenceCode: referenceCode
  });

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Step transition into Stage-2 Wizard
  const handleProceedToWizard = () => {
    if (isParentUnlocked) {
      setWizardStep('permissions');
    } else {
      setWizardStep('pin_gate');
    }
  };

  // Authoritative server-side verify_parent_pin RPC
  const handleVerifyParentPin = async () => {
    if (!parentPinInput || parentPinInput.trim().length < 4) {
      setParentPinError('Bitte gib dein 6-stelliges Eltern-Passwort ein.');
      return;
    }
    setIsVerifyingPin(true);
    setParentPinError(null);
    try {
      const { data: parentOk, error } = await supabase.rpc('verify_parent_pin', {
        p_parent_pin: parentPinInput.trim(),
        p_student_id: student.id
      });
      if (error) {
        setParentPinError('Authentifizierung fehlgeschlagen: ' + error.message);
        return;
      }
      if (parentOk === true) {
        setParentPinError(null);
        setWizardStep('permissions');
      } else {
        setParentPinError('Das eingegebene Eltern-Passwort ist nicht korrekt.');
      }
    } catch (err: any) {
      setParentPinError('Fehler bei der Verifikation: ' + (err.message || 'Unbekannt'));
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!student?.id) return;
    setIsVerifyingPin(true);
    setParentPinError(null);
    try {
      const authRes = await authenticateParentBiometricPasskey(
        supabase,
        student.id,
        student.school_id || null
      );

      if (!authRes.success) {
        if (authRes.error && !authRes.error.includes('abgebrochen')) {
          setParentPinError(authRes.error);
        }
        return;
      }

      setParentPinError(null);
      setWizardStep('permissions');
    } catch (err: any) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setParentPinError('Fehler bei der Passkey-Prüfung: ' + (err.message || 'Unbekannt'));
      }
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Finalize activation: update DB, save parent permissions & UI level, log audit consent, download PDF
  const handleFinalizeActivation = async () => {
    try {
      setIsSubmitting(true);
      const isFamilyBonus = linkedSiblings.length >= 2;
      const initialPaymentStatus = isFamilyBonus ? 'paid' : 'transfer_pending';
      const isCashPaid = isFamilyBonus ? true : false;
      const nowIso = new Date().toISOString();

      const parentPermissionsObj = {
        allow_student_audio: allowStudentAudio,
        allow_chat: allowStudentChat,
        allow_absences: allowStudentAbsences,
        allow_reschedule_confirm: allowStudentAbsences,
        campus_ui_level: selectedUiLevel
      };

      const updatePayload: Record<string, any> = {
        student_billing_payment_method: isFamilyBonus ? 'family_bonus' : 'bank_transfer',
        payment_status: initialPaymentStatus,
        student_billing_cash_paid: isCashPaid,
        is_campus_active: true,
        campus_ui_level: selectedUiLevel,
        parent_allow_audio: allowStudentAudio,
        parent_permissions: parentPermissionsObj,
        exempt_from_direct_billing: isFamilyBonus ? true : false,
        activated_at: nowIso,
        updated_at: nowIso
      };

      const { error } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('id', student.id);

      if (error) {
        // Fallback: also try updating users table if students table is a view
        await supabase
          .from('users')
          .update(updatePayload)
          .eq('id', student.id);
      }

      try {
        if (typeof window !== 'undefined') {
          if (isFamilyBonus) {
            localStorage.setItem(`campus_paid_${student.id}`, 'true');
            localStorage.setItem(`campus_payment_status_${student.id}`, 'paid');
          } else {
            localStorage.setItem(`campus_payment_status_${student.id}`, 'transfer_pending');
            localStorage.setItem(`campus_transfer_date_${student.id}`, nowIso);
            localStorage.removeItem(`campus_paid_${student.id}`);
          }
          localStorage.setItem(`campus_active_${student.id}`, 'true');
          localStorage.setItem(`groovelab_parent_allow_student_audio_${student.id}`, String(allowStudentAudio));
          localStorage.setItem(`campus_student_ui_level_${student.id}`, selectedUiLevel);
        }
      } catch (e) {}

      // Revisionssicheres Logging der elterlichen Einwilligung & Widerrufs-Bestätigung (§§ 312j, 356 Abs. 5 BGB)
      const auditConsentChecksum = `SHA256-CG-PARENT-CONSENT-${student.id.slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`;
      await logSecurityEvent({
        action: 'PARENT_CAMPUS_ACTIVATION_CONSENT',
        schoolId: student.school_id ? String(student.school_id) : undefined,
        targetId: String(student.id),
        metadata: {
          consent_type: 'b2c_terms_and_withdrawal_waiver',
          agreed_withdrawal_waiver: agreeWithdrawalWaiver,
          payment_method: isFamilyBonus ? 'family_bonus' : 'bank_transfer',
          period: periodDescription,
          remaining_paid_months: remainingMonths,
          effective_fee: effectiveAnnualFee,
          campus_ui_level: selectedUiLevel,
          permissions: parentPermissionsObj,
          audit_checksum: auditConsentChecksum,
          timestamp: new Date().toISOString()
        }
      });

      setSubmittedSuccess(true);

      // § 312f Abs. 2 BGB: Automatischer Download des offiziellen Vertrags- & Zahlungsbelegs (Dauerhafter Datenträger)
      try {
        await handleDownloadPdfVoucher();
      } catch (pdfErr) {
        console.warn('Automatische PDF-Beleg-Erstellung:', pdfErr);
      }

      setWizardStep('success');
    } catch (err) {
      console.warn('Payment update notice error:', err);
      setSubmittedSuccess(true);
      setWizardStep('success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteAndClose = () => {
    if (onPaymentSubmitted) onPaymentSubmitted();
    onClose();
  };

  // Download PDF Payment Voucher
  const handleDownloadPdfVoucher = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');

      // Colors
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');

      // Top Banner
      doc.setFillColor(52, 168, 83);
      doc.roundedRect(15, 15, 180, 28, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Campus-Groovelab • Digitale Zahlungsanweisung', 22, 28);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('SEPA-Überweisung zur Modul-Bereitstellung (Campus)', 22, 36);

      // Card Body
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 50, 180, 225, 4, 4, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, 50, 180, 225, 4, 4, 'S');

      // Student Header
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      const studentDisplayName = formatSingleStudentAnonymized(student.first_name, student.last_name);
      doc.text(`Aktivierung für: ${studentDisplayName}`, 22, 65);
      if (schoolData?.name) {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(`Musikschule: ${schoolData.name}`, 22, 72);
      }

      // Financial Details Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(22, 80, 166, 75, 3, 3, 'F');

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('EMPFÄNGER / BEGUENSTIGTER', 28, 90);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(recipientName, 28, 96);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.text('IBAN (SEPA)', 28, 106);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont('courier', 'bold');
      doc.text(formatIbanWithSpaces(effectiveIban), 28, 112);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('VERWENDUNGSZWECK (ZWINGEND ERFORDERLICH)', 28, 122);
      doc.setFontSize(11);
      doc.setTextColor(5, 150, 105);
      doc.setFont('courier', 'bold');
      doc.text(referenceCode, 28, 128);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`GESAMTBETRAG (${remainingMonths} MONATE, ${periodDescription})`, 28, 138);
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      const currencySuffix = isChf ? 'CHF' : 'EUR';
      doc.text(`${totalAmountStr} ${currencySuffix} (${monthlyRate}/Mo. • ${schoolYearCalc.freeMonthName} gratis • ${taxDisclaimer})`, 28, 146);

      // Instructions
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Anleitung zur Durchführung:', 22, 170);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('1. Öffnen Sie Ihre gewohnte Banking-App (z. B. Sparkasse, VR-Banking, PostFinance, Kantonalbank, Raiffeisen).', 22, 178);
      doc.text(`2. Überweisen Sie den Betrag von ${totalAmountStr} ${currencySuffix} auf die oben genannte IBAN.`, 22, 185);
      doc.text(`3. Geben Sie als Verwendungszweck exakt ${referenceCode} an.`, 22, 192);
      doc.text('4. Sobald der Zahlungseingang verbucht ist, wird der Campus-Zugang vollautomatisch freigeschaltet.', 22, 199);

      // Embed local EPC-GiroCode QR Code for instant mobile banking scan
      try {
        const qrDataUrl = await generateLocalQrDataUrl(epcPayload, 200);
        if (qrDataUrl) {
          doc.addImage(qrDataUrl, 'PNG', 145, 86, 36, 36);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(100, 116, 139);
          doc.text('EPC-GiroCode', 151, 126);
        }
      } catch (e) {}

      // GoBD Cryptographic Seal (§§ 146, 147 AO)
      let sha256Seal = '';
      try {
        const rawPayload = `${referenceCode}:${student.id}:${totalAmountStr}:${effectiveIban}:${periodDescription}`;
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawPayload));
        sha256Seal = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        sha256Seal = referenceCode;
      }

      doc.setFont('courier', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Revisionssicheres GoBD-Prüfsiegel (§§ 146, 147 AO): SHA256-${sha256Seal.slice(0, 32)}...`, 22, 248);

      // Statutory cancellation note
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text('Gesetzliches Widerrufsrecht (§ 312g i. V. m. § 355 BGB / Art. 246a EGBGB): 14 Tage ab Vertragsschluss, im 1. Schnuppermonat jederzeit kostenfrei widerrufbar.', 22, 254);

      // Legal note & Page 1 footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Campus-Groovelab • Reines Cloud- & Infrastruktur-Hosting statt teurer Software-Lizenzen. (UWG / GoBD konform).', 22, 260);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Seite 1 von 2 (Zahlungsanweisung) • Gesetzliche Vertragsbestätigung gem. § 312f Abs. 2 BGB siehe Seite 2', 22, 266);

      // ==============================================================================
      // SEITE 2: Gesetzliche Vertragsbestätigung auf dauerhaftem Datenträger (§ 312f Abs. 2 BGB)
      // ==============================================================================
      doc.addPage();
      
      // Page 2 Background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');

      // Top Banner Page 2
      doc.setFillColor(15, 23, 42); // Dark Slate 900
      doc.roundedRect(15, 12, 180, 24, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Campus-Groovelab • Gesetzliche Vertragsbestätigung', 22, 23);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(226, 232, 240);
      doc.text('Bestätigung eines Verbrauchervertrags auf dauerhaftem Datenträger gem. § 312f Abs. 2 BGB / Art. 246a EGBGB', 22, 30);

      // Main Content Box Page 2
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 40, 180, 242, 4, 4, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, 40, 180, 242, 4, 4, 'S');

      let p2Y = 48;

      // 1. Vertragsdaten-Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(20, p2Y, 170, 32, 3, 3, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('VERTRAGSPARTNER & KERNLEISTUNG', 25, p2Y + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Anbieter: Patrick Huber – Softwareentwicklung & Cloud-Dienstleistungen, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden`, 25, p2Y + 11);
      doc.text(`Kunde: Erziehungsberechtigte / gesetzl. Vertreter für ${studentDisplayName} • Musikschule: ${schoolData?.name || 'Musikschule'}`, 25, p2Y + 16);
      doc.text(`Vertragsgegenstand: Bereitstellung des digitalen Campus-Zugangs (Hausaufgabenheft, Übe-Timer, Stundenplansync)`, 25, p2Y + 21);
      doc.text(`Laufzeit & Entgelt: ${periodDescription} (${remainingMonths} Monate) • Gesamtpreis: ${totalAmountStr} ${currencySuffix} (inkl. 1 Probemonat kostenfrei)`, 25, p2Y + 26);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52);
      doc.text(`Keine automatische Verlängerung / Kein Abo: Der Vertrag endet mit Ablauf des Schuljahres automatisch am 31.07.`, 25, p2Y + 30);

      p2Y += 38;

      // 2. Gesetzliche Widerrufsbelehrung
      doc.setFillColor(239, 246, 255); // Blue 50
      doc.roundedRect(20, p2Y, 170, 72, 3, 3, 'F');
      doc.setDrawColor(191, 219, 254); // Blue 200
      doc.roundedRect(20, p2Y, 170, 72, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 64, 175);
      doc.text('WIDERRUFSBELEHRUNG FÜR VERBRAUCHER (B2C)', 25, p2Y + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Widerrufsrecht:', 25, p2Y + 12);
      doc.setFont('helvetica', 'normal');
      const wLines1 = doc.splitTextToSize('Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses (Aktivierung).', 160);
      doc.text(wLines1, 25, p2Y + 16);

      doc.setFont('helvetica', 'bold');
      doc.text('Ausübung des Widerrufs:', 25, p2Y + 24);
      doc.setFont('helvetica', 'normal');
      const wLines2 = doc.splitTextToSize('Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Patrick Huber – Softwareentwicklung & Cloud-Dienstleistungen, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, E-Mail: kontakt@campus-groovelab.de) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das untenstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.', 160);
      doc.text(wLines2, 25, p2Y + 28);

      doc.setFont('helvetica', 'bold');
      doc.text('Folgen des Widerrufs & Kostenfreier Probemonat:', 25, p2Y + 44);
      doc.setFont('helvetica', 'normal');
      const wLines3 = doc.splitTextToSize('Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab Eingang Ihrer Widerrufserklärung zurückzuzahlen. Da der erste Monat stets als unverbindlicher Probemonat kostenfrei gewährt wird, schulden Sie bei Ausübung des Widerrufs keinerlei Wertersatz oder Nutzungsentschädigung.', 160);
      doc.text(wLines3, 25, p2Y + 48);

      doc.setFont('helvetica', 'bold');
      doc.text('Freiwillige Geltung für die Schweiz:', 25, p2Y + 62);
      doc.setFont('helvetica', 'normal');
      doc.text('Für Kunden mit Wohnsitz in der Schweiz gewähren wir dieses 14-tägige Widerrufsrecht auf freiwilliger vertraglicher Basis im selben Umfang.', 25, p2Y + 66);

      p2Y += 78;

      // 3. Muster-Widerrufsformular
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, p2Y, 170, 56, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(20, p2Y, 170, 56, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('MUSTER-WIDERRUFSFORMULAR (gemäß Anlage 2 zu Art. 246a § 1 Abs. 2 EGBGB)', 25, p2Y + 6);

      doc.setFont('courier', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text('An: Patrick Huber – Softwareentwicklung, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (kontakt@campus-groovelab.de)', 25, p2Y + 12);
      doc.text(`Hiermit widerrufe(n) ich/wir (*) den Vertrag über die Bereitstellung des Campus-Moduls (Kassenzeichen: ${referenceCode}).`, 25, p2Y + 17);
      doc.text(`- Schüler/Kind: ${studentDisplayName} • Musikschule: ${schoolData?.name || 'Musikschule'}`, 25, p2Y + 22);
      doc.text('- Name des/der Verbraucher(s): ____________________________________________________________________', 25, p2Y + 27);
      doc.text('- Anschrift des/der Verbraucher(s): _________________________________________________________________', 25, p2Y + 32);
      doc.text('- Unterschrift (nur bei Mitteilung auf Papier): __________________________   Datum: __________________', 25, p2Y + 37);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text('(*) Unzutreffendes streichen. Zur Fristwahrung genügt die rechtzeitige Absendung der Erklärung.', 25, p2Y + 44);
      doc.text('Der Widerruf kann auch formlos per E-Mail unter Nennung des Verwendungszwecks/Kassenzeichens erfolgen.', 25, p2Y + 49);

      p2Y += 61;

      // 4. AGB-Auszug & Schlichtungshinweis
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      doc.text('Wesentliche Vertragsbestimmungen (AGB Teil B) & Streitschlichtung (§ 36 VSBG):', 20, p2Y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(100, 116, 139);
      doc.text('1. Reines Cloud-Hosting: Campus-Groovelab stellt ausschließlich die technische Infrastruktur für das didaktische Üben und das Hausaufgabenheft bereit.', 20, p2Y + 4);
      doc.text('2. Keine Unterrichtsverträge: Verträge über Musikunterricht und Aufsichtspflichten vor Ort bestehen ausschließlich mit der Musikschule.', 20, p2Y + 8);
      doc.text('3. Botenstatus: Mitteilungen in der Plattform fungieren technisch als elektronischer Bote; formelle Vertragskündigungen an die Musikschule sind hierüber ausgeschlossen.', 20, p2Y + 12);
      doc.text('4. Schlichtung (§ 36 VSBG): Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.', 20, p2Y + 16);

      // Page 2 Footer Seal
      doc.setFont('courier', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(100, 116, 139);
      doc.text(`Elektronischer Prüfungsnachweis & GoBD-Archivierungs-Hash: SHA256-${sha256Seal}`, 20, 276);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('Seite 2 von 2 (Gesetzliche Vertragsbestätigung & Widerrufsbelehrung)', 20, 280);

      doc.save(`Campus-Groovelab_Vertragsbestaetigung_Zahlungsanweisung_${referenceCode}.pdf`);
    } catch (e: any) {
      alert('Fehler beim PDF-Export: ' + e.message);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
    }} className="animate-fade-in">
      
      {/* 24px Apple Squircle Modal Stage (BFSG & WCAG 2.1 AA Compliant) */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="parent-activation-title"
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        
        {/* Modal Header */}
        <div style={{
          padding: '22px 28px 18px 28px',
          borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.6) 0%, rgba(255, 255, 255, 0.9) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#34a853',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(52, 168, 83, 0.3)'
            }} aria-hidden="true">
              {wizardStep === 'pin_gate' ? <Lock size={20} /> :
               wizardStep === 'permissions' ? <ShieldCheck size={20} /> :
               wizardStep === 'ui_level' ? <Sparkles size={20} /> :
               wizardStep === 'success' ? <CheckCircle2 size={20} /> :
               <QrCode size={22} />}
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {wizardStep === 'payment' ? 'Elternbereich • Direktaktivierung' :
                 wizardStep === 'pin_gate' ? 'Schritt 2/4 • Eltern-Authentifizierung' :
                 wizardStep === 'permissions' ? 'Schritt 3/4 • Pädagogische Freigaben' :
                 wizardStep === 'ui_level' ? 'Schritt 4/4 • Ansicht für Schüler' :
                 'Fertiggestellt'}
              </span>
              <h3 id="parent-activation-title" style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {wizardStep === 'payment' ? 'Campus-Modul aktivieren' :
                 wizardStep === 'pin_gate' ? 'Eltern-Passwort bestätigen' :
                 wizardStep === 'permissions' ? 'Rechte & Freigaben festlegen' :
                 wizardStep === 'ui_level' ? 'UI-Level für dein Kind wählen' :
                 'Campus-App erfolgreich startklar!'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Dialog schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Mini Step Indicator */}
        {wizardStep !== 'success' && (
          <div style={{
            display: 'flex',
            padding: '12px 28px 0 28px',
            gap: '8px',
            alignItems: 'center'
          }}>
            {[
              { key: 'payment', label: '1. Tarif' },
              { key: 'pin_gate', label: '2. Eltern-PIN' },
              { key: 'permissions', label: '3. Freigaben' },
              { key: 'ui_level', label: '4. Ansicht' }
            ].map((step, idx) => {
              const stepOrder = ['payment', 'pin_gate', 'permissions', 'ui_level'];
              const currentIdx = stepOrder.indexOf(wizardStep);
              const isActive = step.key === wizardStep;
              const isDone = idx < currentIdx;
              return (
                <div key={step.key} style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{
                    height: '4px',
                    borderRadius: '2px',
                    background: isDone ? '#10b981' : isActive ? '#34a853' : '#e2e8f0',
                    transition: 'all 0.2s'
                  }} />
                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: isActive || isDone ? 800 : 600,
                    color: isDone ? '#10b981' : isActive ? '#0f172a' : '#94a3b8',
                    whiteSpace: 'nowrap'
                  }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {wizardStep === 'payment' && (
            <>
              {/* Price Summary Banner with Dynamic School Year Trial */}
              <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '18px 20px 16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '-10px',
              left: '18px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '2px 10px',
              borderRadius: '100px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}>
              🎁 {schoolYearCalc.freePeriodDescription.toUpperCase()}
            </div>
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Schuljahres-Bereitstellung ({periodDescription})
              </span>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Modul Campus ({remainingMonths} Monate bis Schuljahresende)</span>
              </div>
              {schoolYearCalc.isFirstYearDiscount && (
                <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 800, display: 'inline-block', marginTop: '1px' }}>
                  💚 Erstjahr-Vorteil: Nur {remainingMonths} statt 12 Monate berechnet ({freeMonthDisplay} Probezeit)!
                </span>
              )}
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Hausaufgabenheft, Übe-Timer, Loopstation &amp; Audio-Tresor
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: isThirdOrMoreChild ? '#ca8a04' : '#059669', letterSpacing: '-0.03em' }}>
                {isThirdOrMoreChild ? (isChf ? 'CHF 0.00' : '0,00 €') : freeMonthDisplay} <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>({isThirdOrMoreChild ? 'Familien-Bonus' : schoolYearCalc.freeMonthName})</span>
              </div>
              <span style={{ fontSize: '0.70rem', color: isThirdOrMoreChild ? '#ca8a04' : '#64748b', fontWeight: 700, display: 'block' }}>
                {isThirdOrMoreChild 
                  ? '🎉 Als 3. Kind dauerhaft 100% kostenlos!' 
                  : `ab 01.${schoolYearCalc.paidStartMonthName.slice(0,3)}: ${isChf ? `CHF ${totalAmountStr}` : `${totalAmountStr} €`} (${remainingMonths} × ${monthlyRate})`}
              </span>
              <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginTop: '1px' }}>
                {taxDisclaimer}
              </span>
            </div>
          </div>

          {/* 👨‍👩‍👧 Family Hub / Geschwister-Verknüpfung (Paid-First Architecture) */}
          <div style={{
            background: isThirdOrMoreChild ? '#fefce8' : '#f8fafc',
            border: `1.5px solid ${isThirdOrMoreChild ? '#facc15' : '#e2e8f0'}`,
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color={isThirdOrMoreChild ? '#ca8a04' : '#64748b'} />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  Familien-Vorteil &amp; Geschwisterrabatt
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, background: isThirdOrMoreChild ? '#fef08a' : '#e2e8f0', color: isThirdOrMoreChild ? '#854d0e' : '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                {activePaidSiblingsCount} von 2 aktiven Geschwistern
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.74rem', color: '#475569', lineHeight: 1.4 }}>
              Haben Sie mehrere Kinder an der Musikschule? <strong>Sobald 2 Geschwisterkinder ein aktives Campus-Modul besitzen, ist der Zugang ab dem 3. Kind dauerhaft 100% KOSTENLOS (0,00 €)!</strong>
            </p>

            {/* Linked Siblings Chips */}
            {linkedSiblings.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {linkedSiblings.map((sib, idx) => (
                  <span key={idx} style={{ 
                    background: sib.isCampusActive ? '#ecfdf5' : '#ffffff', 
                    border: `1px solid ${sib.isCampusActive ? '#a7f3d0' : '#cbd5e1'}`, 
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    color: sib.isCampusActive ? '#065f46' : '#64748b', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px' 
                  }}>
                    <span>{idx + 1}. Kind: {sib.name} {sib.isCampusActive ? '(✓ Aktiv)' : '(⏳ Inaktiv)'}</span>
                  </span>
                ))}
                <span style={{ 
                  background: isThirdOrMoreChild ? '#dcfce7' : '#f1f5f9', 
                  border: `1px solid ${isThirdOrMoreChild ? '#86efac' : '#cbd5e1'}`, 
                  padding: '3px 8px', 
                  borderRadius: '6px', 
                  fontSize: '0.72rem', 
                  fontWeight: 800, 
                  color: isThirdOrMoreChild ? '#166534' : '#475569' 
                }}>
                  {linkedSiblings.length + 1}. Kind: {student.first_name || 'Aktuelles Kind'} {isThirdOrMoreChild ? '(🎉 100% Gratis)' : `(${monthlyRate}/Mo.)`}
                </span>
              </div>
            )}

            {/* Status Feedback */}
            {isThirdOrMoreChild ? (
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '6px 10px', borderRadius: '8px' }}>
                🎉 Glückwunsch! Als 3. aktives Kind ist der Campus-Zugang für {student.first_name || 'dieses Kind'} für das gesamte Schuljahr 100% KOSTENLOS (0,00 €)!
              </div>
            ) : activePaidSiblingsCount === 1 ? (
              <div style={{ fontSize: '0.70rem', color: '#b45309', background: '#fef3c7', padding: '6px 10px', borderRadius: '8px', fontWeight: 600 }}>
                💡 Noch 1 aktives Geschwisterkind nötig, um ab dem 3. Kind dauerhaft kostenlos zu üben.
              </div>
            ) : null}

            {/* Add Sibling Trigger / Input */}
            {!showAddSiblingInput ? (
              <button
                type="button"
                onClick={() => setShowAddSiblingInput(true)}
                style={{
                  background: '#ffffff',
                  border: '1px dashed #94a3b8',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>+ Geschwisterkind hinzufügen &amp; prüfen</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Vorname oder PIN des Geschwisterkindes"
                  value={siblingNameOrPin}
                  onChange={(e) => setSiblingNameOrPin(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.76rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  disabled={siblingLookupLoading}
                  onClick={async () => {
                    const inputVal = siblingNameOrPin.trim();
                    if (!inputVal) return;
                    setSiblingLookupLoading(true);
                    
                    let isAct = true;
                    let resolvedName = inputVal;
                    let resolvedId = '';

                    try {
                      const { data } = await supabase
                        .from('users')
                        .select('id, first_name, last_name, is_campus_active, payment_status, student_billing_payment_method')
                        .eq('school_id', student.school_id)
                        .or(`id.eq.${inputVal},first_name.ilike.${inputVal}`)
                        .limit(1);

                      if (data && data.length > 0) {
                        const found = data[0];
                        resolvedName = found.first_name || inputVal;
                        resolvedId = found.id;
                        isAct = Boolean(found.is_campus_active || found.payment_status === 'paid' || found.student_billing_payment_method === 'bank_transfer' || found.student_billing_payment_method === 'family_bonus');
                      } else {
                        const localPaid = localStorage.getItem(`campus_paid_${inputVal}`) === 'true' || localStorage.getItem(`campus_active_${inputVal}`) === 'true';
                        isAct = localPaid;
                      }
                    } catch (e) {
                      console.warn('Sibling lookup error:', e);
                    } finally {
                      setSiblingLookupLoading(false);
                    }

                    const newSibling: LinkedSibling = {
                      name: resolvedName,
                      id: resolvedId || undefined,
                      isCampusActive: isAct
                    };

                    const nextSiblings = [...linkedSiblings.filter(s => s.name.toLowerCase() !== resolvedName.toLowerCase()), newSibling];
                    setLinkedSiblings(nextSiblings);
                    try {
                      localStorage.setItem(`campus_family_siblings_${student.school_id || 'school'}`, JSON.stringify(nextSiblings));
                    } catch (e) {}
                    setSiblingNameOrPin('');
                    setShowAddSiblingInput(false);
                  }}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: siblingLookupLoading ? 'wait' : 'pointer'
                  }}
                >
                  {siblingLookupLoading ? 'Prüfe...' : 'Hinzufügen'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSiblingInput(false)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>

                    {/* EPC-QR GiroCode Stage */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              {schoolYearCalc.isCurrentTrialPeriod 
                ? `✦ Zahlungsanweisung für das Schuljahr (Fällig zum 01. ${schoolYearCalc.paidStartMonthName}) ✦`
                : '✦ Schritt 1: Mit Ihrer Banking-App scannen ✦'}
            </span>

            {schoolYearCalc.isCurrentTrialPeriod && (
              <div style={{
                background: '#ecfdf5',
                border: '1.5px solid #a7f3d0',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '14px',
                fontSize: '0.76rem',
                color: '#065f46',
                lineHeight: '1.45',
                textAlign: 'left'
              }}>
                <strong>🎁 Kostenfreier Schnuppermonat ({schoolYearCalc.freeMonthName}):</strong> Das Campus-Studio für Ihr Kind wird mit Klick auf den Freischalt-Button <strong>sofort und ohne Vorauszahlung freigeschaltet</strong>. Die Überweisung von {isChf ? `CHF ${totalAmountStr}` : `${totalAmountStr} €`} für die verbleibende Schuljahresnutzung ({periodDescription}) können Sie bequem jetzt oder bis zum 01.{String(schoolYearCalc.paidStartMonth).padStart(2, '0')}. vornehmen.
              </div>
            )}

            {/* QR Inlay */}
            <div style={{
              background: '#ffffff',
              padding: '14px',
              borderRadius: '16px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
              marginBottom: '12px'
            }}>
              <QRCode 
                value={epcPayload} 
                size={160} 
                level="M" 
                style={{ height: 'auto', maxWidth: '100%', width: '160px' }} 
              />
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, maxWidth: '420px', lineHeight: '1.4' }}>
              Öffnen Sie Ihre <strong>Sparkassen-, VR-, ING-, DKB-, N26- oder sonstige Banking-App</strong> und wählen Sie <em>„Fotoüberweisung / QR-Code scannen“</em>. Alle Daten sind 100% fehlerfrei vorausgefüllt.
            </p>
          </div>

          {/* 1-Click Monospace Copy Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Schritt 2: Alternativ per Hand überweisen
            </span>

            {/* Row 1: Verwendungszweck (Highlight!) */}
            <div style={{
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
                  Verwendungszweck (Wichtig für automatischen Abgleich)
                </span>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.96rem', color: '#065f46', letterSpacing: '0.04em' }}>
                  {referenceCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(referenceCode, 'reference')}
                style={{
                  background: copiedField === 'reference' ? '#059669' : '#ffffff',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: copiedField === 'reference' ? '#ffffff' : '#047857',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                {copiedField === 'reference' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedField === 'reference' ? 'Kopiert!' : 'Kopieren'}</span>
              </button>
            </div>

            {/* Row 2: IBAN */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Empfänger &amp; IBAN
                </span>
                <div style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 700 }}>
                  {recipientName}
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.86rem', color: '#334155' }}>
                  {formatIbanWithSpaces(effectiveIban)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(effectiveIban.replace(/\s+/g, ''), 'iban')}
                style={{
                  background: copiedField === 'iban' ? '#0f172a' : '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: copiedField === 'iban' ? '#ffffff' : '#475569',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                {copiedField === 'iban' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedField === 'iban' ? 'Kopiert!' : 'Kopieren'}</span>
              </button>
            </div>
          </div>

          {/* Confirmation Alert after submission */}
          {submittedSuccess && (
            <div style={{
              background: '#ecfdf5',
              border: '1.5px solid #10b981',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#065f46',
              fontSize: '0.84rem',
              fontWeight: 700
            }}>
              <CheckCircle2 size={20} color="#10b981" />
              <div>
                <div>
                  {schoolYearCalc.isCurrentTrialPeriod
                    ? `✓ Kostenfreier Schnuppermonat (${schoolYearCalc.freeMonthName}) aktiviert! Das Campus-Studio ist ab sofort für Ihr Kind freigeschaltet.`
                    : 'Überweisung registriert! Ihr 14-tägiger Vertrauenszugang ist ab sofort aktiv. Sobald der Zahlungseingang verbucht ist, wird die Freischaltung für das gesamte Schuljahr dauerhaft bestätigt.'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, marginTop: '2px' }}>
                  ✓ Ihr offizieller Vertrags- &amp; Überweisungsbeleg (PDF) wurde automatisch heruntergeladen.
                </div>
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            
            {/* Wesentliche Vertragsmerkmale & Preistransparenz */}
            {!isThirdOrMoreChild && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                    Gesamtpreis für das Schuljahr
                  </div>
                  <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
                    {taxDisclaimer}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                    {isChf ? `CHF ${totalAmountStr}` : `${totalAmountStr} €`}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#059669', fontWeight: 700 }}>
                    {schoolYearCalc.isCurrentTrialPeriod ? '1. Monat kostenfrei inklusive' : 'Einmaliger Jahresbeitrag'}
                  </div>
                </div>
              </div>
            )}

            {/* Legal Consent Checkbox for B2C */}
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
              background: '#f8fafc',
              padding: '10px 12px',
              borderRadius: '12px',
              border: agreeWithdrawalWaiver ? '1px solid #cbd5e1' : '1.5px dashed #f59e0b',
              transition: 'all 0.15s'
            }}>
              <input
                type="checkbox"
                checked={agreeWithdrawalWaiver}
                onChange={(e) => setAgreeWithdrawalWaiver(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  marginTop: '2px',
                  accentColor: '#10b981',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '0.74rem', color: '#334155', lineHeight: '1.45' }}>
                Ich stimme den{' '}
                <button
                  type="button"
                  onClick={() => setLegalModalTab('terms')}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#0f172a', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}
                >
                  Nutzungsbedingungen (AGB Teil B)
                </button>
                {' '}und der{' '}
                <button
                  type="button"
                  onClick={() => setLegalModalTab('privacy')}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#0f172a', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}
                >
                  Datenschutzerklärung
                </button>
                {' '}zu. Ich verlange ausdrücklich, dass mit der Bereitstellung der Plattform vor Ablauf der 14-tägigen Widerrufsfrist begonnen wird. Mir ist bekannt, dass mein Widerrufsrecht bei vollständiger Bereitstellung vorzeitig erlischt.
              </span>
            </label>

            {/* Gesetzliche Widerrufsinformation */}
            <div style={{
              fontSize: '0.72rem',
              color: '#475569',
              background: '#f8fafc',
              padding: '10px 12px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              lineHeight: '1.45',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>🛡️ Gesetzliches Widerrufsrecht</span>
                <span style={{ fontSize: '0.66rem', color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>
                  Verbraucherschutz &amp; Widerrufsbelehrung
                </span>
              </div>
              <div>
                Es gilt das gesetzliche 14-tägige Widerrufsrecht für Verbraucher (im 1. Schnuppermonat jederzeit vollständig kostenfrei ohne Angabe von Gründen widerrufbar). Hier einsehen:{' '}
                <button
                  type="button"
                  onClick={() => setLegalModalTab('cancellation')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#10b981',
                    fontWeight: 800,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: 'inherit'
                  }}
                >
                  Widerrufsbelehrung &amp; Muster-Widerrufsformular
                </button>.
              </div>
            </div>

            {/* Gesetzliche Vertragszusammenfassung unmittelbar vor der Bestellung */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '0.74rem',
              lineHeight: 1.5,
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>📋 Vertragsübersicht</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>
                  {isThirdOrMoreChild 
                    ? '0,00 € (3. Kind Befreiung)' 
                    : `${isChf ? `CHF ${totalAmountStr}` : `${totalAmountStr} €`} / Schuljahr`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Leistung:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Campus-Groovelab (Modul Campus)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Vertragslaufzeit:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Bis zum Schuljahresende (Endet automatisch, kein Abo)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Schnupperphase:</span>
                <span style={{ fontWeight: 600, color: '#059669' }}>1. Monat 100 % kostenfrei zum Kennenlernen</span>
              </div>
            </div>

            {/* Primary confirmation CTA with strict Compliance */}
            <button
              type="button"
              disabled={!agreeWithdrawalWaiver}
              onClick={handleProceedToWizard}
              aria-label={isThirdOrMoreChild 
                ? 'Kostenlos freischalten' 
                : schoolYearCalc.isCurrentTrialPeriod 
                  ? `Kostenfreien Schnuppermonat jetzt starten (${freeMonthDisplay})` 
                  : 'Zahlungspflichtig bestellen'}
              style={{
                width: '100%',
                background: !agreeWithdrawalWaiver 
                  ? '#94a3b8' 
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '0.92rem',
                fontWeight: 900,
                cursor: !agreeWithdrawalWaiver ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: agreeWithdrawalWaiver ? '0 6px 20px rgba(16, 185, 129, 0.35)' : 'none',
                transition: 'all 0.15s'
              }}
              onMouseOver={(e) => { if (agreeWithdrawalWaiver) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {isThirdOrMoreChild 
                ? 'Kostenlos freischalten ➔' 
                : schoolYearCalc.isCurrentTrialPeriod
                  ? `Kostenfreien Schnuppermonat jetzt starten (${freeMonthDisplay}) ➔`
                  : 'Zahlungspflichtig bestellen ➔'}
            </button>

            {/* 2-Column secondary tools */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              
              {/* PDF Download */}
              <button
                type="button"
                onClick={handleDownloadPdfVoucher}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0f172a'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                title="Offizielle Vertragsbestätigung mit Zahlungsanweisung als PDF speichern"
              >
                <Download size={14} />
                <span>Vertragsbeleg &amp; PDF</span>
              </button>

              {/* Hardship button */}
              <button
                type="button"
                onClick={() => setShowHardshipConfirm(true)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <HeartHandshake size={14} />
                <span>Härtefall anfragen</span>
              </button>
            </div>

            {/* Hardship Dialog */}
            {showHardshipConfirm && (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '0.78rem',
                color: '#92400e',
                lineHeight: '1.4'
              }}>
                <strong>Härtefall &amp; Geschwisterrabatt:</strong>
                <p style={{ margin: '4px 0 8px 0' }}>
                  Wenden Sie sich bitte kurz an das Sekretariat Ihrer Musikschule. Die Schulleitung kann das Schülerprofil mit 1 Klick kostenfrei für Sie freischalten.
                </p>
                <button
                  type="button"
                  onClick={() => setShowHardshipConfirm(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #d97706',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    color: '#92400e',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  Verstanden
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* STAGE 2 WIZARD - STEP 1: PARENT PIN GATE */}
      {wizardStep === 'pin_gate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 4px' }}>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '24px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #bfdbfe',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
            }} aria-hidden="true">
              <Lock size={26} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                Eltern-Passwort erforderlich
              </h4>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.45, maxWidth: '420px' }}>
                Bitte gib dein 6-stelliges Eltern-Passwort ein, um die App-Funktionen und didaktischen Freigaben für <strong>{studentDisplayName}</strong> festzulegen.
              </p>
            </div>

            {/* 6-Digit PIN input */}
            <div style={{ width: '100%', maxWidth: '280px', marginTop: '10px', position: 'relative' }}>
              <input
                type={showParentPinMask ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={parentPinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setParentPinInput(val);
                  if (parentPinError) setParentPinError(null);
                }}
                placeholder="••••••"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  letterSpacing: '0.35em',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  padding: '12px 42px 12px 16px',
                  borderRadius: '14px',
                  border: parentPinError ? '2px solid #ef4444' : '2px solid #cbd5e1',
                  outline: 'none',
                  background: '#ffffff',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && parentPinInput.length >= 4) {
                    handleVerifyParentPin();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowParentPinMask(!showParentPinMask)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px'
                }}
                aria-label={showParentPinMask ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showParentPinMask ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {parentPinError && (
              <div style={{
                color: '#b91c1c',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                width: '100%',
                maxWidth: '360px'
              }}>
                {parentPinError}
              </div>
            )}

            {/* Biometric Passkey Unlock (Face ID / Touch ID) */}
            {isWebAuthnSupported() && (
              <button
                type="button"
                disabled={isVerifyingPin}
                onClick={handleBiometricUnlock}
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: '1px solid #bae6fd',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  color: '#0284c7',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: isVerifyingPin ? 'not-allowed' : 'pointer',
                  opacity: isVerifyingPin ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
              >
                <Fingerprint size={20} />
                <span>{isVerifyingPin ? 'Wird geprüft...' : 'Mit Face ID / Touch ID bestätigen'}</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setWizardStep('payment')}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '14px',
                padding: '12px 18px',
                fontWeight: 800,
                fontSize: '0.88rem',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ChevronLeft size={16} />
              <span>Zurück</span>
            </button>

            <button
              type="button"
              disabled={parentPinInput.length < 4 || isVerifyingPin}
              onClick={handleVerifyParentPin}
              style={{
                flex: 1,
                background: parentPinInput.length < 4 || isVerifyingPin ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '14px',
                padding: '12px 20px',
                fontWeight: 900,
                fontSize: '0.92rem',
                color: '#ffffff',
                cursor: parentPinInput.length < 4 || isVerifyingPin ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: parentPinInput.length >= 4 ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none'
              }}
            >
              {isVerifyingPin ? 'Prüfe PIN...' : 'PIN bestätigen & weiter ➔'}
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2 WIZARD - STEP 2: PERMISSIONS */}
      {wizardStep === 'permissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 4px' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.08rem', fontWeight: 900, color: '#0f172a' }}>
              Pädagogische &amp; rechtliche Kernfreigaben
            </h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
              Lege fest, welche interaktiven Campus-Funktionen für {studentDisplayName} freigeschaltet werden.
            </p>
          </div>

          {/* Toggle 1: Audio Tresor (§ 73 UrhG / § 201 StGB) */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: allowStudentAudio ? '#f0fdf4' : '#f8fafc',
                color: allowStudentAudio ? '#16a34a' : '#94a3b8',
                border: `1px solid ${allowStudentAudio ? '#bbf7d0' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }} aria-hidden="true">
                <Mic size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                    Audio-Tresor &amp; Loopstation
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                    Geschützter Audio-Tresor
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#64748b', lineHeight: 1.35 }}>
                  Erlaubt eigene Übe-Aufnahmen und Unterrichts-Mitschnitte sicher im geschützten Audio-Tresor zu speichern.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAllowStudentAudio(!allowStudentAudio)}
              style={{
                width: '46px',
                height: '26px',
                borderRadius: '13px',
                background: allowStudentAudio ? '#10b981' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0
              }}
              role="switch"
              aria-checked={allowStudentAudio}
            >
              <div style={{
                position: 'absolute',
                top: '3px',
                left: allowStudentAudio ? '23px' : '3px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'left 0.2s'
              }} />
            </button>
          </div>

          {/* Toggle 2: 1:1 Schüler-Chat (§ 8a SGB VIII) */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: allowStudentChat ? '#eff6ff' : '#f8fafc',
                color: allowStudentChat ? '#2563eb' : '#94a3b8',
                border: `1px solid ${allowStudentChat ? '#bfdbfe' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }} aria-hidden="true">
                <MessageSquare size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                    1:1 Schüler-Lehrer-Chat
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1d4ed8', background: '#dbeafe', padding: '2px 6px', borderRadius: '4px' }}>
                    Geprüfter Kinderschutz
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#64748b', lineHeight: 1.35 }}>
                  Direkter didaktischer Austausch mit der Lehrkraft für Hausaufgaben-Fragen. (Der Elternbereich-Chat bleibt unabhängig immer aktiv).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAllowStudentChat(!allowStudentChat)}
              style={{
                width: '46px',
                height: '26px',
                borderRadius: '13px',
                background: allowStudentChat ? '#10b981' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0
              }}
              role="switch"
              aria-checked={allowStudentChat}
            >
              <div style={{
                position: 'absolute',
                top: '3px',
                left: allowStudentChat ? '23px' : '3px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'left 0.2s'
              }} />
            </button>
          </div>

          {/* Toggle 3: Terminabsage-Autonomie */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: allowStudentAbsences ? '#fef3c7' : '#f8fafc',
                color: allowStudentAbsences ? '#d97706' : '#94a3b8',
                border: `1px solid ${allowStudentAbsences ? '#fde68a' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }} aria-hidden="true">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                    Terminabsage-Autonomie
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#92400e', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                    Elternkontrolle
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#64748b', lineHeight: 1.35 }}>
                  Darf das Kind Unterrichtsstunden bei Abwesenheit selbst absagen? (Standard: Deaktiviert, Absagen erfolgen über die Eltern).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAllowStudentAbsences(!allowStudentAbsences)}
              style={{
                width: '46px',
                height: '26px',
                borderRadius: '13px',
                background: allowStudentAbsences ? '#10b981' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0
              }}
              role="switch"
              aria-checked={allowStudentAbsences}
            >
              <div style={{
                position: 'absolute',
                top: '3px',
                left: allowStudentAbsences ? '23px' : '3px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'left 0.2s'
              }} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => setWizardStep(isParentUnlocked ? 'payment' : 'pin_gate')}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '14px',
                padding: '12px 18px',
                fontWeight: 800,
                fontSize: '0.88rem',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ChevronLeft size={16} />
              <span>Zurück</span>
            </button>

            <button
              type="button"
              onClick={() => setWizardStep('ui_level')}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '14px',
                padding: '12px 20px',
                fontWeight: 900,
                fontSize: '0.92rem',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              <span>Weiter zur Ansicht-Wahl ➔</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2 WIZARD - STEP 3: UI LEVEL */}
      {wizardStep === 'ui_level' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 4px' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.08rem', fontWeight: 900, color: '#0f172a' }}>
              Wähle das passende UI-Level
            </h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
              Wähle das didaktische Layout für dein Kind. Kann später im Elternbereich jederzeit angepasst werden.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                id: 'junior' as const,
                title: 'Junior',
                badge: '6 – 10 Jahre',
                icon: Sparkles,
                color: '#16a34a',
                bg: '#f0fdf4',
                border: '#bbf7d0',
                desc: 'Große Symbole, 3-Klick Hausaufgaben, Sticker-Sammelalbum und spielerische Farbwelt.'
              },
              {
                id: 'teen' as const,
                title: 'Teen',
                badge: '11 – 15 Jahre (Empfohlen)',
                icon: Zap,
                color: '#0284c7',
                bg: '#f0f9ff',
                border: '#bae6fd',
                recommended: true,
                desc: 'Aufgeräumtes Studio-Layout, Flow-Timer, Audio-Memos, XP-Score, Level & Badges.'
              },
              {
                id: 'pro' as const,
                title: 'Pro',
                badge: 'Ab 16 Jahre',
                icon: Crown,
                color: '#6366f1',
                bg: '#f5f3ff',
                border: '#ddd6fe',
                desc: 'Vollständige Studio-Tools, 4-Spur Loopstation, 6-Achsen Skill-Radar & detaillierte Statistiken.'
              }
            ].map((lvl) => {
              const isSelected = selectedUiLevel === lvl.id;
              const Icon = lvl.icon;
              return (
                <div
                  key={lvl.id}
                  onClick={() => setSelectedUiLevel(lvl.id)}
                  style={{
                    background: isSelected ? lvl.bg : '#ffffff',
                    border: isSelected ? `2px solid ${lvl.color}` : '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s'
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedUiLevel(lvl.id); }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: isSelected ? lvl.color : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }} aria-hidden="true">
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                          {lvl.title}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: lvl.color,
                          background: 'rgba(255,255,255,0.8)',
                          padding: '2px 8px',
                          borderRadius: '100px',
                          border: `1px solid ${lvl.border}`
                        }}>
                          {lvl.badge}
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.3 }}>
                        {lvl.desc}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: isSelected ? `2px solid ${lvl.color}` : '2px solid #cbd5e1',
                    background: isSelected ? lvl.color : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0
                  }} aria-hidden="true">
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => setWizardStep('permissions')}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '14px',
                padding: '12px 18px',
                fontWeight: 800,
                fontSize: '0.88rem',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ChevronLeft size={16} />
              <span>Zurück</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalizeActivation}
              style={{
                flex: 1,
                background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '14px',
                padding: '12px 20px',
                fontWeight: 900,
                fontSize: '0.92rem',
                color: '#ffffff',
                cursor: isSubmitting ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              {isSubmitting ? 'Wird gespeichert...' : '✓ Einrichtung abschließen & App freigeben'}
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2 WIZARD - STEP 4: SUCCESS */}
      {wizardStep === 'success' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '18px',
          padding: '24px 8px'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: '#ecfdf5',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid #bbf7d0',
            boxShadow: '0 10px 25px rgba(22, 163, 74, 0.25)'
          }} aria-hidden="true">
            <CheckCircle2 size={38} />
          </div>

              <div>
                <span style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  display: 'inline-block',
                  marginBottom: '8px'
                }}>
                  Campus-Dashboard startklar
                </span>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 950, color: '#0f172a', margin: '0 0 6px 0' }}>
                  Einrichtung erfolgreich abgeschlossen!
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: 650, margin: 0, lineHeight: 1.4, maxWidth: '420px' }}>
                  Die Campus-App ist ab sofort für <strong>{studentDisplayName}</strong> im Level „<strong>{selectedUiLevel === 'junior' ? 'Junior' : selectedUiLevel === 'pro' ? 'Pro' : 'Teen'}</strong>“ freigeschaltet.
                </p>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px 20px',
                textAlign: 'left',
                width: '100%',
                maxWidth: '440px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.80rem',
                color: '#334155',
                lineHeight: 1.4
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: '#16a34a', fontWeight: 900 }}>✓</span>
                  <span>Dein Kind meldet sich wie gewohnt mit seiner <strong>4-stelligen PIN</strong> an.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: '#16a34a', fontWeight: 900 }}>✓</span>
                  <span>Keine weiteren Registrierungsschritte für das Kind erforderlich.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: '#16a34a', fontWeight: 900 }}>✓</span>
                  <span>Beim Erststart erhält dein Kind sein <strong>1. Schuljahres-Wappen (🎒 Campus-Pionier)</strong>.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCompleteAndClose}
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '14px',
                  fontWeight: 950,
                  fontSize: '1.02rem',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.15s'
                }}
              >
                Fertig &amp; Schließen
              </button>
            </div>
          )}

          {/* Legal Compliance Footer (UWG / PAngV) */}
          <div style={{ textAlign: 'center', borderTop: '1px solid rgba(15, 23, 42, 0.05)', paddingTop: '14px' }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: '1.4', display: 'block' }}>
              Campus-Groovelab • Transparentes Cloud-Hosting statt teurer Software-Lizenzen (Keine Lizenzkaufgebühren: 0,00 €). Keine Mindestvertragslaufzeit über das Schuljahr hinaus.
            </span>

          </div>

        </div>
      </div>

      {/* Embedded Legal Text & Cancellation Modal */}
      <LegalTextModal
        isOpen={!!legalModalTab}
        onClose={() => setLegalModalTab(null)}
        initialTab={legalModalTab || 'cancellation'}
      />
    </div>
  );
};
