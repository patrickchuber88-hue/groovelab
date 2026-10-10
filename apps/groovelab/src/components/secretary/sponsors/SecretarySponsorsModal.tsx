/**
 * 🏛️ Campus-Groovelab Secretary Sponsors & Education Partners Modal
 * 
 * 0.1% Monolith Goldstandard / Autarkic Feature Satellite
 * Bounded Context: Administration & Governance (Secretary Dashboard)
 * Standards: OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / § 8 MStV Compliance
 */

import React, { useState, useEffect } from 'react';
import {
  HeartHandshake, Sparkles, Plus, Trash2, Edit3, ExternalLink,
  FileText, Check, X, ArrowUp, ArrowDown, Download, Building2,
  MapPin, ShieldCheck, AlertCircle, Info, ChevronRight, Eye
} from 'lucide-react';
import { generateSponsorPitchPDF } from '../../../utils/sponsorPitchPdfGenerator';
import { UniversalPdfPreviewModal } from '../../modals/UniversalPdfPreviewModal';
import { SecretarySponsorDeleteConfirmModal } from './SecretarySponsorDeleteConfirmModal';
import { supabase as defaultSupabase } from '../../../lib/supabase';
import { CampusSponsorIngressBanner } from '../../ui/CampusSponsorIngressBanner';
import { isDevEnvironment } from '../../../utils/tenantUrlHelper';

export type SponsorTier = 'foerderer' | 'partner' | 'haupt';

export interface SchoolSponsorItem {
  id: string;
  companyName: string;
  industrySubline: string;
  city: string;
  tier?: SponsorTier;
  customToastText?: string;
  websiteUrl?: string;
  logoUrl?: string;
  isMainSponsor: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface SchoolSponsorSettings {
  mode?: 'full_sponsor' | 'school_funded';
  sponsors: SchoolSponsorItem[];
  allowCoSponsorsWithMain: boolean;
  customTierPrices?: {
    bronze?: number;
    silber?: number;
    gold?: number;
  };
}

export interface SecretarySponsorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  schoolStreet?: string;
  schoolZipCode?: string;
  schoolCity?: string;
  schoolEmail?: string;
  schoolPhoneNumber?: string;
  studentsCount?: number;
  supabase?: any;
}

const STORAGE_KEY_PREFIX = 'campus_sponsor_settings_';

