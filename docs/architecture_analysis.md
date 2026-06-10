# Architektur- & Sicherheitsanalyse: GrooveLab / Campus

Dieses Dokument vergleicht die Vorschläge deines Freundes mit der aktuellen GrooveLab-Implementierung und bewertet, welche Änderungen unser System tatsächlich verbessern und wo die aktuelle Architektur überlegen ist.

---

## 1. Hetzner Server & SSH-Härtung (Vorschlag 1.1)

### Vergleich
* **Empfehlung des Freundes:** Ubuntu 24.04, `unattended-upgrades`, SSH-Härtung (kein Root-Login, kein Passwort-Login, ED25519-Keys, Fail2Ban), UFW-Firewall (Standard-Drop, nur SSH-Port 22 für Admin-IPs, 80 und 443 offen).
* **Aktueller Stand:** Wir nutzen einen Hetzner/Cloud-Server (`178.105.10.2`) zum Hosten der statischen Frontend-Assets. Unser Deployment-Skript [deploy.sh](../deploy.sh) loggt sich aktuell noch direkt als `root` ein.

### Bewertung & Empfehlung
> [!IMPORTANT]
> **Ja, das verbessert unser System!** Wir sollten diese Härtungsmaßnahmen umsetzen, da sie Industriestandard zum Schutz sensibler Daten sind.

* **SSH-Root-Login verbieten (`PermitRootLogin no`):** Sehr sinnvoll. Wenn wir dies jedoch blind aktivieren, bricht unser [deploy.sh](../deploy.sh) ab.
  * **Lösung:** Wir erstellen einen dedizierten SSH-Benutzer (z. B. `deploy`) auf dem Server, der Schreibrechte für `/var/www/groovelab` besitzt, und passen unser Deployment-Skript an.
* **Passwort-Login deaktivieren & ED25519-Schlüssel erzwingen:** Absolut empfehlenswert.
* **Fail2Ban:** Schützt effektiv vor Brute-Force-Angriffen.
* **Firewall (UFW) & IP-Whitelisting für Port 22:** IP-Whitelisting für SSH ist extrem sicher, kann jedoch im Alltag problematisch sein, wenn du von zu Hause aus arbeitest und eine dynamische IP-Adresse hast (Gefahr des Aussperrens). Alternativ: SSH auf einen Custom-Port legen und SSH-Keys erzwingen.

---

## 2. Docker & Docker Compose Container-Architektur (Vorschlag 1.2)

### Vergleich
* **Empfehlung des Freundes:** Komplettes System (Frontend, Backend, PostgreSQL/MongoDB) in Docker-Containern betreiben. Datenbank vom Internet isolieren.
* **Aktueller Stand:** GrooveLab ist als Serverless-Architektur konzipiert. Wir nutzen **Supabase** als vollverwaltetes Backend-as-a-Service (BaaS) für Datenbank, Authentifizierung, Realtime WebSockets und Storage. Auf dem Hetzner-Server liegen *ausschließlich* die statischen Frontend-Dateien, die über Nginx ([nginx.conf](../nginx.conf)) ausgeliefert werden.

### Bewertung & Empfehlung
> [!WARNING]
> **Nein, dieser Vorschlag verschlechtert unser System!** Das Hosten der gesamten Infrastruktur (insbesondere der produktiven Datenbank) in Docker auf einem einzelnen Hetzner-Server bringt massive Nachteile:

* **Hoher Wartungsaufwand (DevOps):** Wenn wir Postgres selbst in Docker hosten, müssen wir uns selbst um Point-in-Time-Backups, Replikation, Scaling, Connection Pooling (z. B. PgBouncer) und Sicherheitsupdates der DB kümmern. Supabase übernimmt all dies automatisch.
* **Realtime-Funktionalität:** GrooveLab basiert stark auf Echtzeit-Interaktionen (z. B. Live-Status der Räume, Hilfe-Ruf-System). Supabase liefert ein fertiges Echtzeit-WebSocket-Framework mit. Ein eigenes Backend in Docker müsste diese Funktionalität (z. B. über Node.js, Socket.io und Redis Pub/Sub) von Grund auf neu implementieren.
* **Single Point of Failure (SPOF):** Stürzt der Hetzner-Server ab oder hat Hardwareprobleme, ist das gesamte System (inklusive aller Schülerdaten) offline. Bei Supabase läuft die Datenbank in einer hochverfügbaren Cloud-Infrastruktur auf AWS.
* **Fazit:** Die Kombination aus **Hetzner (günstiges statisches Frontend-Hosting)** und **Supabase (sichere, skalierbare Cloud-Datenbank & Auth)** ist für uns der ideale Kompromiss aus Performance, Kosten und minimalem Wartungsaufwand.

---

## 3. Reverse Proxy (Traefik / Caddy) (Vorschlag 1.3)

