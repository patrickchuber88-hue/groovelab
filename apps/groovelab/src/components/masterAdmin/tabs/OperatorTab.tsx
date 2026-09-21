import React, { useState } from 'react';
import { 
  Building2, Building, Landmark, CreditCard, Shield, ShieldCheck, 
  Key, Lock, QrCode, Check, RefreshCw, Smartphone, Fingerprint
} from 'lucide-react';
import { TwoFactorSetupModal } from './operator/TwoFactorSetupModal';
import { EpcGiroCodeModal } from './operator/EpcGiroCodeModal';
import { formatIbanBlocks } from '../hooks/useMasterAdminOperator';

interface OperatorTabProps {
  billingCompany: string;
  setBillingCompany: (val: string) => void;
  billingContact: string;
  setBillingContact: (val: string) => void;
  billingStreet: string;
  setBillingStreet: (val: string) => void;
  billingZip: string;
  setBillingZip: (val: string) => void;
  billingCity: string;
  setBillingCity: (val: string) => void;
  billingIban: string;
  setBillingIban: (val: string) => void;
  billingBic: string;
  setBillingBic: (val: string) => void;
  taxMode: 'standard_vat' | 'small_business';
  setTaxMode: (val: 'standard_vat' | 'small_business') => void;
  vatId: string;
  setVatId: (val: string) => void;
  taxNumber: string;
  setTaxNumber: (val: string) => void;
  vatRatePercent: number;
  setVatRatePercent: (val: number) => void;
  priceDisplayMode: 'net_plus_vat' | 'gross_incl_vat';
  setPriceDisplayMode: (val: 'net_plus_vat' | 'gross_incl_vat') => void;
  grandfatheringActive: boolean;
  setGrandfatheringActive: (val: boolean) => void;
  grandfatheringCutoffDate: string;
  setGrandfatheringCutoffDate: (val: string) => void;
  updatingBilling: boolean;
  onUpdateBillingSettings: (e: React.FormEvent) => Promise<void>;

  adminUsername: string;
  setAdminUsername: (val: string) => void;
  adminPassword: string;
  setAdminPassword: (val: string) => void;
  updatingAdmin: boolean;
  onUpdateAdminCredentials: (e: React.FormEvent) => Promise<void>;

  twoFactorEnabled: boolean;
  twoFactorSecret: string;
  showTwoFactorModal: boolean;
  setShowTwoFactorModal: (val: boolean) => void;
  twoFactorCodeInput: string;
  setTwoFactorCodeInput: (val: string) => void;
  onToggleTwoFactor: () => Promise<void>;
  onConfirmTwoFactor: (e: React.FormEvent) => Promise<void>;

  masterPasskeyActive: boolean;
  onRegisterPasskey: () => Promise<void>;

  showGiroCodeModal: boolean;
  setShowGiroCodeModal: (val: boolean) => void;
}

