/**
 * CAMT.053 XML & MT940 Bank Statement Parser (SEPA Standard)
 * Automatisierter 2-Wege-Zahlungsabgleich für:
 * 1. B2B Musikschul-Rechnungen (Format: RE-[SCHUL_ID]-[YYMM]-01)
 * 2. B2C Schüler-Aktivierungen (Format: CG-[HASH8]-[YYMM])
 */

export interface ParsedBankTransaction {
  id: string;
  bookingDate: string;                // YYYY-MM-DD
  valutaDate?: string;                // YYYY-MM-DD
  amount: number;                     // Positiv für Gutschriften / Geldeingänge
  currency: string;                   // EUR
  debtorName?: string;                // Name des Zahlenden
  debtorIban?: string;                // IBAN des Zahlenden
  remittanceInfo: string;             // Verwendungszweck
  matchedType?: 'b2b_school' | 'b2c_student' | 'unmatched';
  matchedId?: string;                 // Extrahierte Rechnungs-ID oder Schüler-Hash
  matchedSchoolId?: string;
  matchedUserId?: string;
}

export interface BankStatementParseResult {
  statementId: string;
  accountIban?: string;
  openingBalance?: number;
  closingBalance?: number;
  periodStart?: string;
  periodEnd?: string;
  totalCreditAmount: number;
  totalDebitAmount: number;
  transactions: ParsedBankTransaction[];
  b2bMatches: ParsedBankTransaction[];
  b2cMatches: ParsedBankTransaction[];
  unmatched: ParsedBankTransaction[];
}

/**
 * Parst einen CAMT.053 (ISO 20022 XML) oder einfachen Text-/MT940-Kontoauszug
 */
export function parseBankStatementFile(rawContent: string): BankStatementParseResult {
  const cleanContent = rawContent.trim();

  // 1. Prüfe auf CAMT.053 XML Format
  if (cleanContent.startsWith('<?xml') || cleanContent.includes('<Document') || cleanContent.includes('<BkToCstmrStmt>')) {
    return parseCamt053Xml(cleanContent);
  }

  // 2. Fallback: CSV oder Textauszug
  return parseCsvOrTextStatement(cleanContent);
}

/**
 * Parst standardisiertes CAMT.053 XML via DOMParser
 */
function parseCamt053Xml(xmlStr: string): BankStatementParseResult {
  let doc: Document;
  if (typeof window !== 'undefined' && window.DOMParser) {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlStr, 'application/xml');
  } else {
    // Basic fallback wenn kein DOMParser vorhanden
    return parseCsvOrTextStatement(xmlStr);
  }

  const transactions: ParsedBankTransaction[] = [];
  let totalCredit = 0;
  let totalDebit = 0;

  const stmtNode = doc.querySelector('Stmt');
  const statementId = stmtNode?.querySelector('Id')?.textContent || `STMT-${Date.now()}`;
  const accountIban = stmtNode?.querySelector('Acct > Id > IBAN')?.textContent || undefined;

  const ntryNodes = doc.querySelectorAll('Ntry');
  ntryNodes.forEach((ntry, idx) => {
    try {
      const amtNode = ntry.querySelector('Amt');
      const rawAmt = parseFloat(amtNode?.textContent || '0');
      const cdtDbtInd = ntry.querySelector('CdtDbtInd')?.textContent; // CRDT = Gutschrift, DBIT = Lastschrift
      const amount = cdtDbtInd === 'DBIT' ? -Math.abs(rawAmt) : Math.abs(rawAmt);
      const currency = amtNode?.getAttribute('Ccy') || 'EUR';

      const bookingDate = ntry.querySelector('BookgDt > Dt')?.textContent || 
                          ntry.querySelector('BookgDt > DtTm')?.textContent?.split('T')[0] ||
                          new Date().toISOString().split('T')[0];

      const valutaDate = ntry.querySelector('ValDt > Dt')?.textContent || bookingDate;

      // Verwendungszweck (Ustrd)
      const ustrdNodes = ntry.querySelectorAll('NtryDtls > TxDtls > RmtInf > Ustrd');
      const ustrdList: string[] = [];
      ustrdNodes.forEach(u => {
        if (u.textContent) ustrdList.push(u.textContent);
      });
      const remittanceInfo = ustrdList.join(' ') || 
                             ntry.querySelector('AddtlNtryInf')?.textContent || 
                             '';

      // Schuldner-Name & IBAN
      const debtorName = ntry.querySelector('NtryDtls > TxDtls > RltdPties > Dbtr > Nm')?.textContent || undefined;
      const debtorIban = ntry.querySelector('NtryDtls > TxDtls > RltdPties > DbtrAcct > Id > IBAN')?.textContent || undefined;

      const tx: ParsedBankTransaction = {
        id: `tx-${idx + 1}-${Date.now()}`,
        bookingDate,
        valutaDate,
        amount,
        currency,
        debtorName,
        debtorIban,
        remittanceInfo
      };

      classifyTransaction(tx);
      transactions.push(tx);

      if (amount > 0) totalCredit += amount;
      else totalDebit += Math.abs(amount);
    } catch (e) {
      console.warn('Fehler beim Parsen eines CAMT.053 Eintrags:', e);
    }
  });

  const b2bMatches = transactions.filter(t => t.matchedType === 'b2b_school');
  const b2cMatches = transactions.filter(t => t.matchedType === 'b2c_student');
  const unmatched = transactions.filter(t => t.matchedType === 'unmatched');

  return {
    statementId,
    accountIban,
    totalCreditAmount: totalCredit,
    totalDebitAmount: totalDebit,
    transactions,
    b2bMatches,
    b2cMatches,
    unmatched
  };
}