### Vergleich
* **Empfehlung des Freundes:** Traefik/Caddy zur automatischen Let's Encrypt SSL-Verwaltung für dynamische Mandanten-Subdomains (z. B. `schule.campus-groovelab.de`).
* **Aktueller Stand:** Wir nutzen Nginx direkt mit Certbot ([nginx.conf](../nginx.conf)). Die Subdomänen-Auflösung erfolgt elegant im Frontend [LoginScreen.tsx](../apps/groovelab/src/components/LoginScreen.tsx): Die App liest `window.location.hostname` aus und lädt die passende Schule aus der Datenbank.

### Bewertung & Empfehlung
> [!TIP]
> **Teilweise sinnvoll.** Caddy oder Traefik sind hervorragend für Docker-Setups. Da wir aber kein komplexes Container-Setup betreiben, bringt ein Wechsel von Nginx zu Caddy/Traefik aktuell keinen echten Mehrwert.

* **SSL für neue Schulen:** Damit neue Musikschulen sofort online gehen können, nutzen wir am besten ein **Wildcard-Zertifikat** (`*.campus-groovelab.de`).
* Dies kann über Nginx + Certbot (via DNS-01 Challenge) einmalig eingerichtet werden. Es ist nicht nötig, für jede neue Schule dynamisch im Hintergrund ein neues SSL-Zertifikat bei Let's Encrypt zu beantragen (was an Let's Encrypt Rate-Limits stoßen kann).
* Die von Nginx erzwungenen TLS-Härtungen (TLS 1.2 / 1.3) sind in unserer aktuellen [nginx.conf](../nginx.conf) bereits aktiv.

---

## 4. PostgreSQL Mandantenfähigkeit (Multi-Tenancy) (Vorschlag 1.4)

### Vergleich
* **Empfehlung des Freundes:** Logische Mandantentrennung über eine indizierte `tenant_id` in jeder Tabelle. Die Filterung soll auf Backend/ORM-Ebene geschehen.
* **Aktueller Stand:** GrooveLab verwendet `school_id` als Mandanten-Key (analog zur `tenant_id`). Die Datenisolation wird jedoch direkt in der Datenbank über PostgreSQL **Row-Level Security (RLS)** erzwungen (siehe [final_security_lock.sql](../supabase/final_security_lock.sql)).

### Bewertung & Empfehlung
> [!IMPORTANT]
> **Unser aktueller Ansatz ist sicherer!** Die Absicherung auf Datenbank-Ebene (RLS) ist der ORM-Filterung des Freundes überlegen.

* **Das Problem bei ORM-Filtern (Backend):** Sie verlassen sich darauf, dass der Entwickler bei *jeder einzelnen Abfrage* im Code den Filter `.where('tenant_id', ...)` mitschreibt. Vergisst ein Entwickler das an einer Stelle, kommt es sofort zu einem mandantenübergreifenden Datenleck.
* **Der Vorteil von Postgres RLS:** RLS fängt die Abfragen direkt in der Datenbank ab. Selbst wenn unser Frontend fehlerhaft programmiert ist und "alle Profile" anfordert, filtert die Datenbank die Ergebnisse automatisch vor der Auslieferung anhand des JWT-Tokens des Nutzers. Das ist maximale DSGVO-Konformität ("Security by Design").

---

## 5. Local-First Synchronisations-Engine (Vorschlag 1.5)

### Vergleich
* **Empfehlung des Freundes:** Offline-Fähigkeit durch lokale IndexedDB (RxDB/WatermelonDB), Service Worker für inkrementelle Synchronisation, kryptografische Last-Write-Wins Konfliktlösung und visuelles Feedback bei unbestätigten Daten.
* **Aktueller Stand:** GrooveLab setzt auf Echtzeit-Online-Abfragen direkt gegen die Supabase-API. Wir puffern Authentifizierungsdaten und grundlegende UI-Zustände im `localStorage`, nutzen aber keine lokale relationale Client-Datenbank.

### Bewertung & Empfehlung
> [!WARNING]
> **Das ist für uns ein massiver, unbezahlbarer Overhead!** Zudem liegt hier ein klarer Kontext-Fehler vor.

* **Der Kontext-Fehler (Fremd-Spezifikation):**
  Der Text deines Freundes spricht von *„Fahrtenwechseln“*, *„Fahrer offline auf dem Smartphone ändern“* und *„Oma wurde noch nicht benachrichtigt“*. 
  **GrooveLab ist eine Musikschul-Plattform für Raumbelegung, Notizen und Stundenpläne!** Wir verwalten keine Fahrgemeinschaften oder Familien-Fahrpläne. Dein Freund hat hier offensichtlich ein Anforderungsdokument eines völlig anderen Projekts (z. B. einer Fahrdienst- oder Familien-App) kopiert und ungeprüft weitergeleitet.
