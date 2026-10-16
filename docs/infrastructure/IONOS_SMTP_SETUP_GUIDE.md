# ✉️ IONOS SMTP Relay & DNS E-Mail-Setup Guide
> **System:** Campus-Groovelab Sovereign EdTech Infrastructure  
> **Server:** IONOS Basic Cube M (Frankfurt/Karlsruhe) / Hetzner Sovereign Backup  
> **Gültigkeit:** Autoritativer Leitfaden für B2B-Rechnungszustellung & System-Benachrichtigungen  
> **Stand:** Oktober 2026

---

## 1. Übersicht & Zielsetzung

Campus-Groovelab versendet Rechnungen und Quittungen ausschließlich an offizielle, behördliche E-Mail-Adressen der Musikschulen (`public.schools.billing_email`). Um eine **100 % Zustellrate** bei kommunalen Kämmereien und Schulsekretariaten ohne Einstufung als Spam zu garantieren, wird der Mailversand über das gesicherte IONOS SMTP-Relay mit vollständiger kryptografischer E-Mail-Authentifizierung (SPF, DKIM, DMARC) betrieben.

---

## 2. IONOS SMTP Verbindungsdaten

Für die Umgebungskonfiguration des BFF-Servers (`packages/bff-server`) und der Supabase Edge Functions:

| Konfigurations-Schlüssel | Wert | Beschreibung |
|---|---|---|
| `SMTP_HOST` | `smtp.ionos.de` | Offizieller Postausgangsserver von IONOS |
| `SMTP_PORT` | `587` (empfohlen) oder `465` | Port 587 für STARTTLS / Port 465 für SSL/TLS |
| `SMTP_SECURE` | `false` (bei Port 587) / `true` (bei 465) | TLS-Verschlüsselung erzwingen |
| `SMTP_USER` | `rechnung@campus-groovelab.de` | Vollständige IONOS-Postfach-E-Mail |
| `SMTP_PASS` | `[IONOS_MAILBOX_PASSWORD]` | Starkes generiertes Postfach-Passwort |
| `SMTP_FROM` | `"Campus-Groovelab" <rechnung@campus-groovelab.de>` | Offizieller Absendername und E-Mail |

---

## 3. Zwingend erforderliche DNS-Records (Spam-Schutz & Reputation)

Im DNS-Management der Domain (IONOS Domain Center) müssen folgende 3 Einträge gesetzt sein:

### A. SPF-Record (Sender Policy Framework)
Autorisiert die IONOS Mailserver, E-Mails im Namen der Domain zu versenden.
* **Typ:** `TXT`
* **Host / Name:** `@` (bzw. leer)
* **Wert:**
  ```text
  v=spf1 include:_spf-eu.ionos.com ~all
  ```

### B. DKIM (DomainKeys Identified Mail)
Signiert ausgehende Rechnungs-Mails kryptografisch.
* **Aktivierung:** Im IONOS Control Panel unter **E-Mail & Office -> E-Mail-Adressen -> Einstellungen -> DKIM** für die Domain aktivieren.
* IONOS generiert die notwendigen CNAME- oder TXT-Records automatisch und bindet den kryptografischen Schlüssel im Mailtransfer ein.

### C. DMARC-Record (Domain-based Message Authentication)
Weist empfangende Server (z. B. Kommunen, Städte) an, unauthentifizierte Spoofing-Mails abzuweisen oder in Quarantäne zu verschieben.
* **Typ:** `TXT`
* **Host / Name:** `_dmarc`
* **Wert:**
  ```text
  v=DMARC1; p=quarantine; pct=100; rua=mailto:postmaster@campus-groovelab.de
  ```

---

## 4. Lokale & Staging-Simulation (Zero-Leakage)

Im Entwicklungsbetrieb (`NODE_ENV !== 'production'`) oder bei nicht gesetztem `SMTP_PASS`:
* Der Dispatcher schaltet automatisch in den Modus `status: 'simulated'`.
* Es werden keine realen E-Mails versendet; der Rechnungs-Hash (SHA-256) und die Belegmetadaten werden trotzdem revisionssicher in `public.school_invoice_dispatches` protokolliert.
* Der manuelle PDF-Download sowie der Notfall-`mailto:`-Workflow im Schulsekretariat bleiben zu 100 % erhalten.

---

## 5. Live-Preflight-Test

Um die Verbindung auf dem IONOS Server direkt im Terminal zu testen:

```bash
# Test des SMTP-Ports und des STARTTLS-Handshakes
openssl s_client -starttls smtp -crlf -connect smtp.ionos.de:587
```

Sobald die Verbindung steht und `250 HELP` meldet, ist der Mailtransfer schlüsselfertig einsatzbereit.
