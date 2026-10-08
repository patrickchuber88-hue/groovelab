import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface ProvisionSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProvisionSchool: (payload: any) => Promise<any>;
  onProvisionSuccess: (inviteData: {
    schoolName: string;
    loginUrl: string;
    email: string;
    contactPerson: string;
  }) => void;
}

export const ProvisionSchoolModal: React.FC<ProvisionSchoolModalProps> = ({
  isOpen,
  onClose,
  onProvisionSchool,
  onProvisionSuccess
}) => {
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolStreet, setNewSchoolStreet] = useState('');
  const [newSchoolHouseNumber, setNewSchoolHouseNumber] = useState('');
  const [newSchoolZip, setNewSchoolZip] = useState('');
  const [newSchoolCity, setNewSchoolCity] = useState('');
  const [newSchoolCountry, setNewSchoolCountry] = useState('Deutschland');
  const [newSchoolContact, setNewSchoolContact] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolNotes, setNewSchoolNotes] = useState('');
  const [newSchoolModule, setNewSchoolModule] = useState<'kombi' | 'campus' | 'groovelab' | 'none'>('kombi');
  const [newSchoolTrialMode, setNewSchoolTrialMode] = useState<'trial_30' | 'trial_14' | 'trial_60' | 'bypass' | 'paid'>('trial_30');
  const [provisioning, setProvisioning] = useState(false);

  if (!isOpen) return null;

  const isFormIncomplete = !newSchoolName.trim() || !newSchoolStreet.trim() || !newSchoolHouseNumber.trim() || !newSchoolZip.trim() || !newSchoolCity.trim() || !newSchoolEmail.trim();

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormIncomplete) {
      alert('Pflichtfelder unvollständig: Name, Straße, Hausnummer, PLZ, Ort und Schulleiter E-Mail sind zwingend erforderlich.');
      return;
    }

    try {
      setProvisioning(true);
      const isTrialMode = newSchoolTrialMode.startsWith('trial_');
      let trialDays = 30;
      if (newSchoolTrialMode === 'trial_14') trialDays = 14;
      if (newSchoolTrialMode === 'trial_60') trialDays = 60;

      const trialUntil = isTrialMode 
        ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString() 
        : null;

      const tokenUuid = crypto.randomUUID();
      const tokenExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const schoolPayload = {
        name: newSchoolName.trim(),
        street: newSchoolStreet.trim(),
        house_number: newSchoolHouseNumber.trim(),
        zip_code: newSchoolZip.trim(),
        city: newSchoolCity.trim(),
        country: newSchoolCountry,
        billing_email: newSchoolEmail.trim(),
        email: newSchoolEmail.trim(),
        billing_contact_person: newSchoolContact.trim() || 'Schulleitung',
        phone_number: newSchoolPhone.trim() || null,
        phone: newSchoolPhone.trim() || null,
        operator_notes: newSchoolNotes.trim() || null,
        invite_token: tokenUuid,
        invite_expires_at: tokenExpires,
        has_campus_subscription: newSchoolModule === 'campus' || newSchoolModule === 'kombi',
        has_groovelab_subscription: newSchoolModule === 'groovelab' || newSchoolModule === 'kombi',
        storage_addon_gb: 0,
        storage_addon_monthly_fee: 0.00,
        storage_addon_status: 'none',
        extra_billing_option: null,
        is_billing_booked: false,
        is_trial: isTrialMode,
        trial_until: trialUntil,
        subscription_bypass: newSchoolTrialMode === 'bypass',
        status: 'active',
        is_approved: true,
        created_at: new Date().toISOString()
      };

      const createdSchool = await onProvisionSchool(schoolPayload);

      // Generate Magic Invite link
      const inviteUrl = `${window.location.origin}/?school_id=${createdSchool.id}&invite=school_onboarding&token=${tokenUuid}`;
      onProvisionSuccess({
        schoolName: createdSchool.name,
        loginUrl: inviteUrl,
        email: newSchoolEmail.trim(),
        contactPerson: newSchoolContact.trim() || 'Schulleitung'
      });

      // Reset form
      setNewSchoolName('');
      setNewSchoolStreet('');
      setNewSchoolHouseNumber('');
      setNewSchoolZip('');
      setNewSchoolCity('');
      setNewSchoolEmail('');
      setNewSchoolContact('');
      setNewSchoolPhone('');
      setNewSchoolNotes('');
      onClose();
    } catch (err: any) {
      alert('Fehler beim Anlegen der Musikschule: ' + (err.message || err));
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="provision-school-dialog-title"
        style={{
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.22)',
        border: '1px solid #e2e8f0',
        maxWidth: '560px',
        width: '100%',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 id="provision-school-dialog-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Neue Musikschule provisionieren
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
              Legt einen neuen Mandanten an und generiert ein sofortiges Bereitstellungs-Kit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              padding: '6px',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreateSchool} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
              Name der Musikschule *
            </label>
            <input
              type="text"
              required
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.target.value)}
              placeholder="z. B. Musikakademie Freiburg"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.84rem',
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          {/* Straße & Hausnummer */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                Straße *
              </label>
              <input
                type="text"
                required
                value={newSchoolStreet}
                onChange={(e) => setNewSchoolStreet(e.target.value)}
                placeholder="z. B. Kaiser-Joseph-Str."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                Hausnr. *
              </label>
              <input
                type="text"
                required
                value={newSchoolHouseNumber}
                onChange={(e) => setNewSchoolHouseNumber(e.target.value)}
                placeholder="12a"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* PLZ & Ort */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                PLZ *
              </label>
              <input
                type="text"
                required
                value={newSchoolZip}
                onChange={(e) => setNewSchoolZip(e.target.value)}
                placeholder="79098"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                Ort *
              </label>
              <input
                type="text"
                required
                value={newSchoolCity}
                onChange={(e) => setNewSchoolCity(e.target.value)}
                placeholder="Freiburg"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Schulleiter & Telefon */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                Schulleiter / Kontaktperson *
              </label>
              <input
                type="text"
                required
                value={newSchoolContact}
                onChange={(e) => setNewSchoolContact(e.target.value)}
                placeholder="z. B. Michael Weber"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                Telefonnummer / Handy
              </label>
              <input
                type="tel"
                value={newSchoolPhone}
                onChange={(e) => setNewSchoolPhone(e.target.value)}
                placeholder="0761 1234567"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* E-Mail */}
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
              Schulleiter E-Mail *
            </label>
            <input
              type="email"
              required
              value={newSchoolEmail}
              onChange={(e) => setNewSchoolEmail(e.target.value)}
              placeholder="leitung@musikakademie.de"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.84rem',
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          {/* Modulpaket Segmented */}
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase' }}>
              Modulpaket
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[
                { id: 'none', label: 'Ungebucht' },
                { id: 'kombi', label: 'Kombi' },
                { id: 'campus', label: 'Campus' },
                { id: 'groovelab', label: 'GrooveLab' }
              ].map(m => {
                const isSel = newSchoolModule === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setNewSchoolModule(m.id as any)}
                    style={{
                      padding: '9px',
                      borderRadius: '12px',
                      border: isSel ? '1.5px solid #059669' : '1px solid #cbd5e1',
                      background: isSel ? '#ecfdf5' : '#ffffff',
                      color: isSel ? '#059669' : '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Testphase Mode */}
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase' }}>
              Testphase &amp; Modus
            </label>
            <select
              value={newSchoolTrialMode}
              onChange={(e) => setNewSchoolTrialMode(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="trial_30">30 Tage Testphase (Standard)</option>
              <option value="trial_14">14 Tage Schnell-Test</option>
              <option value="trial_60">60 Tage Intensiv-Test</option>
              <option value="bypass">Abo-Bypass (Dauerhaft Kostenfrei / Partner)</option>
              <option value="paid">Sofort kostenpflichtig aktivieren</option>
            </select>
          </div>

          {/* Interne Betreiber-Notiz */}
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
              Interne Betreiber-Notiz (Optional)
            </label>
            <input
              type="text"
              value={newSchoolNotes}
              onChange={(e) => setNewSchoolNotes(e.target.value)}
              placeholder="z. B. Erstkontakt Telefonat: Ziel ist Kombi-Paket für 50 Schüler"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.84rem',
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={provisioning || isFormIncomplete}
            style={{
              padding: '13px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 850,
              cursor: (provisioning || isFormIncomplete) ? 'not-allowed' : 'pointer',
              opacity: (provisioning || isFormIncomplete) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'none',
              marginTop: '8px'
            }}
          >
            <Plus size={16} />
            <span>{provisioning ? 'Wird provisioniert...' : 'Schule anlegen & Einladungs-Kit generieren'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
