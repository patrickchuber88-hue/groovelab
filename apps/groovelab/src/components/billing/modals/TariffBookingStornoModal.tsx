import React from 'react';
import { RotateCcw, RefreshCw } from 'lucide-react';

interface TariffBookingStornoModalProps {
  stornoModalBooking: any | null;
  tariffStornoReason: string;
  setTariffStornoReason: (reason: string) => void;
  processingTariffStorno: boolean;
  onClose: () => void;
  onExecuteTariffStorno: () => void;
}

export const TariffBookingStornoModal: React.FC<TariffBookingStornoModalProps> = ({
  stornoModalBooking,
  tariffStornoReason,
  setTariffStornoReason,
  processingTariffStorno,
  onClose,
  onExecuteTariffStorno
}) => {
  if (!stornoModalBooking) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
      <div role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: '480px', background: '#ffffff', borderRadius: '20px', padding: '28px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
            <RotateCcw size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
              GoBD-Generalumkehr einbuchen
            </h4>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Stornobeleg zu {stornoModalBooking.receipt_number}
            </span>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
          <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Revisionssicherer Grundsatz (Unveränderbarkeit):</strong>
          Der Originalbeleg wird <strong>weder verändert noch gelöscht</strong>. Es wird ein manipulationssicherer Stornobeleg mit negativer Monatsrate ({(-1 * Math.abs(Number(stornoModalBooking.total_monthly_rate_net || 0))).toFixed(2).replace('.', ',')} €) in das Journal eingebucht.
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
            Stornogrund (Pflichtangabe für den Prüfpfad)
          </label>
          <input
            type="text"
            value={tariffStornoReason}
            onChange={(e) => setTariffStornoReason(e.target.value)}
            placeholder="z.B. Fehlerhafter Tarifabschluss / Schulleitungs-Korrektur"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={processingTariffStorno}
            style={{ padding: '9px 16px', borderRadius: '10px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onExecuteTariffStorno}
            disabled={processingTariffStorno || !tariffStornoReason.trim()}
            style={{ padding: '9px 18px', borderRadius: '10px', background: '#dc2626', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {processingTariffStorno ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            Stornobeleg verbindlich buchen
          </button>
        </div>
      </div>
    </div>
  );
};
