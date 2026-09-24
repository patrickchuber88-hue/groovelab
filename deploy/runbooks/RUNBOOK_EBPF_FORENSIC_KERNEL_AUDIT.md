# 🛡️ Runbook: eBPF Kernel-Auditierung & Syscall-Security (Cilium Tetragon)

**Standard:** BSI IT-Grundschutz (APP.3.1), DIN EN ISO/IEC 27001 (Annex A.8.20/A.8.24)  
**Ziel-System:** Hetzner Linux Host (Ubuntu 22.04 / 24.04 LTS)  
**Komponente:** Cilium Tetragon eBPF Kernel Security Observer  
**Policy:** `deploy/ebpf/tetragon-pg-security.yaml`

---

## 1. Zweck & Forensischer Kontext

Im Gegensatz zu klassischen Log-Aggregatoren (die von kompromittierten Prozessen manipuliert werden können) liest eBPF direkt aus den Systemaufrufen (Syscalls) des Linux-Kernels im Ring 0. 

Die hinterlegte Policy implementiert **exakt 3 unbestechliche Überwachungsregeln** zur Vermeidung von Alert-Fatigue:
1. **PostgreSQL Data Directory Shield:** Verhindert und meldet den Zugriff beliebiger fremder Binaries auf die Datenbankdateien (`/var/lib/postgresql/data`).
2. **Database Container Egress Guard:** Schlägt Alarm, wenn der PostgreSQL-Prozess eigenständig ausgehende Verbindungen ins Internet initiiert.
3. **Perimeter File Integrity:** Überwacht Schreibzugriffe auf `/etc/nginx/` und `/etc/ssh/sshd_config`.

---

## 2. Installation auf dem Hetzner-Produktivserver

Tetragon kann direkt als systemd-Dienst oder als leichtgewichtiger Daemon-Container betrieben werden.

### Option A: Standalone Binary (Empfohlen für schlanke Hetzner Hosts)
```bash
# 1. Tetragon Release herunterladen (tar.gz)
RELEASE_URL="https://github.com/cilium/tetragon/releases/latest/download/tetragon-linux-amd64.tar.gz"
curl -sL "${RELEASE_URL}" | tar -xz -C /usr/local/bin --strip-components=1

# 2. Policy-Verzeichnis anlegen & Policy kopieren
mkdir -p /etc/tetragon/tetragon.tp.d/
cp deploy/ebpf/tetragon-pg-security.yaml /etc/tetragon/tetragon.tp.d/

# 3. Systemd-Service einrichten & starten
cat << 'EOF' > /etc/systemd/system/tetragon.service
[Unit]
Description=Cilium Tetragon eBPF Security Agent
Documentation=https://github.com/cilium/tetragon
After=network.target

[Service]
ExecStart=/usr/local/bin/tetragon --tracing-policy-dir=/etc/tetragon/tetragon.tp.d/ --export-filename=/var/log/tetragon/events.json
Restart=always
RestartSec=5
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
EOF

mkdir -p /var/log/tetragon
systemctl daemon-reload
systemctl enable --now tetragon
```

---

## 3. Forensische Event-Inspektion & Alarmierung

Tetragon streamt strukturierte JSON-Events nach `/var/log/tetragon/events.json`.

### Live-Filter auf kritische Sicherheitsalarme
```bash
# Zeigt nur SIGKILL oder Alarme der PostgreSQL- und Nginx-Policies
tetra getevents -o compact --namespace default
```

### Log-Rotation zur Sicherung des Festplattenplatzes
Stelle sicher, dass `/etc/logrotate.d/tetragon` aktiv ist:
```
/var/log/tetragon/events.json {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

---

## 4. Rollback / Deaktivierung im Notfall
```bash
# Stoppen des eBPF-Monitors
systemctl stop tetragon
systemctl disable tetragon
# Der Linux-Kernel entlädt alle eBPF-Probes automatisch rückstandsfrei
```
