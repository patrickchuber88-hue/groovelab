import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ContractEndPromptProps {
  userId: string;
  isHome?: boolean;
  onDecisionComplete: (userId: string, isHome?: boolean) => void;
  onCancel: () => void;
}

export const ContractEndPrompt: React.FC<ContractEndPromptProps> = ({
  userId,
  isHome,
  onDecisionComplete,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDecision = async (deleteAfterContract: boolean) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await supabase
        .from('users')
        .update({ delete_after_contract: deleteAfterContract, contract_decision_made: true })
        .eq('id', userId);
      onDecisionComplete(userId, isHome);
    } catch (err) {
      console.error('Error saving contract decision:', err);
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '24px' }}>
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Vertragsende bald erreicht"
        style={{ background: '#ffffff', borderRadius: '32px', padding: '40px', maxWidth: '480px', width: '100%', textAlign: 'center' }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '16px', color: '#1e293b' }}>Vertragsende bald erreicht</h2>
        <p style={{ color: '#64748b', marginBottom: '32px', lineHeight: '1.5' }}>
          Wir haben die Information erhalten, dass dein Vertrag bald endet. Bitte teile uns mit, was nach Ablauf mit deinem Account und deinen Daten passieren soll.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDecision(true)}
            style={{ 
              background: '#ef4444', 
              color: 'white', 
              border: 'none', 
              padding: '16px', 
              borderRadius: '16px', 
              fontWeight: 800, 
              cursor: isSubmitting ? 'default' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              touchAction: 'manipulation'
            }}
          >
            {isSubmitting ? 'Wird gespeichert...' : 'Account nach Vertragsende löschen'}
          </button>
          <button 
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDecision(false)}
            style={{ 
              background: '#f1f5f9', 
              color: '#64748b', 
              border: 'none', 
              padding: '16px', 
              borderRadius: '16px', 
              fontWeight: 700, 
              cursor: isSubmitting ? 'default' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              touchAction: 'manipulation'
            }}
          >
            Account inaktiv behalten (Archiv)
          </button>
        </div>
      </div>
    </div>
  );
};
