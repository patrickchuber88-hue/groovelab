# 🏛️ 0,1% Enterprise Goldstandard Remediation: Zero-Trust Chat Governance (OWASP ASVS L3)

## 📋 1. Befund- & Ursachen-Analyse

Die aktuelle Architektur von Campus-Groovelab für Nachrichten-Boards ist UX-seitig hervorragend (Goldstandard), verletzt jedoch auf Systemebene das **Zero-Trust Frontend Axiom**. 

1. **PostgREST Bypass (Sicherheitsillusion):** 
   Die juristischen Wächter `chatRespectGuard.ts` (Schutz vor Hassrede/Gewalt nach SGB VIII / StGB) und `medicalTermGuard.ts` (Schutz vor Gesundheitsdaten nach Art. 9 DSGVO) laufen ausschließlich im React-Frontend. Über direkte API-Calls (Postman/Curl) können diese Wächter verlustfrei umgangen werden.
2. **Filter-Evasion (Zalgo/Homoglyphen):** 
   Unsichtbare Unicode-Zeichen (`\u200B`) und Homoglyphen (kyrillisches `а`) hebeln den aktuellen Leetspeak-Regex im Client aus.
3. **Fehlendes Crisis-Logging (§ 8a SGB VIII):** 
   Suizidandrohungen (`isCrisis: true`) blockieren zwar die UI (Nummer gegen Kummer), erzeugen aber serverseitig keinen revisionssicheren Audit-Trail zur physischen Alarmierung der Krisenbeauftragten.
4. **Fehlendes Rate-Limiting (Anti-Spam):** 
   Der aktuelle DB-Trigger `trg_enforce_campus_chat_governance` prüft nur die Länge, nicht die Frequenz. Ein DoS/Spam-Angriff ist per API möglich.

---

## 🛠️ 2. Geplante Änderungen (Hermetisches Backend-Enforcement)

### Phase 1: Neue PostgreSQL Migration `557_enterprise_zero_trust_chat_governance.sql`
Wir überführen die Core-Logik von TypeScript in hochperformantes PL/pgSQL:
- **Unicode-Sanitization:** Stripping von Zero-Width-Spaces (`\u200B-\u200F`) direkt in der DB (`regexp_replace(NEW.content, '[\u200B-\u200F]', '', 'g')`).
- **Art. 9 DSGVO Guard in PL/pgSQL:** Serverseitige Erkennung der `MEDICAL_HEALTH_KEYWORDS` und automatische Ersetzung durch `[gesundheitliche Angabe neutralisiert]`.
- **SGB VIII Hate-Speech Guard in PL/pgSQL:** Portierung des 4-Vektoren-Checks (Extremismus, Ehrverletzung, Belästigung, Gewalt) inkl. der `MUSIC_PEDAGOGY_WHITELIST`.
- **Crisis Audit Trail:** Wenn `isCrisis` (z.B. "ich bring mich um") zutrifft, wirft der Trigger einen `RAISE EXCEPTION` (Fail-Closed) **und** loggt einen asynchronen Warn-Eintrag in eine neue Audit-Funktion, um Schulleiter zu benachrichtigen.
- **Anti-Spam Token-Bucket:** Prüfung, ob der Sender in der letzten Minute mehr als 10 Nachrichten gesendet hat -> `HTTP 429`.

### Phase 2: Anpassung Edge Function (Optional / Späterer Scope)
- Die ArbZG (Quiet Hours) Queue in `send-push` würde konzeptionell hier folgen, aber für diesen Plan konzentrieren wir uns auf die kritischste Flanke: die Datenbank-Schicht.

### Phase 3: Frontend-Alignment
- Die TypeScript-Wächter bleiben als UX-Layer (für sofortiges Feedback ohne Network-Latency) bestehen.
- Wir stellen sicher, dass bei einem `RAISE EXCEPTION` der Datenbank ein sauberer Error im Frontend gefangen wird, falls der TS-Wächter doch umgangen wurde.

---

## 🔒 3. Invarianten- & Monolith-Ceiling-Prüfung
- 100% Fail-Closed Doktrin wird durchgesetzt.
- Keine US-Cloud Einbindung, 100% lokales PostgREST / PostgreSQL In-Memory.
- "Zero-Trust Frontend" Regel ist mit dieser Architektur formal erfüllt.