* **Architektonische Komplexität:**
  * Supabase unterstützt standardmäßig keine bidirektionale Offline-Synchronisation (Offline-Schreibvorgänge mit späterer Konfliktlösung).
  * Die Implementierung von RxDB/WatermelonDB mit Supabase-Replikation würde bedeuten, dass wir **nahezu 100 % unserer Datenzugriffs-Logik und unseres State-Managements neu schreiben müssten**. Das würde die Entwicklungszeit um Monate verlängern.
* **Macht Local-First für uns Sinn?**
  * Im Musikschulalltag (Unterricht, Raumprüfung) ist Internet (WLAN oder LTE) in 99 % der Fälle vorhanden. Wer checkt sich schon offline in einem Kellerraum in eine Live-Session ein?
  * **Pragmatische Alternative:** Falls wir einfache Offline-Fähigkeit wollen (z. B. damit die App lädt, wenn das Netz kurz weg ist), richten wir einen **Standard Service Worker (PWA)** ein. Dieser cacht die App-Dateien (HTML, JS, CSS), sodass die App offline startet und z. B. eine nette Meldung anzeigt oder im `localStorage` gespeicherte Daten schreibgeschützt anzeigt. Das kostet uns 2 Tage statt 2 Monate Arbeit.

---

## 6. Globales Sicherheits- & DSGVO-Konzept (Vorschlag 1.6)

### Vergleich
* **Empfehlung des Freundes:** Datenminimierung bei externen Mail-Gateways (Pseudonymisierung), "Zero-Mail-Workflow" als Fallback per `mailto:`, Brute-Force-Schutz für QR-Logins (Rate Limiting), verschlüsselte automatisierte Backups (AES-256-GCM via OpenSSL) und Audit Trails für administrative Zugriffe.
* **Aktueller Stand:**
  * Wir senden derzeit **keine** E-Mails an Dritte (wie Brevo/Resend) aus der App heraus.
  * QR-Logins werden direkt über die Supabase-Datenbank validiert (die QR-Token sind sichere UUIDs).
  * Auf dem Hetzner-Server existiert **kein automatisiertes Backup-System** (nur unregelmäßige manuelle Backups).

### Bewertung & Empfehlung

#### 6.1 Anonymisierte E-Mail-Pipeline (Brevo/Resend) & Zero-Mail
> [!NOTE]
> **Aktuell nicht notwendig, da kein Drittanbieter-Mailversand stattfindet.**
* Da wir Schüler- und Lehrerdaten vollständig auf unserem selbstgehosteten Supabase-Server auf Hetzner isolieren und keine Mail-Dienstleister angebunden haben, besteht hier derzeit kein Risiko.
* Sollten wir in Zukunft automatisierte E-Mails (z. B. Hausaufgaben-Erinnerungen) einführen, ist das Pseudonymisierungsprinzip (nur IDs/Initialen an Brevo übertragen) absolut sinnvoll und wird so umgesetzt.

#### 6.2 Rate-Limiting für QR-/PIN-Logins
> [!IMPORTANT]
> **Sinnvolle Verbesserung!**
* Die `qr_token` sind zwar kryptografische UUIDs (nicht erratbar), aber die kürzeren `ausweis_nummer`-PINs könnten theoretisch durch Brute-Force erraten werden.
* **Lösung:** Da wir Supabase selbst hosten, können wir ein Rate-Limiting (z. B. max. 5 Anfragen pro Minute pro IP) direkt im eingebauten API-Gateway **Kong** oder im vorgeschalteten Proxy **Traefik** konfigurieren.

#### 6.3 Verschlüsselte automatisierte Backups
> [!CAUTION]
> **Kritische Sicherheitslücke: Dringend umsetzen!**
* Derzeit werden Backups nur unregelmäßig manuell erstellt. Ein Serverausfall bei Hetzner würde zu partiellem Datenverlust führen.
* **Lösung:** Wir sollten ein einfaches, nächtliches Shell-Skript auf dem Server einrichten (`cron`), das:
  1. Den Zustand der Postgres-Datenbank sichert (`pg_dump`).
  2. Die Datei mit OpenSSL und AES-256-GCM verschlüsselt.
  3. Die Datei auf einen externen Speicher (z. B. Hetzner Storage Box oder AWS S3) spiegelt.
  4. Lokal eine Rotation von z. B. 7 Tagen pflegt.

#### 6.4 Audit Trails & Log-Anonymisierung
> [!TIP]
> **Gute Ergänzung für städtische Musikschulen.**
* Log-Rotations-Fristen für Nginx- und Docker-Logs auf dem Server auf 7 Tage zu begrenzen, ist datenschutzrechtlich sauber.
* Administrative Änderungen an Nutzerprofilen protokollieren wir am einfachsten über einen einfachen PostgreSQL-Trigger in unserer Supabase-Datenbank.
