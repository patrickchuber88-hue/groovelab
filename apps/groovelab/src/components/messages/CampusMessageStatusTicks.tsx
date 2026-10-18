import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';

export interface CampusMessageStatusTicksProps {
  status?: 'sending' | 'sent' | 'delivered' | 'read' | string;
  isRead?: boolean;
  readAt?: string | null;
  isSelf: boolean;
  recipientIsOffDuty?: boolean; // 🛡️ ArbSchG / Quiet-Hours Feierabend-Schutz
  isGroup?: boolean;
  groupAllRead?: boolean;
  size?: number;
}

/**
 * 🏛️ CampusMessageStatusTicks
 * 0,1% WhatsApp & Apple Messenger-Niveau Status-Häkchen Suite.
 * Bildet den weltweiten Standard für Nachrichten-Zustand ab:
 * - 🕒 Pending/Sending (Clock)
 * - ✓ Sent (1 Haken, am Server eingegangen)
 * - ✓✓ Delivered (2 Haken dezent, am Empfängergerät zugestellt)
 * - ✓✓ Read (2 Haken akzentuiert Cyan/Mint, im Viewport gelesen)
 * - 🛡️ Feierabend-Schutz: Bei aktiver Ruhezeit der Lehrkraft wird der Status
 *   für den Schüler als 'Zugestellt (Ruhezeit)' maskiert (Anti-Erreichbarkeitsdruck).
 */
export const CampusMessageStatusTicks: React.FC<CampusMessageStatusTicksProps> = ({
  status = 'sent',
  isRead = false,
  readAt,
  isSelf,
  recipientIsOffDuty = false,
  isGroup = false,
  groupAllRead = false,
  size = 14
}) => {
  if (!isSelf) return null;

  // 1. Pending / Sending State
  if (status === 'sending') {
    return (
      <span 
        title="Wird gesendet..." 
        aria-label="Wird gesendet" 
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <Clock size={size - 2} color="rgba(255, 255, 255, 0.65)" />
      </span>
    );
  }

  // 2. 🛡️ ArbSchG Quiet-Hours Feierabend-Schutz:
  // Wenn der Empfänger (z. B. Lehrkraft) Feierabend hat, wird der Lese-Status gegenüber
  // Schülern/Eltern maskiert, um psychologischen Erwartungsdruck zu verhindern.
  if (recipientIsOffDuty) {
    return (
      <span 
        title="Zugestellt (Empfänger hat Feierabend / Ruhezeit)" 
        aria-label="Zugestellt (Ruhezeit aktiv)" 
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <CheckCheck size={size} color="rgba(255, 255, 255, 0.65)" strokeWidth={2.4} />
      </span>
    );
  }

  // 3. Read State (1:1 oder Gruppe vollständig gelesen)
  const isEffectivelyRead = isRead || status === 'read' || (isGroup && groupAllRead);

  if (isEffectivelyRead) {
    const formattedTime = readAt 
      ? new Date(readAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      : null;
    const label = formattedTime ? `Gelesen um ${formattedTime} Uhr` : 'Gelesen';

    return (
      <span 
        title={label} 
        aria-label={label} 
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {/* Weltweiter WhatsApp 0,1% Standard: Heller Cyan-Blau/Mint Akzent auf dunklem Grund */}
        <CheckCheck size={size} color="#67e8f9" strokeWidth={2.6} />
      </span>
    );
  }

  // 4. Delivered State (Am Gerät zugestellt oder Gruppen-Standard)
  if (status === 'delivered' || isGroup) {
    return (
      <span 
        title="Zugestellt" 
        aria-label="Zugestellt" 
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <CheckCheck size={size} color="rgba(255, 255, 255, 0.65)" strokeWidth={2.4} />
      </span>
    );
  }

  // 5. Sent State (Standard 1 Haken am Server angekommen)
  return (
    <span 
      title="Gesendet" 
      aria-label="Gesendet" 
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <Check size={size} color="rgba(255, 255, 255, 0.65)" strokeWidth={2.4} />
    </span>
  );
};

export default CampusMessageStatusTicks;
