# Sicherheits-Härtung & Lokaler Server: GrooveLab / Campus

Dieses Dokument dokumentiert die erfolgreich abgeschlossenen Sicherheitsoptimierungen auf dem Hetzner-Server sowie den Start deiner lokalen Entwicklungsumgebung.

---

## 🛡️ 1. SSH-Sicherheits-Härtung (Schritt 1.1)

Um Brute-Force-Angriffe auf den Server zu unterbinden, wurde der Passwort-Login vollständig deaktiviert.

### Durchgeführte Änderungen
* **Konfigurationsdatei:** In `/etc/ssh/sshd_config.d/50-cloud-init.conf` wurde der Wert `PasswordAuthentication` von `yes` auf `no` geändert.
* **Neustart:** Der SSH-Dienst wurde neu gestartet (`systemctl restart ssh`).

### Verifizierung
* Der Login-Versuch mittels Passwort wird nun serverseitig blockiert:
  ```text
  Permission denied (publickey).
  ```
* Der schlüssellose Login über deinen vertrauenswürdigen lokalen Mac-Schlüssel (`id_ed25519`) funktioniert weiterhin einwandfrei und ohne Passwortabfrage.

---

## 🔒 2. Datenbank- & Service-Port-Isolierung (Schritt 1.2)

Zuvor waren die internen Service-Ports der selbstgehosteten Supabase-Instanz öffentlich im Internet erreichbar. Wir haben diese nun so isoliert, dass sie nur noch lokal auf dem Server angesprochen werden können.

### Durchgeführte Änderungen
In der Datei `/root/supabase-project/docker-compose.yml` wurden die Portfreigaben für den Supabase-Datenbank-Pooler (`supavisor`) und das API-Gateway (`kong`) von allen Schnittstellen (`0.0.0.0`) auf die lokale Loopback-Schnittstelle (`127.0.0.1`) umgestellt:

```diff
  # supavisor (Datenbank-Pooler)
  ports:
-   - ${POSTGRES_PORT}:5432
-   - ${POOLER_PROXY_PORT_TRANSACTION}:6543
+   - 127.0.0.1:${POSTGRES_PORT}:5432
+   - 127.0.0.1:${POOLER_PROXY_PORT_TRANSACTION}:6543

  # kong (API-Gateway)
  ports:
-   - ${KONG_HTTP_PORT}:8000/tcp
-   - ${KONG_HTTPS_PORT}:8443/tcp
+   - 127.0.0.1:${KONG_HTTP_PORT}:8000/tcp
+   - 127.0.0.1:${KONG_HTTPS_PORT}:8443/tcp
```

Die Docker-Container wurden anschließend mit `docker compose up -d` neu gestartet.

### Verifizierung
Die Ports sind jetzt geschützt an `127.0.0.1` gebunden:
* `127.0.0.1:5432` (Postgres / Session-Pool) — **Geschlossen fürs Internet**
* `127.0.0.1:6543` (Postgres / Transaction-Pool) — **Geschlossen fürs Internet**
* `127.0.0.1:8081` (Kong API-Gateway HTTP) — **Geschlossen fürs Internet**
* `127.0.0.1:8444` (Kong API-Gateway HTTPS) — **Geschlossen fürs Internet**

*Hinweis:* Traefik routet den Datenverkehr von `https://supabase.campus-groovelab.de` weiterhin völlig normal über Port 443 an Kong weiter. Die Web-App läuft also ohne Unterbrechung.

---

## 🚀 3. Lokaler Entwicklungsserver (Localhost)

Deine lokale Test- und Entwicklungsumgebung wurde erfolgreich gestartet.

* **Befehl:** `npm run dev:groovelab`
* **Zugeordneter Port:** Da Port `5173` belegt war, läuft die lokale App jetzt unter:
  👉 **[http://localhost:5174/](http://localhost:5174/)**