export const OperatorTab: React.FC<OperatorTabProps> = ({
  billingCompany,
  setBillingCompany,
  billingContact,
  setBillingContact,
  billingStreet,
  setBillingStreet,
  billingZip,
  setBillingZip,
  billingCity,
  setBillingCity,
  billingIban,
  setBillingIban,
  billingBic,
  setBillingBic,
  taxMode,
  setTaxMode,
  vatId,
  setVatId,
  taxNumber,
  setTaxNumber,
  vatRatePercent,
  setVatRatePercent,
  priceDisplayMode,
  setPriceDisplayMode,
  grandfatheringActive,
  setGrandfatheringActive,
  grandfatheringCutoffDate,
  setGrandfatheringCutoffDate,
  updatingBilling,
  onUpdateBillingSettings,

  adminUsername,
  setAdminUsername,
  adminPassword,
  setAdminPassword,
  updatingAdmin,
  onUpdateAdminCredentials,

  twoFactorEnabled,
  twoFactorSecret,
  showTwoFactorModal,
  setShowTwoFactorModal,
  twoFactorCodeInput,
  setTwoFactorCodeInput,
  onToggleTwoFactor,
  onConfirmTwoFactor,

  masterPasskeyActive,
  onRegisterPasskey,

  showGiroCodeModal,
  setShowGiroCodeModal
}) => {
  return (
    <div
      role="tabpanel"
      id="master-panel-operator"
      aria-labelledby="master-tab-operator"
      tabIndex={0}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
      className="animate-fade-in"
    >
      {/* Header Panel */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={20} color="#0f172a" />
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
              Betreiber &amp; Zugang
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.90rem', color: '#64748b', fontWeight: 500 }}>
            Verwaltung der Betreibergesellschaft, Rechnungsanschrift, Auszahlungs-Bankdaten und Root-Zugangsdaten.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '100px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#475569',
            fontSize: '0.80rem',
            fontWeight: 700
          }}>
            <Shield size={14} color="#475569" />
            Root Superuser Access
          </div>
        </div>
      </div>

      {/* Top Row Grid: Betreiber-Stammdaten & Bankverbindung */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
        gap: '28px',
        alignItems: 'start'
      }}>
        {/* Card 1: Betreibergesellschaft & Stammdaten */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
              <Building2 size={18} color="#0f172a" /> Betreibergesellschaft &amp; Stammdaten
            </h3>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '100px',
              background: taxMode === 'standard_vat' ? '#dbeafe' : '#f0fdf4',
              color: taxMode === 'standard_vat' ? '#1e40af' : '#15803d',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              {taxMode === 'standard_vat' ? <Landmark size={12} color="#475569" /> : <Building size={12} color="#475569" />}
              <span>{taxMode === 'standard_vat' ? 'Regelbesteuerung (19% MwSt)' : 'Kleinunternehmer (0% MwSt)'}</span>
            </span>
          </div>

          <form onSubmit={onUpdateBillingSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                Firma / Betreibergesellschaft
              </label>
              <input
                type="text"
                value={billingCompany}
                onChange={(e) => setBillingCompany(e.target.value)}
                placeholder="z.B. Campus-Groovelab (Einzelunternehmen Patrick Huber)"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 13px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Ansprechpartner / Inhaber
                </label>
                <input
                  type="text"
                  value={billingContact}
                  onChange={(e) => setBillingContact(e.target.value)}
                  placeholder="Patrick Huber"
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Straße &amp; Hausnummer
                </label>
                <input
                  type="text"
                  value={billingStreet}
                  onChange={(e) => setBillingStreet(e.target.value)}
                  placeholder="Karl-Fürstenberg-Str. 59"
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  PLZ
                </label>
                <input
                  type="text"
                  value={billingZip}
                  onChange={(e) => setBillingZip(e.target.value)}
                  placeholder="79618"
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Ort
                </label>
                <input
                  type="text"
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                  placeholder="Rheinfelden"
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Besteuerungsmodus */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#475569', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                Besteuerungs-Modell (UStG)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: taxMode === 'small_business' ? '#ffffff' : 'transparent',
                  border: `1.5px solid ${taxMode === 'small_business' ? '#16a34a' : '#cbd5e1'}`,
                  cursor: 'pointer',
                  fontSize: '0.80rem',
                  fontWeight: 700
                }}>
                  <input
                    type="radio"
                    name="tax_mode"
                    checked={taxMode === 'small_business'}
                    onChange={() => setTaxMode('small_business')}
                  />
                  <span>Kleinunternehmer (0% MwSt)</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: taxMode === 'standard_vat' ? '#ffffff' : 'transparent',
                  border: `1.5px solid ${taxMode === 'standard_vat' ? '#16a34a' : '#cbd5e1'}`,
                  cursor: 'pointer',
                  fontSize: '0.80rem',
                  fontWeight: 700
                }}>
                  <input
                    type="radio"
                    name="tax_mode"
                    checked={taxMode === 'standard_vat'}
                    onChange={() => setTaxMode('standard_vat')}
                  />
                  <span>Regel (19% MwSt)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={updatingBilling}
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: updatingBilling ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Check size={16} /> {updatingBilling ? 'Speichert...' : 'Stammdaten speichern'}
            </button>
          </form>
        </div>

        {/* Card 2: SEPA Bankverbindung & Auszahlung */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
              <CreditCard size={18} color="#0f172a" /> SEPA Bankverbindung &amp; GiroCode
            </h3>
            <button
              type="button"
              onClick={() => setShowGiroCodeModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                fontSize: '0.74rem',
                fontWeight: 800,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              <QrCode size={14} /> EPC-GiroCode Vorschau
            </button>
          </div>

          <form onSubmit={onUpdateBillingSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                IBAN (Auszahlungskonto)
              </label>
              <input
                type="text"
                value={billingIban}
                onChange={(e) => setBillingIban(formatIbanBlocks(e.target.value))}
                placeholder="DE89 3704 0044 0532 0130 00"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 13px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                BIC / SWIFT-Code
              </label>
              <input
                type="text"
                value={billingBic}
                onChange={(e) => setBillingBic(e.target.value.toUpperCase())}
                placeholder="GENODEF1S38"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 13px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.78rem', color: '#166534', lineHeight: 1.4 }}>
              💳 <strong>Rechnungs-Aufdruck:</strong> Diese Bankverbindung wird auf allen PDF-Rechnungen und für automatische SEPA-Lastschriften verwendet.
            </div>

            <button
              type="submit"
              disabled={updatingBilling}
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: updatingBilling ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Check size={16} /> {updatingBilling ? 'Speichert...' : 'Bankverbindung speichern'}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Row: Root Sicherheit, 2FA & WebAuthn Passkeys */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: '28px',
        alignItems: 'start'
      }}>
        {/* Card 3: Root-Zugangsdaten */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: '"Outfit", sans-serif' }}>
            <Key size={18} color="#0f172a" /> Master-Admin Zugangsdaten
          </h3>

          <form onSubmit={onUpdateAdminCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                Master-Benutzername
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                Neues Master-Passwort (optional)
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Leer lassen, um aktuelles Passwort zu behalten"
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
              />
            </div>

            <button
              type="submit"
              disabled={updatingAdmin}
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: updatingAdmin ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Check size={16} /> {updatingAdmin ? 'Wird gespeichert...' : 'Zugangsdaten aktualisieren'}
            </button>
          </form>
        </div>

        {/* Card 4: FIDO2 Passkeys & Zwei-Faktor-Schutz */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: '"Outfit", sans-serif' }}>
            <ShieldCheck size={18} color="#0f172a" /> Erweiterte Authentifizierung
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 2FA Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Smartphone size={20} color="#64748b" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>Zwei-Faktor-Schutz (TOTP)</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Authenticator-Apps (Apple, Google, 1Password)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleTwoFactor}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: twoFactorEnabled ? '#dcfce7' : '#fee2e2',
                  color: twoFactorEnabled ? '#15803d' : '#b91c1c',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {twoFactorEnabled ? 'Aktiv (Deaktivieren)' : 'Jetzt einrichten'}
              </button>
            </div>

            {/* Touch ID / FIDO2 Passkeys */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Fingerprint size={20} color="#64748b" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>Touch ID / WebAuthn Passkey</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Passwortloser Biometrie-Login für Mac/iPhone</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onRegisterPasskey}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: masterPasskeyActive ? '#dcfce7' : '#0f172a',
                  color: masterPasskeyActive ? '#15803d' : '#ffffff',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {masterPasskeyActive ? 'Kopplung erneuern' : 'Passkey registrieren'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TwoFactorSetupModal
        isOpen={showTwoFactorModal}
        adminUsername={adminUsername}
        twoFactorSecret={twoFactorSecret}
        twoFactorCodeInput={twoFactorCodeInput}
        setTwoFactorCodeInput={setTwoFactorCodeInput}
        onClose={() => setShowTwoFactorModal(false)}
        onConfirm={onConfirmTwoFactor}
      />

      <EpcGiroCodeModal
        isOpen={showGiroCodeModal}
        billingCompany={billingCompany}
        billingIban={billingIban}
        billingBic={billingBic}
        onClose={() => setShowGiroCodeModal(false)}
      />
    </div>
  );
};
