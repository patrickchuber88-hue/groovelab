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
    const dueDate = invoice.date || 'vor 14 Tagen';

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
      const fee = 5.00;
      const totalWithFee = (Number(invoice.amount || 0) + fee).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
      subject = `1. Mahnung zu Rechnung ${invoiceId} – ${schoolName}`;
      body = `Sehr geehrte Damen und Herren der ${schoolName},

auf unsere vorangegangene Zahlungserinnerung zum Beleg ${invoiceId} konnten wir bisher leider noch keinen Zahlungseingang auf unserem Geschäftskonto feststellen.

Gemäß § 286 BGB befinden Sie sich im Zahlungsverzug. Wir berechnen Ihnen hiermit eine moderate Bearbeitungspauschale in Höhe von 5,00 €.

Fälliger Gesamtbetrag: ${totalWithFee}
(Hauptforderung: ${formattedAmount} zzgl. 5,00 € Bearbeitungspauschale)
Zahlungsfrist: 7 Tage ab Zugang dieses Schreibens.

Bitte überweisen Sie den Gesamtbetrag unverzüglich unter Angabe des Verwendungszwecks auf unser Geschäftskonto:
Empfänger:         ${operator.operatorCompany}
IBAN:              ${operator.operatorIban}
BIC:               ${operator.operatorBic}
Verwendungszweck:  ${invoiceId}

Mit freundlichen Grüßen
Ihr Campus-Groovelab Abrechnungsteam`;
    } else {
      const b2bFee = 40.00;
      const totalWithFee = (Number(invoice.amount || 0) + b2bFee).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
      subject = `LETZTE MAHNUNG / ANDROHUNG SYSTEMSPERRE: Rechnung ${invoiceId} – ${schoolName}`;
      body = `Sehr geehrte Damen und Herren der ${schoolName},

trotz mehrfacher Zahlungserinnerungen und Mahnungen ist die Abrechnung ${invoiceId} über ${formattedAmount} weiterhin unbeglichen.

Wir machen nunmehr die gesetzliche Verzugspauschale gemäß § 288 Abs. 5 BGB in Höhe von 40,00 € geltend.

Gesamtforderung inkl. gesetzlicher B2B-Verzugspauschale (§ 288 Abs. 5 BGB): ${totalWithFee}
(Hauptforderung: ${formattedAmount} zzgl. 40,00 € gesetzliche Verzugspauschale gem. § 288 Abs. 5 BGB)
Letzte Zahlungsfrist: 5 Werktage ab Zugang dieses Schreibens.

WICHTIGER HINWEIS: Sollte bis zum Fristablauf kein Zahlungseingang auf unserem Geschäftskonto verbucht sein, machen wir von unserem gesetzlichen Zurückbehaltungsrecht gemäß §§ 273, 320 BGB Gebrauch. Der Cloud-Zugang für Ihre Musikschule wird sodann in den schreibgeschützten Sperr-Modus versetzt und die Gesamtforderung an unseren Inkasso-Partner übergeben.

Bitte vermeiden Sie weitere Unannehmlichkeiten und Mehrkosten durch sofortigen Ausgleich:
Empfänger:         ${operator.operatorCompany}
IBAN:              ${operator.operatorIban}
BIC:               ${operator.operatorBic}
Verwendungszweck:  ${invoiceId}

Mit freundlichen Grüßen
Campus-Groovelab Mahnwesen & Rechtsabteilung`;
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
