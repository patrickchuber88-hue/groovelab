import React from "react";
import { Flame } from "lucide-react";
import { PwaModalShell } from "../../ui/PwaModalShell";

export interface StudentRulesModalProps {
  isOpen: boolean;
  evolutionLevel?: number;
  onClose: () => void;
}

export const StudentRulesModal: React.FC<StudentRulesModalProps> = ({
  isOpen,
  evolutionLevel = 1,
  onClose,
}) => {
  return (
    <PwaModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Spielregeln: Flammen-Pfad (Level ${evolutionLevel})`}
      icon={<Flame size={24} color="#ea580c" fill="#ea580c" />}
      maxWidth="460px"
      footerActions={
        <button
          onClick={onClose}
          type="button"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            padding: '14px 20px',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            width: '100%',
            minHeight: '48px',
            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.25)',
            transition: 'all 0.15s ease',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none'
          }}
          className="hover-scale"
          onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(234, 88, 12, 0.35)')}
          onMouseOut={(e) => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(234, 88, 12, 0.25)')}
        >
          Alles klar!
        </button>
      }
    >
      <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
        Finde deinen eigenen Übe-Rhythmus! Regelmäßiges Üben baut deine Serie auf und schaltet neue Flammen-Stufen frei – ganz ohne Druck mit 3 Schutzschilden pro Woche.
      </p>

      {/* Flame Levels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Die Flammen-Stufen:
        </span>
        
        {/* Start-Funke */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#eab308', display: 'flex', alignItems: 'center' }}>
            <Flame size={20} fill="currentColor" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Stufe 1: Start-Funke</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Streak von 1 - 3 Tagen • Ziel: <strong style={{ color: '#854d0e' }}>{evolutionLevel === 3 ? 10 : evolutionLevel === 2 ? 5 : 3} Min.</strong> Üben täglich
            </div>
          </div>
        </div>

        {/* Power-Flamme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#f97316', display: 'flex', alignItems: 'center' }}>
            <Flame size={20} fill="currentColor" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Stufe 2: Power-Flamme</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Streak von 4 - 8 Tagen • Ziel: <strong style={{ color: '#a21caf' }}>{evolutionLevel === 3 ? 15 : evolutionLevel === 2 ? 10 : 5} Min.</strong> Üben täglich
            </div>
          </div>
        </div>

        {/* Meister-Feuer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}>
            <Flame size={20} fill="currentColor" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Stufe 3: Meister-Feuer</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Streak ab 9 Tagen • Ziel: <strong style={{ color: '#b91c1c' }}>{evolutionLevel === 3 ? 20 : evolutionLevel === 2 ? 15 : 10} Min.</strong> Üben täglich
            </div>
          </div>
        </div>
      </div>

      {/* 3 Schutzschilde & Ferien Info */}
      <div style={{ background: '#e6f4ea', border: '1px solid #d1fae5', borderRadius: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 850, fontSize: '0.85rem', marginBottom: '6px' }}>
          🛡️ 3 wöchentliche Schutzschilde & Ferienpause
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#166534', lineHeight: 1.45 }}>
          Jede Woche erhältst du <strong>3 Schutzschilde</strong>, die verpasste Übetage automatisch absichern. Deine Flamme erlischt nicht, sondern geht in den schützenden Glut-Modus über.
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: '#166534', lineHeight: 1.45 }}>
          <strong>Ferienzeit:</strong> In Schulferien und an Feiertagen wird dein Streak automatisch eingefroren (kein Übezwang). Wer in den Ferien freiwillig übt, erhält <strong>2× XP (Ferien-Booster)</strong>!
        </p>
      </div>
    </PwaModalShell>
  );
};

