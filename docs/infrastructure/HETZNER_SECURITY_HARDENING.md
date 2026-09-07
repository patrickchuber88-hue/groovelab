# 🛡️ Campus-Groovelab Hetzner Cloud Server Hardening Guide
**Enterprise Host Security & Zero-Trust Infrastructure (OWASP ASVS Level 3 / BSI IT-Grundschutz)**
**Target Host:** Hetzner Cloud Ubuntu 22.04 / 24.04 LTS (`178.105.10.2`)  
**Datenschutz-Doktrin:** 100 % Deutschland (Hetzner Falkenstein / Nürnberg) · Null US-Dienste / Kein Cloudflare

---

## 1. Architektur-Überblick (Zweistufiger Schutzschirm)

```
[ Internet / Angreifer ]
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Hetzner Cloud Hardware-Firewall (Hypervisor-Ebene)       │
│    - Blockiert unerwünschte Pakete vor der Server-NIC       │
│    - Schützt vor Port-Scans, SYN-Floods und Brute-Force      │
│    - Ports: 22 (SSH), 80 (HTTP), 443 (HTTPS) ONLY           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Ubuntu Host Security (OS-Ebene)                          │
│    ├── Dedizierter Deploy-User (deployuser) + Sudo          │
│    ├── SSH-Hardening (PermitRootLogin no, Pubkey Only)      │
│    ├── Host-Firewall (UFW Default Deny Incoming)            │
│    ├── Docker UFW Bypass Schranke (DOCKER-USER Chain)       │
│    ├── Fail2Ban Intrusion Prevention (Jail sshd -> UFW)     │
│    ├── Unattended-Upgrades (Auto-Security-Patches 03:30)    │
│    └── Kernel-Sysctl Hardening (SYN-Cookies, Anti-Spoofing) │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Container-Isolation & Reverse-Proxy                      │
│    ├── Traefik / Coolify (Exponiert nur Port 80 / 443)      │
│    ├── PostgreSQL (5432 nur an 127.0.0.1 gebunden)          │
│    └── Supabase Internal APIs (Kong, Auth, Rest, Realtime)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Stufe 1: Hetzner Cloud Console Hardware-Firewall einrichten

Die Hardware-Firewall von Hetzner fängt Angriffe auf Hypervisor-Ebene ab, ohne die CPU oder den Arbeitsspeicher des Servers zu belasten.

### Schritt-für-Schritt Einrichtung in der Hetzner Console:
1. Öffne die **Hetzner Cloud Console** (https://console.hetzner.cloud).
2. Wähle das Projekt und navigiere links zu **Firewalls** ➔ **Firewall erstellen**.
3. Name der Firewall: `campus-groovelab-prod-fw`
4. **Eingehende Regeln (Inbound Rules):**

| Typ | Port | IP-Bereich / Quelle | Beschreibung |
| :--- | :--- | :--- | :--- |
| **TCP** | `22` | `0.0.0.0/0` und `::/0` *(oder feste Admin-IP)* | SSH Secure Administration |
| **TCP** | `80` | `0.0.0.0/0` und `::/0` | HTTP (Let's Encrypt ACME-Challenge & Redirect) |
| **TCP** | `443` | `0.0.0.0/0` und `::/0` | HTTPS (Verschlüsselter Web-Traffic für Campus-Groovelab) |
| **ICMP** | `-` | `0.0.0.0/0` und `::/0` | Ping / Path MTU Discovery *(optional)* |

*Alle anderen eingehenden Ports (insb. 5432, 8000, 8080, 9999, 4000, 3000) werden standardmäßig verworfen (DROP).*

5. **Ausgehende Regeln (Outbound Rules):**
   - Belassen auf `Alle IPv4- und IPv6-Verbindungen erlauben` (für Updates, Backups, SMTP und NTP).
6. **Zuweisung:**
   - Wähle unter **Angewendet auf** den Server `178.105.10.2` aus.
   - Klicke auf **Firewall anwenden**.

---

## 3. Stufe 2: Automatisierte Host-Härtung ausführen

Für die Host-Härtung steht ein vollständig automatisiertes, idempotentes Skript zur Verfügung:

### Option A: Direkte Ausführung von der Entwickler-Workstation (Empfohlen)
```bash
# Aus dem Projektverzeichnis ausführen:
bash scripts/apply_server_hardening.sh
```

### Option B: Direkte Ausführung auf dem Hetzner-Server
Falls du bereits per SSH auf dem Server eingeloggt bist:
```bash
# 1. Skript herunterladen oder übertragen
scp scripts/server_initial_hardening.sh root@178.105.10.2:/root/scripts/

