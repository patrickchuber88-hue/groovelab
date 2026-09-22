import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Ban, Check } from 'lucide-react';
import { getSchoolNumericId } from '../types';

interface InvoiceStornoModalProps {
  stornoModalInvoice: { invoice: any; school: any } | null;
  onClose: () => void;
  onSuccess: () => void;
  showActionToast: (msg: string) => void;
  getPaidInvoices: (schoolId: string) => string[];
}

export const InvoiceStornoModal: React.FC<InvoiceStornoModalProps> = ({
  stornoModalInvoice,
  onClose,
  onSuccess,
  showActionToast,
  getPaidInvoices
}) => {
  const [stornoReason, setStornoReason] = useState<string>('Rechnungskorrektur / Fehlbuchung');
  const [processingStorno, setProcessingStorno] = useState<boolean>(false);

  if (!stornoModalInvoice) return null;

  const handleExecuteStorno = async () => {
    setProcessingStorno(true);
    try {
      const origInv = stornoModalInvoice.invoice;
      const school = stornoModalInvoice.school;
      const schoolNumericId = getSchoolNumericId(school.schoolId);
      const now = new Date();
      const yearShort = String(now.getFullYear()).slice(-2);
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');

      const stornoId = origInv.id.startsWith('RE-') 
        ? origInv.id.replace('RE-', 'ST-') 
        : `ST-${schoolNumericId}-${yearShort}${monthStr}-01`;

      const today = new Date().toISOString().split('T')[0];
      const stornoAmount = -Math.abs(origInv.amount);

      // 🛡️ GoBD-Storno-Snapshot mit SHA-256 Prüfsiegel gem. §§ 146, 147 AO
      const stornoPayload = `${stornoId}:${origInv.id}:${school.schoolId}:${stornoAmount}:${today}`;
      let stornoSha256Seal = '';
      try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stornoPayload));
        stornoSha256Seal = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        stornoSha256Seal = stornoId;
      }

      // Insert storno record into database
      await supabase.from('invoices').insert({
        id: stornoId,
        school_id: school.schoolId,
        type: 'STORNO',
        amount: stornoAmount,
        status: 'cancelled',
        billing_date: today,
        due_date: today,
        notes: `Stornorechnung zu Beleg ${origInv.id}. Grund: ${stornoReason}`,
        items: [
          {
            name: `Stornierung Beleg ${origInv.id}`,
            quantity: -1,
            unit: 'Storno',
            unitPrice: Math.abs(origInv.amount),
            amount: stornoAmount,
            gobd_snapshot: {
              storno_id: stornoId,
              original_invoice_id: origInv.id,
              school_id: school.schoolId,
              amount: stornoAmount,
              reason: stornoReason,
              sha256_seal: stornoSha256Seal,
              created_at: new Date().toISOString()
            }
          }
        ]
      });

      // Update original invoice status
      await supabase.from('invoices')
        .update({ status: 'storniert' })
        .eq('id', origInv.id);

      // Remove from paid invoices list if it was marked paid
      const currentPaid = getPaidInvoices(school.schoolId);
      const updatedPaid = currentPaid.filter(id => id !== origInv.id);
      localStorage.setItem(`paid_invoices_${school.schoolId}`, JSON.stringify(updatedPaid));

      showActionToast(`📄 GoBD-Stornobeleg ${stornoId} erfolgreich verbucht.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Fehler beim Erstellen des Stornobelegs: ' + err.message);
    } finally {
      setProcessingStorno(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }} className="animate-fade-in">
      <div role="dialog" aria-modal="true" style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '520px',
        padding: '32px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ban size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              GoBD-Stornobeleg erstellen
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: '#64748b' }}>Ursprungsbeleg:</span>
            <strong style={{ fontFamily: 'monospace' }}>{stornoModalInvoice.invoice.id}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: '#64748b' }}>Musikschule:</span>
            <strong>{stornoModalInvoice.school.schoolName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: '#64748b' }}>Stornobetrag (Gutschrift):</span>
            <strong style={{ color: '#dc2626' }}>-{Math.abs(stornoModalInvoice.invoice.amount).toFixed(2).replace('.', ',')} €</strong>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
            Stornierungsgrund (GoBD Pflichtangabe)
          </label>
          <input
            type="text"
            value={stornoReason}
            onChange={(e) => setStornoReason(e.target.value)}
            placeholder="z. B. Tarifkorrektur, Kulanzstorno, Doppelbuchung"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '11px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
              fontWeight: 600,
              outline: 'none'
            }}
          />
        </div>

        <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.74rem', color: '#991b1b', lineHeight: 1.35 }}>
          🛡️ <strong>GoBD Unveränderbarkeit:</strong> Der Ursprungsbeleg wird nicht gelöscht, sondern als storniert markiert. Es wird automatisch eine Gegenbuchung mit Belegnummer <code>ST-...</code> im Ledger angelegt.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '10px 16px', borderRadius: '10px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={processingStorno || !stornoReason.trim()}
            onClick={handleExecuteStorno}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              cursor: processingStorno || !stornoReason.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Check size={16} /> {processingStorno ? 'Wird verbucht...' : 'Stornobeleg jetzt erzeugen'}
          </button>
        </div>
      </div>
    </div>
  );
};
