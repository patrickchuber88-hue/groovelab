import React from 'react';
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
  const handleDecision = async (deleteAfterContract: boolean) => {
    try {
      await supabase
        .from('users')
        .update({ delete_after_contract: deleteAfterContract, contract_decision_made: true })
        .eq('id', userId);
      onDecisionComplete(userId, isHome);
    } catch (err) {
      console.error('Error saving contract decision:', err);
      onCancel();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '24px' }}>
      <div style={{ background: '#ffffff', borderRadius: '32px', padding: '40px', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '16px', color: '#1e293b' }}>Vertragsende bald erreicht</h2>
        <p style={{ color: '#64748b', marginBottom: '32px', lineHeight: '1.5' }}>
          Wir haben die Information erhalten, dass dein Vertrag bald endet. Bitte teile uns mit, was nach Ablauf mit deinem Account und deinen Daten passieren soll.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={() => handleDecision(true)}
            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}
          >
            Account nach Vertragsende löschen
          </button>
          <button 
            onClick={() => handleDecision(false)}
            style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}
          >
            Account inaktiv behalten (Archiv)
          </button>
        </div>
      </div>
    </div>
  );
};
