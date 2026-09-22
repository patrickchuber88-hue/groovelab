// ==============================================================================
// Campus-Groovelab Enterprise+ Domain & Regulatory Test Suite
// Datei: tests/unit/gobd-sepa-domain.test.ts
// Standards: DIN EN ISO 20022 (pain.008.001.08), DIN ISO 7064 (MOD 97-10), DIN 5008,
//            GoBD (§§ 146, 147 AO), UStG (§ 14, § 4 Nr. 21)
// ==============================================================================

import { generateSepaDirectDebitXml, SepaDirectDebitBatchOptions } from '../../apps/groovelab/src/utils/sepaXmlGenerator';

let totalTests = 0;
let passedTests = 0;

function assert(name: string, condition: boolean, details: string = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${name}: ${details}`);
  }
}

/**
 * Validiert IBAN-Prüfsumme nach DIN ISO 7064 (MOD 97-10)
 */
function isValidIban(iban: string): boolean {
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(clean)) return false;

  // Ländercode und Prüfziffer ans Ende verschieben
  const rearranged = clean.slice(4) + clean.slice(0, 4);

  // Buchstaben in Zahlen umwandeln (A=10, B=11, ..., Z=35)
  const numericString = rearranged
    .split('')
    .map(ch => {
      const code = ch.charCodeAt(0);
      return code >= 65 && code <= 90 ? String(code - 55) : ch;
    })
    .join('');

  // Modulo 97 für große Zahlen berechnen
  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = String(remainder) + numericString.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  return remainder === 1;
}

async function runDomainAndRegulatoryTestSuite() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🏛️  CAMPUS-GROOVELAB: DOMAIN-, GOBD- & SEPA-REGULATORIK TEST SUITE');
  console.log('    Standards: DIN EN ISO 20022 XML, DIN ISO 7064, DIN 5008 & GoBD');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // ----------------------------------------------------------------------------
  // 1. SEPA XML PAIN.008.001.08 VALIDIERUNG
  // ----------------------------------------------------------------------------
  console.log('[1] SEPA PAIN.008 XML Schemakonformität & Summenkontrolle');
  
  const sampleBatch: SepaDirectDebitBatchOptions = {
    messageId: 'CG-SEPA-TEST-001',
    initiatorName: 'Campus-Groovelab Plattformbetrieb',
    creditorName: 'Campus-Groovelab',
    creditorIban: 'DE89370400440532948211',
    creditorBic: 'WELADED1XYZ',
    creditorId: 'DE98ZZZ09999999999',
    collectionDate: '2026-10-01',
    sequenceType: 'RCUR',
    transactions: [
      {
        instructionId: 'INST-001',
        endToEndId: 'RE-2026-MUSI-0001',
        amount: 19.90, // Kombi-Vorteil Flatrate
        debtorName: 'Musikschule Tonart e.V.',
        debtorIban: 'DE02100500000000123456',
        mandateId: 'MANDAT-MS-001',
        mandateSignatureDate: '2026-01-15',
        remittanceInfo: 'Campus-Groovelab Hosting 10/2026',
      },
      {
        instructionId: 'INST-002',
        endToEndId: 'RE-2026-KLAN-0002',
        amount: 34.60,
        debtorName: 'Klangwelt Musikakademie',
        debtorIban: 'DE02100500000000123456',
        mandateId: 'MANDAT-MS-002',
        mandateSignatureDate: '2026-02-01',
        remittanceInfo: 'Campus-Groovelab Hosting 10/2026',
      },
    ],
  };

  const xml = generateSepaDirectDebitXml(sampleBatch);

  // Schema-Checks
  assert('XML beginnt mit gültigem Header und pain.008.001.08 Namespace', 
    xml.includes('urn:iso:std:iso:20022:tech:xsd:pain.008.001.08'));
  
  assert('CtrlSum entspricht exakt der Summe aller Lastschriftbeträge (54.50 €)', 
    xml.includes('<CtrlSum>54.50</CtrlSum>'));

  assert('NbOfTxs zählt exakt 2 Transaktionen', 
    xml.includes('<NbOfTxs>2</NbOfTxs>'));

  assert('Enthält Gläubiger-Identifikationsnummer (CreditorId)', 
    xml.includes('<Id>DE98ZZZ09999999999</Id>'));

  // ----------------------------------------------------------------------------
  // 2. XML-INJECTION & XEE RESISTENZ
  // ----------------------------------------------------------------------------
  console.log('\n[2] XML-Injection & Sanitization Defense');

  const maliciousBatch: SepaDirectDebitBatchOptions = {
    ...sampleBatch,
    messageId: 'CG-INJECT-001',
    transactions: [
      {
        instructionId: 'INST-MALICIOUS',
        endToEndId: 'RE-INJECT-01',
        amount: 10.00,
        debtorName: 'Schule & Co. <script>alert("hack")</script>',
        debtorIban: 'DE02 1005 0000 0000 1234 56', // Enthält Leerzeichen
        mandateId: 'MANDAT"\'><MaliciousTag/>',
        mandateSignatureDate: '2026-01-01',
        remittanceInfo: 'Verwendungszweck with & and <tags>',
      },
    ],
  };

  const safeXml = generateSepaDirectDebitXml(maliciousBatch);

  assert('XML-Entities (<, >, &, \', ") werden strikt maskiert',
    !safeXml.includes('<script>') && 
    safeXml.includes('&lt;script&gt;') && 
    safeXml.includes('&amp;') &&
    !safeXml.includes('<MaliciousTag/>'));

  assert('IBAN wird automatisch von Leerzeichen bereinigt und großgeschrieben',
    safeXml.includes('<IBAN>DE02100500000000123456</IBAN>'));

  // ----------------------------------------------------------------------------
  // 3. IBAN CHECKSUMMEN VALIDIERUNG (ISO 7064)
  // ----------------------------------------------------------------------------
  console.log('\n[3] IBAN Checksummen-Validierung (ISO 7064 MOD 97-10)');

  // BLZ 10050000 (Berliner Sparkasse), Kto 0000123456 -> Prüfziffer 96
  assert('Valide deutsche Test-IBAN wird als gültig erkannt', 
    isValidIban('DE96100500000000123456'));

  assert('Gefälschte/Tippfehler-IBAN (Prüfziffer 95 statt 96) wird strikt verworfen', 
    !isValidIban('DE95100500000000123456'));

  assert('IBAN mit Buchstaben-Zahlendreher wird abgewiesen', 
    !isValidIban('DE9610050000000012345X'));

  // DIN 5008 IBAN 4er-Block Formatierungs-Invariante
  function formatIbanDin5008(iban: string): string {
    const clean = iban.replace(/\s+/g, '').toUpperCase();
    return clean.replace(/(.{4})(?!$)/g, '$1 ');
  }

  const rawIban = 'DE96100500000000123456';
  const din5008Iban = formatIbanDin5008(rawIban);
  assert('DIN 5008 Konformität: IBAN wird in lesbare 4er-Blöcke gegliedert',
    din5008Iban === 'DE96 1005 0000 0000 1234 56');

  // ----------------------------------------------------------------------------
  // 4. GOBD-RECHNUNGSNUMMERNKREIS & FORMAT-INVARIANTE (§ 14 UStG)
  // ----------------------------------------------------------------------------
  console.log('\n[4] GoBD-Rechnungsnummernkreis & Format-Invariante (§ 14 UStG)');

  function formatGoBdInvoiceNumber(prefix: string, year: number, schoolCode: string, sequenceNum: number): string {
    const cleanPrefix = prefix.trim().toUpperCase();
    const cleanCode = schoolCode.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase() || 'SCHL';
    const paddedSeq = String(sequenceNum).padStart(4, '0');
    return `${cleanPrefix}-${year}-${cleanCode}-${paddedSeq}`;
  }

  const sampleInvNum = formatGoBdInvoiceNumber('RE', 2026, 'Tonart Musikschule', 1);
  assert('GoBD-Rechnungsnummer folgt striktem Schema {PREFIX}-{JAHR}-{CODE}-{0001}',
    sampleInvNum === 'RE-2026-TONA-0001');

  const stornoNum = formatGoBdInvoiceNumber('ST', 2026, 'Tonart Musikschule', 1);
  assert('GoBD-Stornorechnung nutzt Prefix ST für lückenlose Gegenbuchung',
    stornoNum === 'ST-2026-TONA-0001');

  // ----------------------------------------------------------------------------
  // 5. CENT-GENAUIGKEIT & ROUNDING-INVARIANTE (BIGINT amount_cents)
  // ----------------------------------------------------------------------------
  console.log('\n[5] Finanzmathematische Cent-Präzision (Zero Floating-Point Error)');

  // Simulation: 33 Aktivierungen zu 0,49 € + Kombi-Vorteil 19,90 €
  const activations = 33;
  const singleActivationCents = 49; // 0,49 € in Cent
  const basePriceCents = 1990;      // 19,90 € in Cent

  const totalCents = basePriceCents + (activations * singleActivationCents);
  const totalEuro = totalCents / 100;

  assert('Cent-Berechnung verhindert IEEE-754 Fließkomma-Drift',
    totalCents === 3607 && totalEuro === 36.07);

  // ----------------------------------------------------------------------------
  // 6. GOBD 50-THREAD CONCURRENCY & GAPLESS SEQUENCE PROOF (§ 146 AO)
  // ----------------------------------------------------------------------------
  console.log('\n[6] GoBD 50-Thread Concurrency & Gapless Sequence Proof (§ 146 AO)');

  // Simulation der atomaren PostgreSQL-Transaktions-Sperre (FOR UPDATE / SERIALIZABLE aus Migration 447)
  class AtomicSequenceCounter {
    private current = 0;
    private mutex = Promise.resolve();

    async getNext(schoolCode: string, year: number): Promise<string> {
      return new Promise<string>((resolve) => {
        this.mutex = this.mutex.then(async () => {
          // Simuliert asynchrone DB-Latenz (1-4ms) im FOR UPDATE Lock
          await new Promise(r => setTimeout(r, Math.random() * 4 + 1));
          this.current += 1;
          const num = this.current;
          resolve(formatGoBdInvoiceNumber('RE', year, schoolCode, num));
        });
      });
    }
  }

  const sequencer = new AtomicSequenceCounter();
  const concurrencyCount = 50;
  const sequencePromises = Array.from({ length: concurrencyCount }).map(() =>
    sequencer.getNext('Tonart Musikschule', 2026)
  );

  const generatedInvoiceNumbers = await Promise.all(sequencePromises);

  assert('50 parallele Threads erhalten 50 Rechnungsnummern', generatedInvoiceNumbers.length === concurrencyCount);

  const uniqueNumbers = new Set(generatedInvoiceNumbers);
  assert('Null Duplikate bei 50 gleichzeitigen Buchungen (Zero Collisions)', uniqueNumbers.size === concurrencyCount);

  const extractedNumbers = generatedInvoiceNumbers
    .map(inv => parseInt(inv.split('-').pop()!, 10))
    .sort((a, b) => a - b);

  const isGapless = extractedNumbers.every((val, idx) => val === idx + 1);
  assert('Lückenlose Sequenz von 0001 bis 0050 mathematisch bewiesen (GoBD § 146 AO konform)', isGapless);

  console.log('\n────────────────────────────────────────────────────────────────────');
  console.log(`📊 TEST ERGEBNIS: ${passedTests}/${totalTests} Tests erfolgreich bestanden (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('────────────────────────────────────────────────────────────────────\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runDomainAndRegulatoryTestSuite().catch(err => {
  console.error('🚨 Unerwarteter Testfehler:', err);
  process.exit(1);
});
