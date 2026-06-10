# Architektur- & Sicherheitsanalyse: GrooveLab / Campus

Dieses Dokument vergleicht die Vorschläge deines Freundes mit der aktuellen GrooveLab-Implementierung und bewertet, welche Änderungen unser System tatsächlich verbessern und wo die aktuelle Architektur überlegen ist.

---

## 1. Hetzner Server & SSH-Härtung (Vorschlag 1.1)

### Vergleich
* **Empfehlung des Freundes:** Ubuntu 24.04, `unattended-upgrades`, SSH-Härtung (kein Root-Login, kein Passwort-Login, ED25519-Keys, Fail2Ban), UFW-Firewall (Standard-Drop, nur SSH-Port 22 für Admin-IPs, 80 und 443 offen).
* **Aktueller Stand:** Wir nutzen einen Hetzner/Cloud-Server (`178.105.10.2`) zum Hosten der statischen Frontend-Assets. Unser Deployment-Skript [deploy.sh](../deploy.sh) loggt sich aktuell noch direkt als `root` ein.

### Bewertung & Empfehlung
> [!IMPORTANT]
> **Ja, das verbessert unser System!** Wir sollten diese Härtungsmaßnahmen umsetzen, da sie Industriestandard zum Schutz sensibers Daten sind.

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
* **Realtime-Funktionalität:** GrooveLab basiert stark auf Echtzeit-Interaktionen (z. B. Live-Status der Räume, Hilfe-Ruf-System). Supabase liefert ein fertiges Echtzeit-WebSocket-Framework mit. Ein eigens Backend in Docker müsste diese Funktionalität (z. B. über Node.js, Socket.io und Redis Pub/Sub) von Grund auf neu implementieren.
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
