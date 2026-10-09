import React, { useEffect } from 'react';
import { ShieldAlert, CheckCircle2, ArrowRight, X } from 'lucide-react';

export interface HealthDataWarningModalProps {
  isOpen: boolean;
  matchedTerm?: string;
  onNeutralize: () => void;
  onConfirmSend: () => void;
  onCancel: () => void;
}

export const HealthDataWarningModal: React.FC<HealthDataWarningModalProps> = ({
  isOpen,
  matchedTerm,
  onNeutralize,
  onConfirmSend,
  onCancel
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="health-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
        <button
          onClick={onCancel}
          aria-label="Schließen"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 id="health-modal-title" className="text-lg font-bold text-slate-900">
              Datenschutz-Schutzschild
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Schutz besonderer Datenkategorien (DSGVO Art. 9)
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Ihre Nachricht enthält möglicherweise gesundheitliche Angaben{' '}
          {matchedTerm && <span className="font-semibold text-amber-700">({matchedTerm})</span>}.
          Zum Schutz der Privatsphäre von Schülern und Lehrkräften empfehlen wir, gesundheitliche
          Details nicht in Chatnachrichten zu erfassen.
        </p>

        <div className="space-y-2.5">
          <button
            onClick={onNeutralize}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-2xl shadow-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Text neutralisieren & senden
          </button>

          <button
            onClick={onConfirmSend}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-2xl transition-all"
          >
            <span>Unverändert senden (Freiwillig)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onCancel}
            className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            Zurück zum Chat
          </button>
        </div>
      </div>
    </div>
  );
};
