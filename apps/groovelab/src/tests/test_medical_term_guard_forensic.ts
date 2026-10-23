/**
 * 🛡️ Campus-Groovelab Forensic Test: Medical Term & Art. 9 DSGVO Guard
 * Standards: DSGVO Art. 9 / BDSG § 26 / OWASP ASVS Level 3
 * 
 * Verifiziert das Verhalten des 0,1% Health-Data Schutzschilds:
 * 1. Sperrung von onkologischen Diagnosen & Komposita ("Krebserkrankung")
 * 2. Zulassung des alltäglichen Status "krank" / "krankheitsbedingt" (Shadow-IT-Schutz)
 * 3. Sperrung akuter Symptome ("hohes Fieber und Scharlach")
 * 4. Immunität der Musikpädagogik-Whitelist ("Lampenfieber vor dem Auftritt")
 * 5. Immunität anerkennenden Jugendslangs ("völlig krankes Gitarrensolo")
 * 6. Sperrung von ICD-10 Diagnoseschlüsseln ("ICD-10 F32.1")
 * 7. Rückgabe eines rollengerechten Neutralisierungsvorschlags
 */

import { detectHealthDataTerms, sanitizeHealthDataTerms } from '../utils/medicalTermGuard';
import { validateChatMessageContent } from '../utils/chatRespectGuard';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Test Failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

export function runMedicalTermGuardForensicTests() {
  console.log('\n--- 🛡️ SUITE: MEDICAL TERM & HEALTH-DATA GUARD (ART. 9 DSGVO) ---');

  // Test 1: Onkologische Komposita ("Krebserkrankung") muss zuverlässig blockiert werden
  const test1 = validateChatMessageContent(
    'ich habe eine Krebserkrankung und kann nicht unterrichten',
    { senderRole: 'teacher' }
  );
  assert(!test1.isValid, '1. "Krebserkrankung" wird als unzulässige Gesundheitsangabe erkannt');
  assert(test1.category === 'health_data', '1.1 Kategorie ist "health_data"');
  assert(
    test1.suggestedNeutralText === 'Ich bin heute verhindert und kann leider nicht unterrichten.',
    '1.2 Rollengerechter Lehrkraft-Vorschlag wird generiert'
  );

  // Test 2: Reiner Alltagsstatus "ich bin krank" bleibt zulässig (Shadow-IT-Schutz)
  const test2 = validateChatMessageContent('ich bin krank', { senderRole: 'teacher' });
  assert(test2.isValid, '2. Alltägliche Statusmeldung "ich bin krank" bleibt zulässig');

  const test2b = validateChatMessageContent('Mein Kind ist krankheitsbedingt heute abgemeldet', { senderRole: 'parent' });
  assert(test2b.isValid, '2.1 "krankheitsbedingt" bleibt für Eltern zulässig');

  // Test 3: Akute Symptome & Infektionskrankheiten werden abgefangen
  const test3 = validateChatMessageContent(
    'Mein Kind hat Scharlach und hohes Fieber',
    { senderRole: 'parent' }
  );
  assert(!test3.isValid, '3. "Scharlach" und "Fieber" werden abgefangen');
  assert(
    test3.suggestedNeutralText === 'Ich bin heute leider krank und kann nicht zum Unterricht kommen.',
    '3.1 Eltern-Vorschlag wird generiert'
  );

  // Test 4: Musikfachliche Begriffe ("Lampenfieber") werden NICHT blockiert
  const test4 = validateChatMessageContent(
    'Ich habe großes Lampenfieber vor dem Auftritt am Samstag',
    { senderRole: 'student' }
  );
  assert(test4.isValid, '4. "Lampenfieber" wird von der Whitelist geschützt (kein Fieber-Fehlalarm)');

  // Test 5: Jugendsprachliche Bewunderung ("krankes Solo") bleibt zulässig
  const test5 = validateChatMessageContent(
    'Das war ein völlig krankes Solo gestern bei der Bandprobe!',
    { senderRole: 'student' }
  );
  assert(test5.isValid, '5. Anerkennender Jugendslang ("krankes Solo") bleibt zulässig');

  // Test 6: ICD-10 Diagnoseschlüssel werden abgefangen
  const test6 = validateChatMessageContent(
    'Laut Arztbrief Diagnose ICD-10 F32.1',
    { senderRole: 'teacher' }
  );
  assert(!test6.isValid, '6. ICD-10 Diagnoseschlüssel wird abgefangen');

  // Test 7: Deterministische Maskierung (Sanitization)
  const sanitized = sanitizeHealthDataTerms('Ich leide an einer Krebserkrankung und muss ins Krankenhaus.');
  assert(
    sanitized.includes('[gesundheitliche Angabe neutralisiert]'),
    '7. Sanitization ersetzt Diagnosestämme deterministisch'
  );

  console.log('--- ✅ ALL MEDICAL TERM GUARD FORENSIC TESTS PASSED ---\n');
}

// Direkte Ausführung wenn standalone aufgerufen
if (process.argv[1]?.endsWith('test_medical_term_guard_forensic.ts')) {
  runMedicalTermGuardForensicTests();
}
