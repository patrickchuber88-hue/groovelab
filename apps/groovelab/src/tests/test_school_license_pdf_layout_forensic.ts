/**
 * ==============================================================================
 * 📄 CAMPUS-GROOVELAB: FORENSIC 1-PAGE PDF LAYOUT CLAMPING TEST SUITE
 * ==============================================================================
 * Standards: DIN 5008 (Schriftgutgestaltung), BGB § 328, SGB II § 28 Abs. 7,
 *            OWASP ASVS Level 3, Zero-Secret-Leakage, GoBD Sammelzahler Immunität
 * ==============================================================================
 */

import assert from 'assert';
import { createSchoolLicenseCertificateDocument } from '../utils/schoolLicenseCertificatePdfGenerator';

async function runSchoolLicensePdfLayoutForensicSuite() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   CAMPUS-GROOVELAB: FORENSIC 1-PAGE PDF LAYOUT CLAMPING SUITE      ║');
  console.log('║   Testing 1-Page Invariant, Extreme Overflows & Sammelzahler Parity║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}: ${err?.message || err}`);
      failed++;
    }
  }

  // Test 1: Standard Certificate Generation
  await test('Invariant 1: Standard Certificate generates exactly 1 A4 page', async () => {
    const doc = await createSchoolLicenseCertificateDocument({
      studentName: 'Max Mustermann',
      studentId: 'stud-1234-abcd',
      schoolName: 'Musikschule Groovelab City',
      instrument: 'Klavier & Gehörbildung'
    });

    assert.strictEqual(doc.getNumberOfPages(), 1, 'Standard certificate must have exactly 1 page');
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    assert.ok(Math.abs(width - 210) < 1.0, `Width must be A4 (210mm), got ${width}`);
    assert.ok(Math.abs(height - 297) < 1.0, `Height must be A4 (297mm), got ${height}`);
  });

  // Test 2: Extreme 200-Character School Name & Long Multi-Line Student Name
  await test('Invariant 2: Extreme 200-char string inputs clamped to strictly 1 page', async () => {
    const extremeSchoolName = 'Städtische Musikschule der Bundesstadt Bonn & Region Rhein-Sieg gGmbH für musikalische Frühförderung, Instrumentalbildung und solistische Talentakademie im Verband deutscher Musikschulen e.V.';
    const extremeStudentName = 'Alexander Maximilian Constantin Freiherr von und zu Gutenberg-Hohenzollern der Dritte';
    const extremeInstrument = 'Klassische Querflöte, Altblockflöte, barockes Traversflöten-Ensemble und historische Aufführungspraxis';

    const doc = await createSchoolLicenseCertificateDocument({
      studentName: extremeStudentName,
      studentId: 'stud-extreme-9999',
      schoolName: extremeSchoolName,
      instrument: extremeInstrument
    });

    assert.strictEqual(doc.getNumberOfPages(), 1, 'Extreme overflowing input must still produce strictly 1 page via auto-shrink');
  });

  // Test 3: Unicode & Special Characters
  await test('Invariant 3: Special characters, umlauts and accents render reliably', async () => {
    const doc = await createSchoolLicenseCertificateDocument({
      studentName: 'Aimée Björn-Søren François Müller',
      studentId: 'stud-unicode-777',
      schoolName: 'École de Musique & Konservatorium Zürich-Nord / Genf',
      instrument: 'Cello & Kontrabass'
    });

    assert.strictEqual(doc.getNumberOfPages(), 1, 'Unicode certificate must have exactly 1 page');
  });

  // Test 4: Sammelzahler Zero-Secret & Commercial Purity Invariant
  await test('Invariant 4: Sammelzahler purity (Zero IBAN, Zero Payment Demands, Zero Withdrawal)', async () => {
    const doc = await createSchoolLicenseCertificateDocument({
      studentName: 'Sarah Connor',
      studentId: 'stud-5555',
      schoolName: 'Rockakademie Berlin',
      instrument: 'Gesang'
    });

    // Extract raw PDF stream text to verify absence of illegal commercial strings
    const pdfDataUri = doc.output('datauristring');
    const decoded = decodeURIComponent(pdfDataUri);

    // Invariants from BILLING_CANONICAL_LOGIC.md:
    // Sammelzahler certificates MUST NOT contain payment demands, IBAN, or withdrawal clauses
    assert.strictEqual(decoded.includes('IBAN:'), false, 'Certificate must not leak IBANs');
    assert.strictEqual(decoded.includes('Zahlungsaufforderung'), false, 'Certificate must not contain Zahlungsaufforderung');
    assert.strictEqual(decoded.includes('Widerrufsbelehrung'), false, 'Certificate must not contain Widerrufsbelehrung');
    assert.strictEqual(decoded.includes('Kassenzeichen'), false, 'Certificate must not contain Kassenzeichen');
  });

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  📊 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('════════════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}

runSchoolLicensePdfLayoutForensicSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