const CANONICAL_MUSAECK_SPONSORS: SchoolSponsorItem[] = [
  {
    id: 'musaek-sponsor-1',
    companyName: 'sameday',
    industrySubline: 'Logistik & Fulfillment',
    city: 'Bad Säckingen',
    tier: 'haupt',
    isMainSponsor: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'musaek-sponsor-2',
    companyName: 'Patrick Huber',
    industrySubline: 'Bildungsstiftung',
    city: 'Rheinfelden',
    tier: 'partner',
    isMainSponsor: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'musaek-sponsor-3',
    companyName: 'Jasna',
    industrySubline: 'Tollste Frau der Welt',
    city: 'Bad Säckingen',
    tier: 'foerderer',
    isMainSponsor: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export const SecretarySponsorsModal: React.FC<SecretarySponsorsModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  schoolStreet = '',
  schoolZipCode = '',
  schoolCity = '',
  schoolEmail = '',
  schoolPhoneNumber = '',
  studentsCount = 350,
  supabase
}) => {
  // --- STATE ---
  const [settings, setSettings] = useState<SchoolSponsorSettings>(() => {
    try {
      // Stufe 1: Direkter Key über schoolId
      let saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${schoolId}`);

      // Stufe 2: Resiliente Suche über alle campus_sponsor_settings_* Keys
      if (!saved) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_KEY_PREFIX)) {
            const val = localStorage.getItem(k);
            if (val) {
              try {
                const parsedVal = JSON.parse(val);
                if (parsedVal && Array.isArray(parsedVal.sponsors) && parsedVal.sponsors.length > 0) {
                  saved = val;
                  break;
                }
              } catch {}
            }
          }
        }
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.sponsors)) {
          const hadLegacyDemo = parsed.sponsors.some((s: SchoolSponsorItem) => s.id === 'demo-1' || s.companyName === 'Sanitär Meier');
          parsed.sponsors = parsed.sponsors.filter((s: SchoolSponsorItem) => s.id !== 'demo-1' && s.companyName !== 'Sanitär Meier');
          if (hadLegacyDemo) {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${schoolId}`, JSON.stringify(parsed));
          }
          if (parsed.sponsors.length > 0) {
            return parsed;
          }
        }
      }

      // Stufe 3: Flagship & Dev-Fallback für Musäk Bad Säckingen
      const isMusaek = (
        schoolId === '53e83805-1d5a-4ed8-988e-1fb0b8200b9c' ||
        (Boolean(schoolName) && (schoolName.toLowerCase().includes('musäk') || schoolName.toLowerCase().includes('bad säckingen'))) ||
        isDevEnvironment()
      );

      if (isMusaek) {
        const fallbackSettings: SchoolSponsorSettings = {
          mode: 'school_funded',
          sponsors: CANONICAL_MUSAECK_SPONSORS,
          allowCoSponsorsWithMain: true
        };
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${schoolId}`, JSON.stringify(fallbackSettings));
        } catch {}
        return fallbackSettings;
      }
    } catch {}
    return {
      mode: 'school_funded',
      sponsors: [],
      allowCoSponsorsWithMain: true
    };
  });

  const [editingSponsor, setEditingSponsor] = useState<SchoolSponsorItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingSponsor, setDeletingSponsor] = useState<SchoolSponsorItem | null>(null);
  const [pdfPreviewState, setPdfPreviewState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    badgeText?: string;
    filename: string;
    pdfBlob: Blob | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    badgeText: 'DIN A4 • 2 Seiten',
    filename: '',
    pdfBlob: null,
    isLoading: false
  });
  const [previewTab, setPreviewTab] = useState<'toast' | 'parent'>('toast');
  const [showSavedBadge, setShowSavedBadge] = useState(false);

  // Form Fields (Auf das Nötigste reduziert gem. 0,1% Goldstandard)
  const [formCompany, setFormCompany] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formTier, setFormTier] = useState<SponsorTier>('partner');
  const [formIsMain, setFormIsMain] = useState(false);

  // Sync to localStorage and Supabase on change
  const saveSettings = async (updated: SchoolSponsorSettings) => {
    setSettings(updated);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${schoolId}`, JSON.stringify(updated));
      setShowSavedBadge(true);
      setTimeout(() => setShowSavedBadge(false), 2500);

      // Reaktiver Broadcast für Ingress-Banner, Login-Pille & Elternportal
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_sponsor_refresh'));
        window.dispatchEvent(new CustomEvent('groovelab_auth_state_changed'));
      }

      // Async persistence to Supabase if available
      const db = supabase || defaultSupabase;
      if (db && schoolId) {
        await db
          .from('schools')
          .update({ sponsor_settings: updated })
          .eq('id', schoolId);
      }
    } catch (e) {
      console.error('Fehler beim Speichern der Sponsoren-Einstellungen:', e);
    }
  };

  // Try hydration from Supabase on mount
  useEffect(() => {
    const db = supabase || defaultSupabase;
    if (!isOpen || !db || !schoolId) return;

    (async () => {
      try {
        const { data, error } = await db
          .from('schools')
          .select('sponsor_settings')
          .eq('id', schoolId)
          .single();

        if (data && data.sponsor_settings && !error) {
          const loaded = data.sponsor_settings;
          if (loaded && Array.isArray(loaded.sponsors)) {
            loaded.sponsors = loaded.sponsors.filter((s: SchoolSponsorItem) => s.id !== 'demo-1' && s.companyName !== 'Sanitär Meier');
          }
          if (loaded.sponsors && loaded.sponsors.length > 0) {
            setSettings(loaded);
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${schoolId}`, JSON.stringify(loaded));
            return;
          }
        }

        // Falls Supabase leer ist und es sich um Musäk Bad Säckingen / Dev handelt
        const isMusaek = (
          schoolId === '53e83805-1d5a-4ed8-988e-1fb0b8200b9c' ||
          (Boolean(schoolName) && (schoolName.toLowerCase().includes('musäk') || schoolName.toLowerCase().includes('bad säckingen'))) ||
          isDevEnvironment()
        );
        if (isMusaek) {
          setSettings(prev => {
            if (!prev.sponsors || prev.sponsors.length === 0) {
              const fallbackSettings: SchoolSponsorSettings = {
                mode: 'school_funded',
                sponsors: CANONICAL_MUSAECK_SPONSORS,
                allowCoSponsorsWithMain: true
              };
              try {
                localStorage.setItem(`${STORAGE_KEY_PREFIX}${schoolId}`, JSON.stringify(fallbackSettings));
              } catch {}
              return fallbackSettings;
            }
            return prev;
          });
        }
      } catch (err) {
        // Fallback to local storage is already hydrated
      }
    })();
  }, [isOpen, schoolId, schoolName, supabase]);

  // Barrierefreie Tastatur-Steuerung (BFSG 2025 / WCAG 2.2 AA)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deletingSponsor) {
          e.stopPropagation();
          setDeletingSponsor(null);
        } else if (isFormOpen) {
          e.stopPropagation();
          setIsFormOpen(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletingSponsor, isFormOpen, isOpen, onClose]);

  if (!isOpen) return null;

  // --- HANDLERS ---
  const handleOpenCreateForm = () => {
    setEditingSponsor(null);
    setFormCompany('');
    setFormIndustry('');
    setFormCity('');
    setFormTier('partner');
    setFormIsMain(false);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (sponsor: SchoolSponsorItem) => {
    setEditingSponsor(sponsor);
    setFormCompany(sponsor.companyName);
    setFormIndustry(sponsor.industrySubline);
    setFormCity(sponsor.city);
    setFormTier(sponsor.tier || (sponsor.isMainSponsor ? 'haupt' : 'partner'));
    setFormIsMain(sponsor.isMainSponsor);
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim()) return;

    const autoToast = `Ermöglicht durch ${formCompany.trim()}${formIndustry.trim() ? ` – ${formIndustry.trim()}` : ''}${formCity.trim() ? `, ${formCity.trim()}` : ''}`;

    let updatedList = [...settings.sponsors];
    const isMain = formTier === 'haupt';

    if (isMain) {
      // Branchenexklusivität: Hauptpartner in derselben Branche de-priorisieren
      updatedList = updatedList.map(s => {
        if (
          (s.tier === 'haupt' || s.isMainSponsor) &&
          s.id !== editingSponsor?.id &&
          s.industrySubline.toLowerCase().trim() === formIndustry.toLowerCase().trim() &&
          formIndustry.trim().length > 0
        ) {
          return { ...s, isMainSponsor: false, tier: 'partner' as SponsorTier };
        }
        return s;
      });
    }

    if (editingSponsor) {
      updatedList = updatedList.map(s => {
        if (s.id === editingSponsor.id) {
          return {
            ...s,
            companyName: formCompany.trim(),
            industrySubline: formIndustry.trim(),
            city: formCity.trim(),
            tier: formTier,
            customToastText: autoToast,
            isMainSponsor: isMain
          };
        }
        return s;
      });
    } else {
      const newSponsor: SchoolSponsorItem = {
        id: `sp-${Date.now()}`,
        companyName: formCompany.trim(),
        industrySubline: formIndustry.trim(),
        city: formCity.trim(),
        tier: formTier,
        customToastText: autoToast,
        isMainSponsor: isMain,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      updatedList = [newSponsor, ...updatedList];
    }

    saveSettings({ ...settings, sponsors: updatedList });
    setIsFormOpen(false);
  };

  const handleDeleteSponsor = (id: string) => {
    const updated = settings.sponsors.filter(s => s.id !== id);
    saveSettings({ ...settings, sponsors: updated });
  };

  const handleToggleActive = (id: string) => {
    const updated = settings.sponsors.map(s => {
      if (s.id === id) return { ...s, isActive: !s.isActive };
      return s;
    });
    saveSettings({ ...settings, sponsors: updated });
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= settings.sponsors.length) return;

    const list = [...settings.sponsors];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    saveSettings({ ...settings, sponsors: list });
  };

  const handleOpenPdfPreview = async () => {
    setPdfPreviewState({
      isOpen: true,
      title: 'Sponsoren-Exposé 2026/2027',
      subtitle: `${schoolName} • Regionale Bildungspartnerschaft`,
      badgeText: 'DIN A4 • 2 Seiten • BMF 4 Abs. 4 EStG',
      filename: `Sponsoren_Expose_${schoolName.replace(/[^a-zA-Z0-9_-]/g, '_')}_2026_2027.pdf`,
      pdfBlob: null,
      isLoading: true
    });

    try {
      const blob = await generateSponsorPitchPDF({
        schoolName,
        schoolStreet,
        schoolZipCity: `${schoolZipCode} ${schoolCity}`.trim(),
        schoolEmail,
        schoolPhone: schoolPhoneNumber,
        studentCount: studentsCount,
        schoolYear: '2026/2027',
        principalName: 'Die Schulleitung',
        customTierPrices: settings.customTierPrices,
        returnBlob: true
      });

      if (blob instanceof Blob) {
        setPdfPreviewState(prev => ({
          ...prev,
          pdfBlob: blob,
          isLoading: false
        }));
      }
    } catch (err) {
      console.error('Fehler beim Generieren der PDF-Vorschau:', err);
      setPdfPreviewState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleClosePdfPreview = () => {
    setPdfPreviewState(prev => ({ ...prev, isOpen: false, pdfBlob: null }));
  };

  // Active preview sponsor
  const activeSponsors = settings.sponsors.filter(s => s.isActive);
  const mainSponsor = settings.sponsors.find(s => (s.tier === 'haupt' || s.isMainSponsor) && s.isActive) || activeSponsors.find(s => s.tier === 'haupt' || s.isMainSponsor);
  const coSponsor = settings.sponsors.find(s => s.tier === 'partner' && s.isActive);

  return (
    <>
      <div
        role="dialog"
      aria-modal="true"
      aria-label="Sponsoren & Bildungspartner Verwaltung"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1.5px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #ffffff, #fffbeb)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <HeartHandshake size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Sponsoren & Bildungspartner
                </h3>
                {showSavedBadge && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Check size={11} /> Gespeichert
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                Finanzierungs-Modus, Partner-Nennungen & Toast-Konfiguration für {schoolName}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleOpenPdfPreview}
              disabled={pdfPreviewState.isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                color: '#334155',
                fontSize: '0.78rem',
                fontWeight: 750,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="2-seitiges Akquise-Exposé als druckfertige Vorschau im Browser ansehen, drucken oder herunterladen"
            >
              <Eye size={14} color="#d97706" />
              {pdfPreviewState.isLoading ? 'Lade Vorschau...' : 'Akquise-Exposé (Vorschau)'}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Schließen"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* SECTION 1: SPONSORING-PAKETE & EXPOSÉ-PREISE (OPTIONALER OVERRIDE) */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Sponsoring-Pakete im Akquise-Exposé
                </span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  {settings.customTierPrices ? 'Individuelle Pauschalbeträge aktiv' : `Automatisch kalkuliert für ${studentsCount} Schüler (11 Monate à 0,49 € Basis)`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (settings.customTierPrices) {
                    const next = { ...settings };
                    delete next.customTierPrices;
                    saveSettings(next);
                  } else {
                    const studentCostPerYear = 5.39;
                    const autoBronze = Math.max(25, Math.round(Math.max(1, Math.round(studentsCount * 0.20)) * studentCostPerYear));
                    const autoSilber = Math.max(50, Math.round(Math.max(1, Math.round(studentsCount * 0.50)) * studentCostPerYear));
                    const autoGold = Math.max(100, Math.round(studentsCount * studentCostPerYear));
                    saveSettings({
                      ...settings,
                      customTierPrices: { bronze: autoBronze, silber: autoSilber, gold: autoGold }
                    });
                  }
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  background: settings.customTierPrices ? '#e0f2fe' : '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.72rem',
                  fontWeight: 750,
                  color: settings.customTierPrices ? '#0369a1' : '#475569',
                  cursor: 'pointer'
                }}
              >
                {settings.customTierPrices ? 'Auf Auto-Berechnung zurücksetzen' : 'Eigene Beträge anpassen'}
              </button>
            </div>

            {settings.customTierPrices && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginTop: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748b', marginBottom: '4px' }}>
                    Förderpartner (€):
                  </label>
                  <input
                    type="number"
                    value={settings.customTierPrices.bronze || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      saveSettings({
                        ...settings,
                        customTierPrices: { ...settings.customTierPrices, bronze: val }
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748b', marginBottom: '4px' }}>
                    Bildungspartner (€):
                  </label>
                  <input
                    type="number"
                    value={settings.customTierPrices.silber || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      saveSettings({
                        ...settings,
                        customTierPrices: { ...settings.customTierPrices, silber: val }
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748b', marginBottom: '4px' }}>
                    Haupt-Bildungspartner (€):
                  </label>
                  <input
                    type="number"
                    value={settings.customTierPrices.gold || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      saveSettings({
                        ...settings,
                        customTierPrices: { ...settings.customTierPrices, gold: val }
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: PARTNER-LISTE */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  2. Aktive Partner & Toast-Nennungen ({settings.sponsors.length})
                </span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Genau 1 Partner pro Login/Session · Rotation nach Listen-Reihenfolge
                </span>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateForm}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: 'none'
                }}
              >
                <Plus size={15} /> Partner anlegen
              </button>
            </div>

            {/* LISTE DER SPONSOREN */}
            {settings.sponsors.length === 0 ? (
              <div style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '32px 20px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <HeartHandshake size={32} color="#94a3b8" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>Noch keine Bildungspartner hinterlegt</div>
                <div style={{ fontSize: '0.75rem', marginTop: '6px', maxWidth: '440px', margin: '6px auto 0 auto', lineHeight: 1.45 }}>
                  Die Plattform startet standardmäßig neutral ohne voreingestellte Firmen. Klicke auf <strong>„+ Partner anlegen“</strong>, um einen Förderer zu erfassen, oder öffne die Vorschau des Akquise-Exposés.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {settings.sponsors.map((sponsor, index) => (
                  <div
                    key={sponsor.id}
                    style={{
                      background: sponsor.isActive ? '#ffffff' : '#f8fafc',
                      border: sponsor.isMainSponsor ? '1.5px solid #f59e0b' : '1.5px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: sponsor.isActive ? 1 : 0.6,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {/* Priority Move Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveOrder(index, 'up')}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: index === 0 ? '#cbd5e1' : '#64748b',
                            cursor: index === 0 ? 'default' : 'pointer',
                            padding: 0
                          }}
                          title="Nach oben"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={index === settings.sponsors.length - 1}
                          onClick={() => handleMoveOrder(index, 'down')}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: index === settings.sponsors.length - 1 ? '#cbd5e1' : '#64748b',
                            cursor: index === settings.sponsors.length - 1 ? 'default' : 'pointer',
                            padding: 0
                          }}
                          title="Nach unten"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>

                      {/* Rank Index */}
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', width: '18px' }}>
                        #{index + 1}
                      </span>

                      {/* Details */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 850, color: '#0f172a' }}>
                            {sponsor.companyName}
                          </span>
                          {sponsor.isMainSponsor && (
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 900,
                              background: '#fef3c7',
                              color: '#b45309',
                              padding: '2px 7px',
                              borderRadius: '100px',
                              border: '1px solid #fde68a'
                            }}>
                              ⭐ Hauptsponsor
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {sponsor.industrySubline} · {sponsor.city}
                          </span>
                        </div>

                        {/* Configured Toast Text */}
                        <div style={{ fontSize: '0.73rem', color: '#059669', fontWeight: 600, marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          Toast: „{sponsor.customToastText || `Ermöglicht durch ${sponsor.companyName}`}“
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(sponsor.id)}
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '5px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          background: sponsor.isActive ? '#dcfce7' : '#f1f5f9',
                          color: sponsor.isActive ? '#15803d' : '#64748b'
                        }}
                      >
                        {sponsor.isActive ? 'Aktiv' : 'Pausiert'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(sponsor)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Bearbeiten"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingSponsor(sponsor)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#fef2f2',
                          border: '1px solid #fee2e2',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={`Bildungspartner ${sponsor.companyName} entfernen`}
                        aria-label={`Bildungspartner ${sponsor.companyName} entfernen`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: LIVE WYSIWYG VORSCHAU (DER HELLE EDLE TOAST) */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  3. Live-Vorschau in der Schüler-PWA & Elternportal
                </span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  {mainSponsor
                    ? `Echtzeit-Simulation mit dem aktuellen Partner „${mainSponsor.companyName}“`
                    : 'Echtzeit-Simulation: So erscheint die Auszeichnung nach dem Anlegen eines Partners'}
                </span>
              </div>

              {/* View Switcher */}
              <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '10px', gap: '3px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewTab('toast')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    background: previewTab === 'toast' ? '#ffffff' : 'transparent',
                    color: previewTab === 'toast' ? '#0f172a' : '#64748b',
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    cursor: 'pointer'
                  }}
                >
                  🧒 Schüler-Banner (0,1% Ingress)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('parent')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    background: previewTab === 'parent' ? '#ffffff' : 'transparent',
                    color: previewTab === 'parent' ? '#0f172a' : '#64748b',
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    cursor: 'pointer'
                  }}
                >
                  👨‍👩‍👧 Eltern-Card
                </button>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div style={{
              background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              borderRadius: '16px',
              padding: '28px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {previewTab === 'toast' ? (
                /* 🏛️ 0.1% GOLDSTANDARD INGRESS RIBBON PREVIEW */
                <div style={{ width: '100%', maxWidth: '780px', animation: 'fadeIn 0.3s ease' }}>
                  <CampusSponsorIngressBanner
                    schoolId={schoolId}
                    previewMode={true}
                    previewCompanyText={(() => {
                      if (mainSponsor && coSponsor && settings.allowCoSponsorsWithMain !== false) {
                        return `${mainSponsor.companyName} & ${coSponsor.companyName}`;
                      }
                      const single = mainSponsor || coSponsor;
                      if (single) {
                        return single.customToastText
                          ? single.customToastText.replace(/^Ermöglicht durch\s*/i, '')
                          : single.companyName;
                      }
                      return '[Name Ihres Bildungspartners]';
                    })()}
                    previewLocationBadge={(() => {
                      if (mainSponsor && coSponsor && settings.allowCoSponsorsWithMain !== false) {
                        if (mainSponsor.city && coSponsor.city && mainSponsor.city.toLowerCase() === coSponsor.city.toLowerCase()) {
                          return mainSponsor.city;
                        } else if (mainSponsor.city && coSponsor.city) {
                          return `${mainSponsor.city} • ${coSponsor.city}`;
                        }
                        return mainSponsor.city || coSponsor.city || '';
                      }
                      const single = mainSponsor || coSponsor;
                      return single?.city || '[Ort]';
                    })()}
                  />
                </div>
              ) : (
                /* DIE ELTERN-CARD */
                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  maxWidth: '480px',
                  width: '100%',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px' }}>
                      Offizieller Bildungspartner
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#16a34a' }}>
                      100 % Kostenfrei für Familien
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 900, color: mainSponsor ? '#0f172a' : '#64748b', fontStyle: mainSponsor ? 'normal' : 'italic' }}>
                    {mainSponsor?.companyName || '[Name Ihres Bildungspartners]'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontStyle: mainSponsor ? 'normal' : 'italic' }}>
                    {mainSponsor ? `${mainSponsor.industrySubline} · ${mainSponsor.city}` : '[Branche / Zusatz · Ort]'}
                  </p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '0.74rem', color: '#334155', lineHeight: 1.45, borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    Die Bereitstellungskosten für die digitale Lernplattform werden im Schuljahr 2026/27 von <strong>{mainSponsor?.companyName || '[Ihr Bildungspartner]'}</strong> gestiftet. Wir danken herzlich für die Förderung der musikalischen Bildung!
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* CREATE / EDIT FORM SUB-MODAL */}
        {isFormOpen && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 10
          }}>
            <form
              onSubmit={handleSaveForm}
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1.5px solid #e2e8f0',
                padding: '24px',
                width: '100%',
                maxWidth: '540px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                  {editingSponsor ? 'Partner bearbeiten' : 'Neuen Partner anlegen'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Firmenname *
                </label>
                <input
                  type="text"
                  required
                  placeholder="z. B. Regionale Bank, Stadtwerke oder Handwerksbetrieb"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Branche / Zusatz
                  </label>
                  <input
                    type="text"
                    placeholder="z. B. Finanzdienstleistungen, Energie oder Meisterbetrieb"
                    value={formIndustry}
                    onChange={(e) => setFormIndustry(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Ort / Region
                  </label>
                  <input
                    type="text"
                    placeholder="z. B. Ort oder Region"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* AUTOMATISCHE NENNUNG-VORSCHAU */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Sparkles size={13} color="#16a34a" />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Nennung: </span>
                  <span style={{ fontWeight: 800, color: formCompany.trim() ? '#0f172a' : '#94a3b8' }}>
                    {formCompany.trim()
                      ? `Ermöglicht durch ${formCompany.trim()}${formIndustry.trim() ? ` – ${formIndustry.trim()}` : ''}${formCity.trim() ? `, ${formCity.trim()}` : ''}`
                      : 'Ermöglicht durch [Firma] – [Branche], [Ort]'}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Sponsoring-Kategorie *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setFormTier('foerderer'); setFormIsMain(false); }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      border: formTier === 'foerderer' ? '2px solid #0f172a' : '1.5px solid #cbd5e1',
                      background: formTier === 'foerderer' ? '#f8fafc' : '#ffffff',
                      color: formTier === 'foerderer' ? '#0f172a' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    Förderpartner
                    <span style={{ display: 'block', fontSize: '0.64rem', fontWeight: 600, color: '#64748b' }}>Elternportal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFormTier('partner'); setFormIsMain(false); }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      border: formTier === 'partner' ? '2px solid #16a34a' : '1.5px solid #cbd5e1',
                      background: formTier === 'partner' ? '#f0fdf4' : '#ffffff',
                      color: formTier === 'partner' ? '#15803d' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    Bildungspartner
                    <span style={{ display: 'block', fontSize: '0.64rem', fontWeight: 600, color: '#16a34a' }}>+ App-Start Hinweis</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFormTier('haupt'); setFormIsMain(true); }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      border: formTier === 'haupt' ? '2px solid #d97706' : '1.5px solid #cbd5e1',
                      background: formTier === 'haupt' ? '#fffbeb' : '#ffffff',
                      color: formTier === 'haupt' ? '#b45309' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    Haupt-Partner
                    <span style={{ display: 'block', fontSize: '0.64rem', fontWeight: 600, color: '#d97706' }}>Branchenexklusiv</span>
                  </button>
                </div>
              </div>

              {/* BRANCHENEXKLUSIVITÄTS-CHECK BEI HAUPT-BILDUNGSPARTNER */}
              {formTier === 'haupt' && formIndustry.trim().length > 0 && settings.sponsors.some(s =>
                (s.tier === 'haupt' || s.isMainSponsor) &&
                s.isActive &&
                s.id !== editingSponsor?.id &&
                s.industrySubline.toLowerCase().trim() === formIndustry.toLowerCase().trim()
              ) && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '0.73rem',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span>
                    Achtung: Die Branche <strong>„{formIndustry.trim()}“</strong> ist bereits durch einen aktiven Haupt-Bildungspartner belegt.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: 'none'
                  }}
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>

    {/* 🏛️ 2-STUFIGE SICHERHEITS-BESTÄTIGUNG BEIM LÖSCHEN EINES BILDUNGSPARTNERS (0,1% Goldstandard Satellite) */}
    <SecretarySponsorDeleteConfirmModal
      isOpen={Boolean(deletingSponsor)}
      sponsor={deletingSponsor}
      onClose={() => setDeletingSponsor(null)}
      onConfirm={(sponsorId) => {
        setDeletingSponsor(null);
        handleDeleteSponsor(sponsorId);
      }}
    />

    {/* 🏛️ Universal High-Fidelity PDF Preview Modal (0,1% Goldstandard) */}
    <UniversalPdfPreviewModal
      isOpen={pdfPreviewState.isOpen}
      onClose={handleClosePdfPreview}
      title={pdfPreviewState.title}
      subtitle={pdfPreviewState.subtitle}
      badgeText={pdfPreviewState.badgeText}
      filename={pdfPreviewState.filename}
      pdfBlob={pdfPreviewState.pdfBlob}
      isLoading={pdfPreviewState.isLoading}
    />
  </>
);
};
