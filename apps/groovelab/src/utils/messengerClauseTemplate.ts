/**
 * Muster-Schulordnungs-Klausel & Vertragsklausel für Musikschulen
 * „Digitaler Messenger- & Kommunikations-Kodex (Campus-Groovelab)“
 * 
 * Rechtsgrundlagen:
 * - §§ 823, 832 BGB (Exkulpation von Schulleitung & Lehrkräften)
 * - § 5 ArbZG & BSG „Herrenberg“-Doktrin (Arbeitszeit- & Feierabendschutz für Lehrkräfte)
 * - Art. 6 Digital Services Act (DSA - Safe-Harbor-Haftungsprivileg)
 * - Art. 5 Abs. 1 lit. e & Art. 6 DSGVO (Zweckbindung & Speicherbegrenzung)
 * - § 8a SGB VIII (Kinderschutzkonzept & Deeskalations-Gate)
 */

export const getMessengerClauseTemplate = (schoolName: string = 'der Musikschule'): string => {
  return `§ [...] Digitale Kommunikation & Nutzung der Schul-Plattform „Campus-Groovelab“

(1) Bildungs- & Unterrichtszweck:
${schoolName} stellt ihren Schülerinnen, Schülern und Erziehungsberechtigten die digitale Plattform „Campus-Groovelab“ zur Verfügung. Die Nutzung der plattforminternen Kommunikationsfunktionen (Direktnachrichten mit Lehrkräften, Ensemble- & Band-Pinnwände) dient ausschließlich unterrichtsbezogenen Zwecken (Stundenplanabstimmung, Hausaufgabenheft, Probenorganisation und didaktischer Austausch).

(2) Ausschluss privater Peer-to-Peer-Kommunikation (Kinderschutz):
Zur Gewährleistung eines geschützten Raumes und zur wirksamen Prävention von Cybermobbing existiert in Campus-Groovelab keine offene oder private 1:1-Schüler-zu-Schüler-Chatfunktion. Ensemble- und Band-Pinnwände sind didaktisch an eine Unterrichtsgruppe gebunden und unterliegen einem automatisierten Inhalts- und Respektfilter („Pre-Flight Respect-Guard“).

(3) Didaktische Autonomie, Erreichbarkeit & gesetzliche Ruhezeiten:
Die plattforminterne Kommunikation stellt keinen 24/7-Notfallkanal dar. Lehrkräfte sind außerhalb ihrer vereinbarten Unterrichts- und Arbeitszeiten nicht zur Kenntnisnahme oder Beantwortung von Nachrichten verpflichtet (Schutz der Arbeitsruhe gem. § 5 ArbZG). Dringende oder unvorhergesehene Unterrichtsabsagen sind über die regulären Primärkanäle (per E-Mail an die Lehrkraft oder telefonisch an das Schulsekretariat) zu übermitteln.

(4) Bandroom-Ruhepausen & Nachtruhe:
Zur Unterstützung eines gesunden Medienkonsums und zur Wahrung der Nachtruhe pausieren bandbezogene Pinnwände (Shoutboxen) automatisch in den Abend- und Nachtstunden (20:00 bis 07:00 Uhr) sowie an Wochenenden. In diesen Zeiträumen ist das Verfassen neuer Nachrichten deaktiviert.

(5) Sofortiges Ausblenderecht („Flag-to-Hide“):
Sollte ein Schüler einen Beitrag als unangemessen oder verletzend empfinden, kann der Beitrag mit einem Klick gemeldet werden und wird unverzüglich für alle Bandmitglieder unsichtbar geschaltet. Eine endgültige Prüfung erfolgt durch die zuständige Lehrkraft oder Schulleitung an deren nächstem regulären Arbeitstag.

(6) Datenschutz & Speicherbegrenzung (Art. 5 DSGVO):
Nachrichten in Band-Pinnwänden unterliegen einer rollierenden 14-Tage-Speicherbegrenzung (zwei Probenzyklen) und werden danach automatisch und unwiderruflich gelöscht. Daten von Minderjährigen werden strikt datensparsam und ohne Tracking verarbeitet.`;
};

export const copyMessengerClauseToClipboard = async (schoolName?: string): Promise<boolean> => {
  const text = getMessengerClauseTemplate(schoolName);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('Failed to copy messenger clause:', err);
    return false;
  }
};
