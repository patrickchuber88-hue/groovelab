# 🚨 SaaS-Incident- & Haftungs-Runbook: Notfallprozedur & Versicherungs-Governance
**Plattform:** Campus-Groovelab (https://campus-groovelab.de)  
**Verantwortlich:** Patrick Huber (Betreiber / Einzelunternehmer)  
**Zweck:** Verbindlicher Leitfaden zur Schadenminderung, Beweissicherung und Fristenwahrung bei Sicherheitsvorfällen, Datenpannen (Art. 33 DSGVO) und Inanspruchnahme durch Dritte.  
**Revisionsstand:** September 2026  

---

## ⚠️ Die 3 Goldenen Kardinalregeln im Schadenfall

> ### 🛑 Regel 1: KEIN Schuldanerkenntnis abgeben!
> **Niemals** gegenüber Schulen, Eltern, Anwälten oder Geschädigten eine Schuld, Pflichtverletzung oder Zahlungsbereitschaft schriftlich oder mündlich anerkennen (§ 105 VVG / Versicherungsvertragsgesetz).  
> *Rechtsfolge:* Ein eigenmächtiges Schuldanerkenntnis führt zum **sofortigen Verlust des Versicherungsschutzes**!  
> *Korrekte Reaktion:* *„Wir haben Ihre Meldung erhalten, prüfen den technischen Sachverhalt mit höchster Priorität und leiten den Vorgang an unsere Rechts- und Fachabteilung weiter.“*

> ### ⏱️ Regel 2: Die 72-Stunden-DSGVO-Uhr tickt sofort!
> Eine Verletzung des Schutzes personenbezogener Daten (Art. 33 DSGVO) muss **binnen 72 Stunden** nach Bekanntwerden der zuständigen Aufsichtsbehörde (LfDI Baden-Württemberg) gemeldet werden.

> ### 📞 Regel 3: Unverzügliche Schadenmeldung an den Versicherer!
> Jeder Vorfall, jede Abmahnung und jede Schadensersatzforderung muss unverzüglich (spätestens innerhalb von 48 bis 72 Stunden) dem Versicherer gemeldet werden, damit der **passive Rechtsschutz** greift.

---

## 1. Notfall-Kontakte & Meldewege

| Stelle | Ansprechpartner / Kanal | Meldefrist |
| :--- | :--- | :--- |
| **Zuständige Datenschutzaufsichtsbehörde** | **Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg (LfDI BW)**<br>Lautenschlagerstraße 20, 70173 Stuttgart<br>Online-Meldeportal: [https://www.baden-wuerttemberg.datenschutz.de/online-meldung-einer-datenpanne/](https://www.baden-wuerttemberg.datenschutz.de/online-meldung-einer-datenpanne/)<br>Telefon: +49 (0)711 / 61 55 41-0 | **Max. 72 Stunden** ab Kenntnis (Art. 33 DSGVO) |
| **Versicherer: exali.de Schadenabteilung** | exali GmbH, Eberlestr. 28, 86157 Augsburg<br>E-Mail: `schaden@exali.de`<br>Telefon Schaden-Hotline: +49 (0)821 / 80 99 46-0 | **Unverzüglich** (binnen 48h) |
| **Versicherer: Hiscox Crisis Response (24/7)** | Hiscox SA, Niederlassung für Deutschland<br>24/7 Cyber-Notfall-Hotline (bei CyberClear-Baustein): Siehe Versicherungsschein<br>E-Mail: `schaden@hiscox.de` | **Sofort** (bei aktivem Cyber-Angriff / Ransomware) |
| **Rechenzentrum: Hetzner Online GmbH** | Notfall-Support & Abuse-Management<br>Support-Ticket via Hetzner Konsole / Robot<br>Notfall-Hotline: +49 (0)9831 / 505-0 | Bei Hardware-Ausfall oder DDoS-Perimeter-Blockade |

---

## 2. Chronologischer Incident-Ablaufplan (Phasen 1 bis 5)

```
┌────────────────────────────────────────────────────────────────────────┐
│ STUFE 1: ALARMIERUNG & ERSTEINDÄMMUNG (Stunde 0 bis 2)                │
│ • Betroffenen Server / Container isolieren (keine Daten löschen!)      │
│ • API-Keys und Sessions sofort invalidieren                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STUFE 2: FORENSISCHE BEWEISSICHERUNG (Stunde 2 bis 6)                 │
│ • Snapshot des Zustands (RAM/Disk) vor Reboot anfertigen              │
│ • PostgreSQL Audit-Logs sichern: audit_logs und Nginx-Access-Logs     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STUFE 3: VERSICHERUNGS- & KRISENMELDUNG (Stunde 6 bis 24)             │
│ • Schadenmeldung an Versicherer (exali / Hiscox) absenden              │
│ • Freigabe für externe IT-Forensiker & DSGVO-Anwalt einholen           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STUFE 4: BEHÖRDENMELDUNG GEM. ART. 33 DSGVO (Bis Stunde 72)           │
│ • Vorab-Meldung an LfDI Baden-Württemberg über Online-Portal          │
│ • Klassifizierung des Risikos für Betroffene (Minderjährige)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STUFE 5: KUNDENKOMMUNIKATION & POST-MORTEM (Tag 3 bis 14)             │
│ • Transparente Information an Schulleitungen & Datenschutzbeauftragte  │
│ • Vollständige Ursachenanalyse & Schließen von Sicherheitslücken       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Forensisches Beweissicherungs-Protokoll (Befehlsreferenz)

Beim Verdacht auf ein Datenleck oder unbefugten Zugriff **niemals voreilig den Server neu aufsetzen oder Container löschen**, da sonst gerichtsfeste Beweise und Log-Einträge für den Versicherer vernichtet werden!

### Schritt 1: Snapshot & Logs des Nginx / WAF einfrieren
```bash
# Auf dem Produktions-Server:
mkdir -p /root/forensics_$(date +%Y%m%d_%H%M%S)
cd /root/forensics_*

# Nginx Zugriffs- und Fehlerprotokolle kopieren
cp -a /var/log/nginx/access.log ./nginx_access_incident.log
cp -a /var/log/nginx/error.log ./nginx_error_incident.log

# Aktive Netzwerkverbindungen sichern
ss -tunap > active_network_sockets.txt
```

### Schritt 2: PostgreSQL Audit-Trail & Session Leases exportieren
```bash
# Unveränderbare Audit-Logs aus PostgreSQL sichern
docker exec -t supabase-db pg_dump -U postgres \
  --table=public.audit_logs \
  --table=public.session_leases \
  --table=private_auth.user_secrets \
  postgres | gzip -9 > ./audit_logs_snapshot.sql.gz
```

### Schritt 3: Docker Containerzustand einfrieren
```bash
# Erstelle ein Image des aktuellen, potenziell kompromittierten Containers
docker commit supabase-db forensic_supabase_snapshot:latest
docker commit groovelab-app forensic_app_snapshot:latest
```

---

## 4. Kommunikations-Leitfaden bei Anfragen von Schulleitungen / Anwälten

Sollte eine Musikschule, ein Schulträger oder ein gegnerischer Anwalt Schadensersatzansprüche geltend machen:

1. **Ruhig und sachlich bleiben.** Keine Ad-hoc-Rechtfertigung am Telefon.
2. **Schriftformerfordernis:** Bitten Sie stets um schriftliche Übermittlung des Sachverhalts per E-Mail an `kontakt@campus-groovelab.de`.
3. **Muster-Antwort (neutral & rechtswahrend):**

```text
Sehr geehrte Damen und Herren,

wir haben Ihre Mitteilung vom [DATUM] bezüglich [SACHVERHALT] erhalten.

Wir nehmen die Zuverlässigkeit und Sicherheit unserer Cloud-Infrastruktur 
außerordentlich ernst. Unser technisches Team hat eine umfassende 
Integritäts- und Ursachenanalyse eingeleitet.

Gleichzeitig haben wir den Vorgang vorschriftsmäßig an unsere juristische 
Abteilung sowie unseren Haftpflichtversicherer zur formalen Prüfung 
weitergeleitet. 

Sobald die technischen Untersuchungsergebnisse und die versicherungsrechtliche 
Stellungnahme vorliegen, werden wir unaufgefordert mit weiteren 
Informationen auf Sie zukommen.

Mit freundlichen Grüßen
Patrick Huber
Campus-Groovelab Cloud-Services
```

4. **Sofortige Weiterleitung** des Schreibens an `schaden@exali.de` bzw. `schaden@hiscox.de` mit der Bitte um Übernahme der Abwehr im Rahmen des passiven Rechtsschutzes.
