# Dual-Token Onboarding & Identity Carrier Governance
**Campus-Groovelab Enterprise+ Security & Legal Compliance Whitepaper**  
**Normativer Standard: OWASP ASVS Level 3 | DSGVO Art. 5, 8, 25, 32 | BSI TR-03107 | § 8a SGB VIII**

---

## 1. Executive Summary & Rechtsnatur des Schülerausweises

Im Bildungswesen (Musikschulen, Akademien, allgemeinbildende Schulen) existieren zwei komplementäre Kanäle zur Schüleridentifikation:
1. **Physischer Schülerausweis / QR-Code (Identity Carrier)**: Gedruckte Schülerausweiskarten, Schlüsselanhänger oder Hausaufgabenheft-Sticker für das tägliche Einchecken im Unterricht und an Schüler-Terminals.
2. **Digitaler Einladungslink (PWA Onboarding Link)**: Elektronischer Einladungslink zur Übermittlung per E-Mail oder Messenger an Eltern zur erstmaligen Ersteinrichtung.

**Volljuristische Feststellung (Art. 4 Nr. 5 DSGVO)**:
Ein auf einem Schülerausweis abgedruckter QR-Code ist ein **pseudonymes Authentifizierungsmerkmal**. Er enthält keine personenbezogenen Klardaten (kein Nachname, kein Geburtsdatum, keine Kontaktdaten). Beim Aufruf der Web-Applikation über den Ausweis-QR-Code wird im nicht-aktivierten Zustand ausschließlich eine datensparsame Bestätigungsvorschau (Vorname, 1. Buchstabe des Nachnamens, Instrument und Schullogo) dargestellt. Erst durch das Vergeben einer 6-stelligen Eltern-PIN durch die Erziehungsberechtigten (Art. 8 DSGVO / elterliche Sorge gem. § 1626 BGB) wird der Account freigeschaltet.

Ist das Profil bereits freigeschaltet (`is_pin_activated = true`), sperrt das System jede erneute PIN-Vergabe über den Ausweis und leitet den Nutzer transparent zum Login-Bildschirm weiter.

---

## 2. Die Dual-Token-Architektur

```
                               ┌────────────────────────────────────────────────────────┐
                               │             Schüler-Onboarding-Initiierung             │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                             ┌────────────────────────────┴────────────────────────────┐
                             ▼                                                         ▼
                  [Weg A: Physischer Ausweis]                             [Weg B: Digitaler PWA-Link]
                  (Gedruckter QR-Code auf Karte)                          (Generiert durch Lehrkraft)
                             │                                                         │
                             ▼                                                         ▼
                 Ausweis-Token (Statisch)                                   Einmal-Token (Dynamisch)
                             │                                              • TTL: 30 Tage
                             │                                              • Single-Use (used_at)
                             │                                              • Entwertet Vor-Tokens
                             └────────────────────────────┬────────────────────────────┘
                                                          │
                                                          ▼
                                      autoritative RPC: get_student_onboarding_preview()
                                      • Entschlüsselung des Vornamens (pgp_sym_decrypt)
                                      • Maskierung des Nachnamens ("Amelia H.")
                                      • Zero-PII-Leakage (Keine Adressen, PINs, Passwörter)
                                                          │
                                   ┌──────────────────────┴──────────────────────┐
                                   ▼                                             ▼
                        Profil noch NICHT aktiv                       Profil BEREITS aktiv
                                   │                                             │
                                   ▼                                             ▼
                     3-Schritt Eltern-Wizard                       Freundlicher Status-Screen
                     • Nutzungsmodus (Kind/Eltern)                 • Schullogo & Schülerbegrüßung
                     • 6-stellige Eltern-PIN                       • Direkte Login-Weiterleitung
                     • Kinderschutz (§ 8a SGB VIII)                • Keine PIN-Manipulation möglich
```

---

## 3. Technische & Kryptographische Sicherheitsmaßnahmen (Art. 32 DSGVO)

| Sicherheitsaxiom | Implementierung | Normativer Standard |
|---|---|---|
| **Zero-Trust RPCs** | Keine direkten SELECT/UPDATE Abfragen auf `users_raw`, `student_first_names` | OWASP ASVS V5 |
| **Server-Side PIN Hashing** | Eltern-PIN wird mit bcrypt (`gen_salt('bf', 10)`) serverseitig gehasht | BSI TR-02102-1 |
| **Mandantentrennung** | Link-Generierung strikt auf `v_student_school = v_caller_school` begrenzt | ISO/IEC 27001 Multi-Tenancy |
| **Revisionssicheres Audit** | Unveränderbare Protokollierung in `public.audit_logs` | GoBD / DSGVO Art. 30 |
| **Zero-Secret-Leakage** | Spalten wie `parent_pin`, `personal_pin`, `password_hash` verlassen niemals die DB | OWASP Top 10 A02:2021 |

---

## 4. Konformitätserklärung

Die Architektur entspricht in vollem Umfang den Bestimmungen der **Datenschutz-Grundverordnung (DSGVO)**, des **Bundesdatenschutzgesetzes (BDSG)**, des **Landesdatenschutzgesetzes Baden-Württemberg (LDSG BW)** sowie den Richtlinien des **BSI TR-03107**.
