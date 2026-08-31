# 🛡️ Tier-1 Backend & Edge Function Security Standards
**Projekt:** Campus-Groovelab App
**Klassifizierung:** STRENG VERTRAULICH / ENTERPRISE STANDARD

Dieses Dokument definiert die unumstößlichen Sicherheitsarchitektur-Regeln für alle serverseitigen Operationen, Microservices, Node.js-Backends und Supabase Edge Functions innerhalb des Campus-Groovelab Ökosystems.

---

## 1. Das "Service-Role" RLS-Dilemma
Der `SUPABASE_SERVICE_ROLE_KEY` (Master-Key) **umgeht die PostgreSQL Row-Level-Security (RLS) vollständig**. 
Wird dieser Key in Edge Functions oder Custom Backends verwendet, um im Auftrag eines Users zu handeln, besteht höchste Gefahr für "Cross-Tenant Data Leaks" (Mandanten-Datenleck), falls der Kontext nicht korrekt gesetzt wird.

## 2. Der Goldstandard: Transaktions-Lokaler Kontext
Damit RLS auch in Custom-Backends (Prisma, Kysely, Node.js) manipulationssicher greift und keine Daten im Connection-Pool (PgBouncer) hängen bleiben ("Connection-Pool-Leak"), **MUSS** jeder Request innerhalb einer Transaktion gekapselt werden.

### Die goldene Regel (Blueprint):
1. **Transaktion öffnen** (`db.transaction()`).
2. **Kontext setzen** (mit `is_local = true` tief in PostgreSQL).
3. **Abfragen ausführen** (RLS filtert nun nativ).
4. **Transaktion schließen** (Kontext wird automatisch vom RAM gelöscht).

### TypeScript Implementierungs-Blueprint (Prisma/Kysely/PgPool)
Wenn wir in Zukunft ein Custom Node.js Backend anbinden, ist dieser Code **zwingend**:

```typescript
// Beispiel mit Kysely / PgPool / Prisma Raw Transaction:
await db.transaction().execute(async (trx) => {
  // 1. Kontext für die aktuelle Verbindung setzen (is_local = true / transaktionslokal)
  await sql`
    SELECT set_app_context(
      ${session.tenantId}::uuid, 
      ${session.userId}::uuid, 
      ${session.role}
    );
  `.execute(trx);

  // 2. Abfragen ausführen - RLS filtert automatisch und manipulationssicher!
  // Selbst bei einem Fehler in der Anwendungslogik blockiert der Kernel unberechtigten Zugriff.
  const docs = await trx.selectFrom('documents').selectAll().execute();
  return docs;
});
```

## 3. Supabase Edge Functions (Deno) Richtlinie
Wenn Edge Functions geschrieben werden, ist die Nutzung des Service Keys für User-Aktionen **verboten**, es sei denn, obiges Pattern wird angewendet.

**Bevorzugter Standard in Edge Functions:**
Anstatt den Service Key zu nutzen, **muss** der Supabase Client mit dem Authentication-Header des ausführenden Nutzers initialisiert werden. So übernimmt PostgREST automatisch die sichere, transaktionslokale Kapselung:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // 🟢 KORREKT: Auth-Header des Users weiterleiten!
  // PostgREST setzt den RLS-Kontext automatisch sicher und transaktionslokal.
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  // RLS ist nativ geschützt
  const { data } = await supabase.from('users_raw').select('*')
  // ...
})
```

## 4. Audit & Compliance
Jeder Pull-Request, der Edge Functions oder Node.js-Backend-Code enthält, MUSS im Code-Review auf diese "Transaction Wrapper"-Regel geprüft werden. Ein Verstoß führt zur sofortigen Ablehnung (Fail-Closed).
