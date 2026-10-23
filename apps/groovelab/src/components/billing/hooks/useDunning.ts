import { useState } from 'react';
import { generateInvoicePDF } from '../../../utils/pdfGenerator';
import { DunningFilter, DunningLevel, OperatorSettings } from '../types';

export function useDunning(showActionToast: (msg: string) => void) {
  const [dunningFilter, setDunningFilter] = useState<DunningFilter>('all');

  const handleSendDunningEmail = (
    invoice: any, 
    inv: any, 
    dunningLevel: DunningLevel,
    operator: { operatorCompany: string; operatorIban: string; operatorBic: string }
  ) => {
    const invoiceId = invoice.id;
    const schoolName = inv.schoolName || 'Musikschule';
    const recipientEmail = inv.billingEmail || '';
    const formattedAmount = Number(invoice.amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    const dueDate = invoice.date || 'vor 30 Tagen';

    let subject = '';
    let body = '';

    if (dunningLevel === 1) {
      subject = `Freundliche Zahlungserinnerung zu Rechnung ${invoiceId} – ${schoolName}`;
      body = `Sehr geehrte Damen und Herren der ${schoolName},

sicherlich ist es im laufenden Schulbetrieb lediglich Ihrer geschätzten Aufmerksamkeit entgangen: Für die Bereitstellung Ihrer Campus-Groovelab Cloud-Infrastruktur ist die Abrechnung ${invoiceId} über ${formattedAmount} seit dem ${dueDate} zur Zahlung fällig.

Wir bitten Sie höflich, den fälligen Betrag von ${formattedAmount} innerhalb der nächsten 7 Tage unter Angabe des Verwendungszwecks "${invoiceId}" auf unser Geschäftskonto zu überweisen.

Empfänger:         ${operator.operatorCompany}
IBAN:              ${operator.operatorIban}
BIC:               ${operator.operatorBic}
Verwendungszweck:  ${invoiceId}

Sollten Sie die Überweisung zwischenzeitlich bereits veranlasst haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.

Mit freundlichen Grüßen
Ihr Campus-Groovelab Abrechnungsteam`;
    } else if (dunningLevel === 2) {
      subject = `1. Mahnung zu Rechnung ${invoiceId} – ${schoolName}`;
      body = `Sehr geehrte Damen und Herren der ${schoolName},

auf unsere vorangegangene Zahlungserinnerung zum Beleg ${invoiceId} konnten wir bisher leider noch keinen Zahlungseingang auf unserem Geschäftskonto feststellen.

Gemäß § 286 Abs. 3 BGB befinden Sie sich im Zahlungsverzug. Im Rahmen unserer kommunalen Kulanzfrist berechnen wir Ihnen auf dieser Stufe noch keine Mahnpauschale (0,00 €).

Fälliger Gesamtbetrag: ${formattedAmount}
Zahlungsfrist: 7 Tage ab Zugang dieses Schreibens.

Hinweis: Sie können im Sekretariats-Cockpit jederzeit per 1-Klick die 48h-Sofort-Freigabe aktivieren, sobald Ihre Kämmerei die Überweisung angewiesen hat.

Bitte überweisen Sie den Gesamtbetrag unter Angabe des Verwendungszwecks auf unser Geschäftskonto:
Empfänger:         ${operator.operatorCompany}
IBAN:              ${operator.operatorIban}
BIC:               ${operator.operatorBic}
Verwendungszweck:  ${invoiceId}

Mit freundlichen Grüßen
Ihr Campus-Groovelab Abrechnungsteam`;
    } else {
      const canonicalFee = inv?.dunningStatus?.dunningFee
        ?? ((inv?.hasCampus && inv?.hasGroovelab) ? 19.90 : 14.90);
      const formattedFee = canonicalFee.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
      const totalWithFee = (Number(invoice.amount || 0) + canonicalFee).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
      subject = `2. MAHNUNG / VERWALTUNGS-SCHREIBSCHUTZ: Rechnung ${invoiceId} – ${schoolName}`;
      body = `Sehr geehrte Damen und Herren der ${schoolName},

trotz Ablauf der mehrwöchigen Kulanzfrist ist die Abrechnung ${invoiceId} über ${formattedAmount} weiterhin unbeglichen.

Anstelle der gesetzlichen Verzugspauschale von 40,00 € (§ 288 Abs. 5 BGB) berechnen wir Ihnen lediglich unsere reduzierte B2B-Kulanzpauschale in Höhe von ${formattedFee}.

Gesamtforderung inkl. B2B-Verzugspauschale: ${totalWithFee}
(Hauptforderung: ${formattedAmount} zzgl. ${formattedFee} B2B-Verzugspauschale gem. § 288 Abs. 5 BGB)
Letzte Zahlungsfrist: 5 Werktage ab Zugang dieses Schreibens.

WICHTIGER HINWEIS (100 % DIDAKTISCHE IMMUNITÄT):
Bis zum Zahlungseingang (oder der Aktivierung der 48h-Sofort-Freigabe im Sekretariat) befindet sich ausschließlich die Sekretariats-Verwaltung im schreibgeschützten Lesemodus (§§ 273, 320 BGB). Schüler und Lehrkräfte genießen 100 % Didaktische Immunität und haben weiterhin uneingeschränkten Zugriff auf den Unterricht.

Bitte überweisen Sie den Gesamtbetrag unter Angabe des Verwendungszwecks auf unser Geschäftskonto:
Empfänger:         ${operator.operatorCompany}
IBAN:              ${operator.operatorIban}
BIC:               ${operator.operatorBic}
Verwendungszweck:  ${invoiceId}

Mit freundlichen Grüßen
Campus-Groovelab Mahnwesen & Abrechnungsteam`;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body);
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }

    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    showActionToast(`✉️ Mahnung Stufe ${dunningLevel} geöffnet & Text (§ 288 BGB) in Zwischenablage kopiert.`);
  };

  const [dispatchModalTarget, setDispatchModalTarget] = useState<{ invoice: any; inv: any } | null>(null);

  const handleOpenDispatchModal = (invoice: any, inv: any) => {
    setDispatchModalTarget({ invoice, inv });
  };

  const handleCloseDispatchModal = () => {
    setDispatchModalTarget(null);
  };

  const handleSendInvoiceEmail = (
    invoice: any, 
    inv: any, 
    operator: OperatorSettings,
    setEmailSentToast: (msg: string | null) => void
  ) => {
    // 🏛️ 1% Goldstandard: Open the Guided GoBD Dispatch Modal
    setDispatchModalTarget({ invoice, inv });
  };

  return {
    dunningFilter,
    setDunningFilter,
    handleSendDunningEmail,
    handleSendInvoiceEmail,
    dispatchModalTarget,
    setDispatchModalTarget,
    handleOpenDispatchModal,
    handleCloseDispatchModal,
  };
}