/**
 * Parst CSV-Kontoauszüge gängiger Banken (Sparkasse, VR-Bank, Deutsche Bank, N26, GLS)
 */
function parseCsvOrTextStatement(textStr: string): BankStatementParseResult {
  const lines = textStr.split(/\r?\n/).filter(l => l.trim().length > 0);
  const transactions: ParsedBankTransaction[] = [];
  let totalCredit = 0;
  let totalDebit = 0;

  lines.forEach((line, idx) => {
    // Regex für Verwendungszwecke im Text suchen
    const b2bMatch = line.match(/RE-([0-9A-Z]+)-(\d{4})-\d{2}/i) || line.match(/RE-(\d{4}-\d{2})/i);
    const b2cMatch = line.match(/CG-([A-Z0-9]{4,12})-(\d{4})/i);

    // Betrags-Erkennung (z.B. "14,90", "0,49", "19.90")
    const amountMatch = line.match(/(\d+[.,]\d{2})\s*(EUR|€)?/i);
    let amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;

    // Negativ-Prüfung bei Sollbuchungen
    if (line.includes('Soll') || line.includes('-') && !line.includes('RE-') && !line.includes('CG-')) {
      amount = -Math.abs(amount);
    }

    if (b2bMatch || b2cMatch || amount !== 0) {
      const tx: ParsedBankTransaction = {
        id: `tx-csv-${idx + 1}`,
        bookingDate: new Date().toISOString().split('T')[0],
        amount,
        currency: 'EUR',
        remittanceInfo: line
      };

      classifyTransaction(tx);
      transactions.push(tx);

      if (amount > 0) totalCredit += amount;
      else totalDebit += Math.abs(amount);
    }
  });

  const b2bMatches = transactions.filter(t => t.matchedType === 'b2b_school');
  const b2cMatches = transactions.filter(t => t.matchedType === 'b2c_student');
  const unmatched = transactions.filter(t => t.matchedType === 'unmatched');

  return {
    statementId: `CSV-IMPORT-${Date.now()}`,
    totalCreditAmount: totalCredit,
    totalDebitAmount: totalDebit,
    transactions,
    b2bMatches,
    b2cMatches,
    unmatched
  };
}

/**
 * Ordnet eine Transaktion automatisch B2B oder B2C zu
 */
function classifyTransaction(tx: ParsedBankTransaction): void {
  const rem = tx.remittanceInfo.toUpperCase();

  // 1. Prüfe B2B Musikschul-Rechnung: RE-[SCHUL_ID]-[YYMM]-01
  const b2bRegex = /RE-([0-9A-Z]+)-(\d{4})-(\d{2})/i;
  const b2bMatch = rem.match(b2bRegex);
  if (b2bMatch) {
    tx.matchedType = 'b2b_school';
    tx.matchedId = b2bMatch[0];
    tx.matchedSchoolId = b2bMatch[1];
    return;
  }

  // 2. Prüfe B2C Schüler-Aktivierung: CG-[HASH8]-[YYMM]
  const b2cRegex = /CG-([A-Z0-9]{4,12})-(\d{4})/i;
  const b2cMatch = rem.match(b2cRegex);
  if (b2cMatch) {
    tx.matchedType = 'b2c_student';
    tx.matchedId = b2cMatch[0];
    return;
  }

  tx.matchedType = 'unmatched';
}