# 2. Auf dem Server als Root ausführen:
sudo bash /root/scripts/server_initial_hardening.sh
```

---

## 4. Detaillierte Funktionsweise der Host-Härtung

### 4.1 Dedizierter Deploy-User (`deployuser`)
- Erstellt einen isolierten Benutzer `deployuser` mit Bash-Shell.
- Hinterlegt den SSH-Key aus `/root/.ssh/authorized_keys` in `/home/deployuser/.ssh/authorized_keys` mit Rechten `0700` (Ordner) und `0600` (Datei).
- Hinterlegt kontrollierte Sudo-Rechte in `/etc/sudoers.d/deployuser`.

### 4.2 SSH-Hardening (`/etc/ssh/sshd_config.d/99-security-hardening.conf`)
- `PermitRootLogin no`: Direkter Root-Login wird abgewiesen.
- `PasswordAuthentication no`: Wörterbuchangriffe unmöglich, nur kryptografische SSH-Keys erlaubt.
- `PubkeyAuthentication yes`: Ausschließlich asymmetrische Public-Key-Authentifizierung.
- `MaxAuthTries 3`: Trennung nach 3 Fehlversuchen.
- `X11Forwarding no`: Keine GUI-Weiterleitung.
- `ClientAliveInterval 300` / `ClientAliveCountMax 2`: Automatische Trennung verwaister SSH-Sitzungen.
- **Aussperrschutz:** Das Skript führt vor dem Neuladen des SSH-Dienstes eine Syntaxprüfung via `sshd -t` durch und verifiziert das Vorhandensein des Schlüssels.

### 4.3 Host-Firewall (UFW) & Docker-Bypass-Schranke
- `ufw default deny incoming`: Alle unaufgeforderten eingehenden Pakete werden verworfen.
- Whitelist für Ingress: Loopback (`lo`), SSH Port 22, HTTP Port 80, HTTPS Port 443.
- **Forensische Docker-Schranke (`DOCKER-USER` Chain):** Standardmäßig hebelt Docker UFW über direkte iptables-Regeln aus. Die in `/etc/ufw/after.rules` konfigurierte `DOCKER-USER`-Kette blockiert externe Zugriffe auf Docker-interne Container (z. B. PostgreSQL 5432), selbst wenn eine Portweiterleitung existiert. Nur Verbindungen aus dem internen Bridge-Netzwerk (`br-+`, `docker0`) und die expliziten Web-Ports 80/443 dürfen die Bridge passieren.

### 4.4 Intrusion Prevention (Fail2Ban)
- Installiert `fail2ban` und erstellt `/etc/fail2ban/jail.local`.
- Konfiguration:
  - `bantime = 7200` (2 Stunden Sperre bei Verstoß)
  - `findtime = 600` (10-Minuten-Analysefenster)
  - `maxretry = 3` (Maximal 3 Fehlversuche)
  - `banaction = ufw` (Banns werden direkt auf Firewall-Ebene blockiert)

### 4.5 Automatisierte Sicherheitsupdates (`unattended-upgrades`)
- Installiert `unattended-upgrades`.
- Beschränkt automatische Installationen strikt auf Sicherheits-Patches (`${distro_id}:${distro_codename}-security`).
- Automatischer Neustart (nur bei zwingendem Kernel-Patch) auf das verkehrsarme Zeitfenster `03:30 Uhr` nachts terminiert.

### 4.6 Kernel- & Netzwerk-Stack Härtung (`/etc/sysctl.d/99-security-hardening.conf`)
- `net.ipv4.tcp_syncookies = 1`: Schutz vor Denial-of-Service durch TCP-SYN-Floods.
- `net.ipv4.conf.all.rp_filter = 1`: Reverse-Path-Filtering verhindert IP-Spoofing.
- `net.ipv4.conf.all.accept_source_route = 0`: Verhindert böswilliges Source-Routing von Paketen.
- `net.ipv4.conf.all.accept_redirects = 0`: Verhindert Manipulation von Routing-Tabellen durch gefälschte ICMP-Pakete.
- `fs.protected_hardlinks = 1` / `fs.protected_symlinks = 1`: Schutz vor Symlink-Privilege-Escalation im Dateisystem.

---

## 5. Post-Deployment Verifikations-Checkliste

Nach Ausführung des Härtungsskripts verifizierst du die Sicherheitsbarrieren mit folgenden Prüfungen:

### 1. SSH-Login mit Deploy-User testen:
```bash
ssh deployuser@178.105.10.2
# Muss sofort erfolgreich ohne Passwortabfrage (per SSH-Key) einloggen.
```

### 2. Root-Login-Abweisung testen:
```bash
ssh root@178.105.10.2
# MUSS abgewiesen werden: "Permission denied (publickey)"
```

### 3. UFW-Firewall Status prüfen:
```bash
sudo ufw status verbose
# Status: active
# Logging: on (low)
# Default: deny (incoming), allow (outgoing), disabled (routed)
# To Action From
# 22/tcp ALLOW IN Anywhere
# 80/tcp ALLOW IN Anywhere
# 443/tcp ALLOW IN Anywhere
```

### 4. Fail2Ban Status prüfen:
```bash
sudo fail2ban-client status sshd
# Status for the jail: sshd
# |- Filter: Currently failed: 0, Total failed: ...
# `- Actions: Currently banned: 0, Total banned: ...
```

### 5. Docker-Port-Isolation prüfen:
```bash
# Von einer externen Workstation testen:
nc -zv -w 3 178.105.10.2 5432
# MUSS ein Timeout oder "Connection refused" liefern.
# Die Datenbank darf NIEMALS aus dem Internet erreichbar sein.
```

---

## 6. Notfall-Zugriff (Break-Glass-Verfahren)

Solltest du dich jemals versehentlich aussperren (z. B. durch Verlust des SSH-Schlüssels):
1. Öffne die **Hetzner Cloud Console** ➔ Server `178.105.10.2`.
2. Klicke oben rechts auf das **Cloud Console Icon** (VNC Web-Konsole).
3. Logge dich direkt über die Out-of-Band-Webkonsole ein.
4. Repariere `/home/deployuser/.ssh/authorized_keys` oder prüfe `/var/log/auth.log`.
