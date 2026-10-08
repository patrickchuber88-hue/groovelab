# 📱 Exemplar 4: PWA Mobile 100dvh & Zero-Content-Occlusion Layout
<!--
Bounded Context: Mobile Ergonomics / PWA Architecture
Rules: 100dvh viewport height, safe-area-inset padding for top (Notch) & bottom (Home Indicator),
touch target >= 48x48px, scrollable body with sticky bottom action composer.
-->

### Problemstellung
Auf Smartphones verdecken die PWA-Menüleiste oder der iOS Home Indicator häufig Eingabefelder und Buttons. Es muss eine ergonomische Vollbild-Maske (`100dvh`) umgesetzt werden, die garantiert keinen Inhalt abschneidet.

### Konforme 0,1% Goldstandard Implementierung

```tsx
// apps/groovelab/src/components/mobile/MobileStudentTaskView.tsx
import React, { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';

interface MobileStudentTaskViewProps {
  title: string;
  onBack: () => void;
  onSubmit: (text: string) => void;
}

export const MobileStudentTaskView: React.FC<MobileStudentTaskViewProps> = ({
  title,
  onBack,
  onSubmit
}) => {
  const [note, setNote] = useState('');

  return (
    <div
      style={{
        height: '100dvh', // Dynamischer Viewport: passt sich exakt Tastatur & Browser-Leisten an
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
        overflow: 'hidden'
      }}
    >
      {/* Oberer Header: Dockt mit safe-area-inset-top unter der Statusleiste an */}
      <header
        style={{
          paddingTop: 'max(14px, env(safe-area-inset-top))',
          paddingBottom: '12px',
          paddingLeft: '16px',
          paddingRight: '16px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Zurück zum Dashboard"
          style={{
            width: '48px',
            height: '48px', // Mindestens 48x48px Touch-Target
            borderRadius: '16px',
            backgroundColor: '#f1f5f9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          {title}
        </h1>
      </header>

      {/* Hauptinhalt: Autark scrollbar, kein Überlappen */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
            Aktuelle Wochenaufgabe
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
            Bitte spiele Takt 1 bis 16 mit dem Metronom bei 80 BPM.
          </p>
        </div>
      </main>

      {/* Unten verankerter Sticky-Composer mit safe-area-inset-bottom */}
      <footer
        style={{
          paddingTop: '12px',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          paddingLeft: '16px',
          paddingRight: '16px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexShrink: 0
        }}
      >
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Frage an die Lehrkraft..."
          aria-label="Frage an die Lehrkraft"
          style={{
            flex: 1,
            height: '48px',
            borderRadius: '16px',
            border: '1px solid #cbd5e1',
            padding: '0 16px',
            fontSize: '0.925rem',
            outline: 'none',
            color: '#0f172a'
          }}
        />
        <button
          type="button"
          onClick={() => { if (note.trim()) { onSubmit(note); setNote(''); } }}
          aria-label="Frage senden"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            backgroundColor: '#10b981',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer'
          }}
        >
          <Send className="w-5 h-5" aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
};
```
