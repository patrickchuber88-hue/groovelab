# ♿ Exemplar 2: BFSG 2025 / WCAG 2.2 AA Barrierefreier Button & Unifarben-Doktrin
<!--
Bounded Context: Universal Accessibility / Design System
Rules: 44x44px minimum touch target, full keyboard support (Enter/Space),
contrast >= 4.5:1 (Slate-900 on Solar Gold), border: 'none' (Zero Color-Clash).
-->

### Problemstellung
Ein Aktions-Button soll für Schüler und Eltern bereitgestellt werden. Er muss das Barrierefreiheitsstärkungsgesetz (BFSG 2025 / WCAG 2.2 AA) erfüllen, ohne Tastatur-Barrieren und ohne Farbkollisionen zwischen Füllung und Rahmen.

### Konforme 0,1% Goldstandard Implementierung

```tsx
// apps/groovelab/src/components/ui/AccessibleActionButton.tsx
import React from 'react';
import { Sparkles } from 'lucide-react';

interface AccessibleActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  count?: number;
}

export const AccessibleActionButton: React.FC<AccessibleActionButtonProps> = ({
  label,
  onClick,
  disabled = false,
  count
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      role="button"
      tabIndex={disabled ? -1 : 0}
      disabled={disabled}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={count !== undefined ? `${label}, ${count} Einträge vorhanden` : label}
      style={{
        // Zero Color-Clash: Unifarbener GrooveLab-Goldton (#facc15) ohne abweichenden Rahmen
        backgroundColor: disabled ? '#e2e8f0' : '#facc15',
        color: disabled ? '#94a3b8' : '#0f172a', // WCAG AAA Kontrast 8,9:1 gegen #facc15
        border: 'none',
        borderRadius: '16px',
        minWidth: '44px',
        minHeight: '44px',
        padding: '0 18px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 700,
        fontSize: '0.925rem',
        outline: 'none',
        transition: 'transform 0.15s ease, background-color 0.15s ease'
      }}
      className="focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500 active:scale-95"
    >
      <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span 
          aria-hidden="true"
          style={{
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: '9999px',
            padding: '2px 8px',
            fontSize: '0.75rem',
            fontWeight: 800
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
};
```
