// ==============================================================================
// Campus-Groovelab Enterprise+ Security Suite
// Datei: tests/security/chat-governance-child-protection.test.ts
// Standards: OWASP ASVS Level 3, BGB § 104, DSGVO Art. 8 & 25, JuSchG / § 8a SGB VIII
// Prüft:
// 1. Zod Ingress Validation: directMessageIngressSchema (Anti-DoS, Null-Byte, Strict Schema)
// 2. PostgreSQL Trigger & Governance Invariants in Migration 551
// 3. Sender & Recipient Parental Lockout (Fail-Closed Exceptions)
// 4. Junior Privacy-by-Default Protection & System Message Bypass
// 5. Client Integration & Legal-Guard Parität (LEG-17 Parität in CampusDirectMessages.tsx)
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { directMessageIngressSchema } from '../../packages/bff-server/src/schemas/ingressSchemas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

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

async function runChatGovernanceChildProtectionSuite() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🛡️  CAMPUS-GROOVELAB: CHAT GOVERNANCE & CHILD PROTECTION GATEKEEPER');
  console.log('    Standards: OWASP ASVS Level 3, BGB § 104, DSGVO Art. 8 & 25, SGB VIII');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // ----------------------------------------------------------------------------
  // 1. ZOD INGRESS VALIDATION (directMessageIngressSchema)
  // ----------------------------------------------------------------------------
  console.log('▶ 1. Prüfe Zod Ingress Schema (directMessageIngressSchema)...');

  const validPayload = {
    senderId: '11111111-1111-4111-8111-111111111111',
    recipientId: '22222222-2222-4222-8222-222222222222',
    content: 'Hallo, hast du die Noten für das Stück?',
    schoolId: '33333333-3333-4333-8333-333333333333'
  };

  const parsedValid = directMessageIngressSchema.safeParse(validPayload);
  assert('Gültige Direktnachricht wird akzeptiert', parsedValid.success, parsedValid.error?.message);

  // Leerer Text
  const parsedEmpty = directMessageIngressSchema.safeParse({ ...validPayload, content: '' });
  assert('Leerer Nachrichtentext wird abgewiesen', !parsedEmpty.success);

  // Whitespace-only Text
  const parsedWhitespace = directMessageIngressSchema.safeParse({ ...validPayload, content: '   \n  \t  ' });
  assert('Reiner Whitespace-Text wird abgewiesen', !parsedWhitespace.success);

  // Null-Byte Injection
  const parsedNullByte = directMessageIngressSchema.safeParse({ ...validPayload, content: 'Hallo\0Welt' });
  assert('Null-Byte Injection wird abgewiesen', !parsedNullByte.success);

  // Anti-DoS Längenbegrenzung (> 4.000 Zeichen)
  const hugeText = 'A'.repeat(4001);
  const parsedHuge = directMessageIngressSchema.safeParse({ ...validPayload, content: hugeText });
  assert('Nachrichten über 4.000 Zeichen werden abgewiesen (Anti-DoS)', !parsedHuge.success);

  // 4.000 Zeichen exakt zulässig
  const maxText = 'A'.repeat(4000);
  const parsedMax = directMessageIngressSchema.safeParse({ ...validPayload, content: maxText });
  assert('Nachrichten mit exakt 4.000 Zeichen sind zulässig', parsedMax.success);

  // Ungültige UUIDs
  const parsedInvalidUuid = directMessageIngressSchema.safeParse({ ...validPayload, senderId: 'not-a-uuid' });
  assert('Ungültige UUID wird abgewiesen', !parsedInvalidUuid.success);

  // Prototype Pollution / Strict Schema Protection
  const parsedPollution = directMessageIngressSchema.safeParse({
    ...validPayload,
    __proto__: { isAdmin: true },
    extraField: 'exploit'
  });
  assert('Unerwartete Parameter werden via .strict() abgewiesen', !parsedPollution.success);

  // ----------------------------------------------------------------------------
  // 2. MIGRATION 551 POSTGRESQL GOVERNANCE TRIGGER
  // ----------------------------------------------------------------------------
  console.log('\n▶ 2. Prüfe PostgreSQL Migration 551 (enforce_campus_chat_governance)...');
  const mig551Path = path.join(ROOT_DIR, 'supabase', 'migrations', '551_enterprise_chat_governance_and_parental_lock.sql');
  assert('Migration 551 existiert auf Disk', fs.existsSync(mig551Path));

  const mig551Code = fs.readFileSync(mig551Path, 'utf8');

  assert(
    'Migration 551 definiert Trigger-Funktion enforce_campus_chat_governance',
    mig551Code.includes('CREATE OR REPLACE FUNCTION public.enforce_campus_chat_governance()')
  );

  assert(
    'Trigger-Funktion ist SECURITY DEFINER mit explizitem search_path',
    mig551Code.includes('SECURITY DEFINER') && mig551Code.includes('SET search_path = public, pg_temp, extensions')
  );

  assert(
    'Trigger ist an public.campus_direct_messages gebunden',
    mig551Code.includes('CREATE TRIGGER trg_enforce_campus_chat_governance') &&
    mig551Code.includes('BEFORE INSERT OR UPDATE ON public.campus_direct_messages')
  );

  assert(
    'Tabelle erzwingt FORCE ROW LEVEL SECURITY',
    mig551Code.includes('ALTER TABLE IF EXISTS public.campus_direct_messages FORCE ROW LEVEL SECURITY')
  );

  // ----------------------------------------------------------------------------
  // 3. SENDER & RECIPIENT PARENTAL CHAT LOCK INVARIANTS
  // ----------------------------------------------------------------------------
  console.log('\n▶ 3. Prüfe elterliche Sperrschranken in Trigger-Logik...');

  assert(
    'Sender-Sperre: PARENTAL_CHAT_LOCK_ACTIVE wird geworfen',
    mig551Code.includes('PARENTAL_CHAT_LOCK_ACTIVE') &&
    mig551Code.includes('v_sender.parent_allow_chat IS FALSE')
  );

  assert(
    'Empfänger-Sperre: RECIPIENT_PARENTAL_CHAT_LOCK wird geworfen',
    mig551Code.includes('RECIPIENT_PARENTAL_CHAT_LOCK') &&
    mig551Code.includes('v_recipient.parent_allow_chat IS FALSE')
  );

  assert(
    'Junior-Schutz für Sender: JUNIOR_DEFAULT_CHAT_DISABLED wird geworfen',
    mig551Code.includes('JUNIOR_DEFAULT_CHAT_DISABLED') &&
    mig551Code.includes("v_sender.campus_ui_level = 'junior'")
  );

  assert(
    'Junior-Schutz für Empfänger: RECIPIENT_JUNIOR_CHAT_DISABLED wird geworfen',
    mig551Code.includes('RECIPIENT_JUNIOR_CHAT_DISABLED') &&
    mig551Code.includes("v_recipient.campus_ui_level = 'junior'")
  );

  assert(
    'Mandanten-Trennung: CROSS_TENANT_CHAT_DENIED wird geworfen',
    mig551Code.includes('CROSS_TENANT_CHAT_DENIED') &&
    mig551Code.includes('v_sender.school_id <> v_recipient.school_id')
  );

  assert(
    'System-Bypass: cancellation_reset, absence_notice und system sind ausgenommen',
    mig551Code.includes("'cancellation_reset'") &&
    mig551Code.includes("'absence_notice'") &&
    mig551Code.includes("'system'")
  );

  // ----------------------------------------------------------------------------
  // 4. CLIENT INTEGRATION & LEG-17 PARITÄT
  // ----------------------------------------------------------------------------
  console.log('\n▶ 4. Prüfe Client-Integration & LEG-17 Parität in CampusDirectMessages.tsx...');
  const dmsPath = path.join(ROOT_DIR, 'apps', 'groovelab', 'src', 'components', 'CampusDirectMessages.tsx');
  const dmsCode = fs.readFileSync(dmsPath, 'utf8');

  assert(
    'CampusDirectMessages fängt PARENTAL_CHAT_LOCK Fehler ab',
    dmsCode.includes('PARENTAL_CHAT_LOCK')
  );

  assert(
    'CampusDirectMessages fängt RECIPIENT_PARENTAL_CHAT Fehler ab',
    dmsCode.includes('RECIPIENT_PARENTAL_CHAT')
  );

  assert(
    'CampusDirectMessages setzt didaktische respectWarning bei elterlicher Sperre',
    dmsCode.includes('setRespectWarning') &&
    dmsCode.includes('durch die elterlichen Einstellungen pausiert')
  );

  assert(
    'LEG-17 Wächter-Parität: validateChatMessageContent bleibt integriert',
    dmsCode.includes('validateChatMessageContent') &&
    dmsCode.includes('cleanChatMessageContent')
  );

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`Ergebnis: ${passedTests} / ${totalTests} Prüfungen erfolgreich`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runChatGovernanceChildProtectionSuite().catch((err) => {
  console.error('Fatal error in Chat Governance Child Protection suite:', err);
  process.exit(1);
});
