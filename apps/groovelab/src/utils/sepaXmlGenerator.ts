/**
 * ISO 20022 SEPA Direct Debit XML Generator (pain.008.001.02)
 * Standardisierter Lastschrifteinzug für B2B-Musikschulträger und Direktzahler
 * Compliance: EPC SEPA Scheme Rulebook, GoBD, ISO 20022
 */

export interface SepaDebtorTransaction {
  instructionId: string;              // Eindeutige Transaktions-ID
  endToEndId: string;                 // Rechnungsnummer (z. B. RE-104-2607-01)
  amount: number;                     // Betrag in EUR
  debtorName: string;                 // Name der Musikschule / des Zahlers
  debtorIban: string;                 // IBAN des Zahlers
  debtorBic?: string;                 // BIC (optional für SEPA)
  mandateId: string;                  // Mandatsreferenz (z. B. MANDAT-MS-104)
  mandateSignatureDate: string;       // YYYY-MM-DD (Datum der Mandatserteilung)
  remittanceInfo: string;             // Verwendungszweck (z. B. "Campus-Groovelab Cloud-Hosting RE-104-2607-01")
}

export interface SepaDirectDebitBatchOptions {
  messageId?: string;                 // Nachrichten-ID (z. B. CG-SEPA-20260827-01)
  initiatorName: string;              // Name des Plattformbetreibers (z. B. "Patrick Huber Einzelunternehmen")
  creditorName: string;               // Gläubiger-Name
  creditorIban: string;               // Gläubiger-IBAN
  creditorBic?: string;               // Gläubiger-BIC
  creditorId: string;                 // Gläubiger-Identifikationsnummer (z. B. "DE98ZZZ09999999999")
  collectionDate: string;             // Fälligkeitsdatum YYYY-MM-DD (min. 2 Tage in Zukunft)
  sequenceType?: 'FRST' | 'RCUR' | 'OOFF' | 'FNAL'; // Standard: RCUR (Wiederkehrend)
  transactions: SepaDebtorTransaction[];
}

/**
 * Erzeugt eine ISO 20022 pain.008.001.02 XML-Datei für den SEPA-Lastschrifteinzug
 */
export function generateSepaDirectDebitXml(options: SepaDirectDebitBatchOptions): string {
  const now = new Date();
  const creationDateTime = now.toISOString().replace(/Z$/, '');
  const msgId = options.messageId || `CG-SEPA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
  const pmtInfId = `PMT-${msgId}`;
  
  const totalAmount = options.transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0).toFixed(2);
  const nbOfTxs = options.transactions.length;
  const seqType = options.sequenceType || 'RCUR';

  const cleanIban = (iban: string) => iban.replace(/\s+/g, '').toUpperCase();
  const escapeXml = (str: string) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${totalAmount}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(options.initiatorName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(pmtInfId)}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${totalAmount}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>CORE</Cd>
        </LclInstrm>
        <SeqTp>${seqType}</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${options.collectionDate}</ReqdColltnDt>
      <Cdtr>
        <Nm>${escapeXml(options.creditorName)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${cleanIban(options.creditorIban)}</IBAN>
        </Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId>
          ${options.creditorBic ? `<BIC>${options.creditorBic.trim().toUpperCase()}</BIC>` : '<Othr><Id>NOTPROVIDED</Id></Othr>'}
        </FinInstnId>
      </CdtrAgt>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${escapeXml(options.creditorId)}</Id>
              <SchmeNm>
                <Prtry>SEPA</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>`;

  options.transactions.forEach((tx) => {
    xml += `
      <DrctDbtTxInf>
        <PmtId>
          <EndToEndId>${escapeXml(tx.endToEndId)}</EndToEndId>
        </PmtId>
        <InstdAmt Ccy="EUR">${Math.abs(tx.amount).toFixed(2)}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${escapeXml(tx.mandateId)}</MndtId>
            <DtOfSgntr>${tx.mandateSignatureDate || '2026-01-01'}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId>
            ${tx.debtorBic ? `<BIC>${tx.debtorBic.trim().toUpperCase()}</BIC>` : '<Othr><Id>NOTPROVIDED</Id></Othr>'}
          </FinInstnId>
        </DbtrAgt>
        <Dbtr>
          <Nm>${escapeXml(tx.debtorName)}</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id>
            <IBAN>${cleanIban(tx.debtorIban)}</IBAN>
          </Id>
        </DbtrAcct>
        <RmtInf>
          <Ustrd>${escapeXml(tx.remittanceInfo)}</Ustrd>
        </RmtInf>
      </DrctDbtTxInf>`;
  });

  xml += `
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;

  return xml;
}

/**
 * 1-Klick Download der SEPA XML Datei
 */
export function downloadSepaXmlFile(options: SepaDirectDebitBatchOptions): void {
  if (typeof document === 'undefined') return;

  const xmlContent = generateSepaDirectDebitXml(options);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `SEPA_PAIN008_${options.collectionDate}_CampusGroovelab.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
