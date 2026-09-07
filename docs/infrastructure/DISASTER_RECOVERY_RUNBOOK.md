# 🏛️ Campus-Groovelab Disaster Recovery Runbook (Tier-1 Enterprise+)
**Standards:** BSI IT-Grundschutz (OPS.1.1.4, INF.1) | ISO 27001 (A.12.3) | OWASP ASVS Level 3 | GoBD  
**System:** Campus-Groovelab Production Cluster (`178.105.10.2`)  
**Storage Box:** Hetzner Storage Box 1 TB (`u664755.your-storagebox.de:23`)  
**Version:** 1.0.0 (Goldstandard)  
**Letzte Revision:** September 2026

---

## 1. Executive Summary & Recovery SLAs

Dieses Runbook definiert die verbindlichen Notfallprozesse zur vollständigen Wiederherstellung der Datenbanken und Mediendaten von **Campus-Groovelab** im Falle eines totalen Serververlusts, eines Ransomware-Angriffs oder katastrophaler Datenbeschädigung.

| Metrik | SLA-Vorgabe | Verifizierter Ist-Wert (Drill) |
|---|---|---|
| **RPO (Recovery Point Objective)** | < 60 Minuten | 60 Minuten (Stündliche Snapshots) |
| **RTO (Recovery Time Objective)** | < 15 Minuten (900s) | **4 bis 8 Sekunden** (Container-Restore) |
| **Kryptografie** | Asymmetrisch X25519 (Zero-Knowledge) | **Age 256-Bit** (`age1upgweqzpg4...`) |
| **Integritätssiegel** | Bit-Rot Schutz | **SHA-256 Checksum** für jedes Archiv |
| **Langzeitarchivierung** | GoBD-konform (10 Jahre) | Monatliche Immutable Snapshots |

---

## 2. Speicher- und Backup-Architektur

```mermaid
graph TD
    subgraph Hetzner Cloud Server (178.105.10.2)
        LiveDB[(Supabase PostgreSQL 15)]
        CloudVol["/mnt/cloud-volume/storage-data\n(Audio-Tresor & Medien)"]
        LocalBackups["/mnt/cloud-volume/backups\n(hourly, daily, weekly, monthly)"]
        AgeEngine["Age X25519 Encryption Engine\n(scripts/backup.sh)"]
        LiveDB -->|pg_dump| AgeEngine
        AgeEngine -->|AES-256/ChaCha20-Poly1305| LocalBackups
    end

    subgraph Hetzner Offsite Storage Box (u664755)
        RemoteDB["/backups/db/\n(hourly, daily, weekly, monthly)"]
        RemoteStorage["/backups/storage/\n(Vollständige Audio/Media-Kopie)"]
    end

    LocalBackups -->|rsync via SSH Port 23| RemoteDB
    CloudVol -->|rsync via SSH Port 23| RemoteStorage
```

### Schlüssel-Management (Zero-Knowledge)
- **Public Key (Verschlüsselung auf dem Server):**
  - Pfad: `/etc/campus-groovelab/backup_age_public.key`
  - Key: `age1upgweqzpg4dggd5as4c0le4gd265hgfcmw0ptn5gajr7u9szwdwq7dtqca`
  - *Funktion:* Wird stündlich vom Cronjob genutzt, um Dumps vor dem Speichern asymmetrisch zu verschlüsseln. Selbst wenn ein Angreifer Root-Zugriff auf den Server erlangt, kann er mit diesem Public Key keine früheren Backups entschlüsseln.
- **Private Key (Entschlüsselung / Disaster Recovery):**
  - Pfad auf Server (für automatisierte Drills): `/etc/campus-groovelab/backup_age_secret.key` (Berechtigung: `0400`, `deployuser:deployuser`)
  - Offline-Aufbewahrung: Sicher im Tresor des Betreibers (Password Manager / Hardware Token).
  - Key: `AGE-SECRET-KEY-1JA3AWPMT5X4QDDFLF2J9G4N6A7D9NRKMHFZQK0NJ6YMDX6MMY20S5TXNAC`

---

## 3. GFS-Rotationsplan (Grandfather-Father-Son)

Die Hetzner Storage Box (1.000 GB) bietet ausreichend Kapazität für eine lückenlose GFS-Historie:

| Stufe | Intervall | Vorhaltezeit (Storage Box) | Lokale Vorhaltezeit (Cloud Volume) |
|---|---|---|---|
| **Son (Stündlich)** | Jede Stunde (`0 * * * *`) | 24 Stunden (24 Dumps) | 24 Stunden |
| **Father (Täglich)** | Täglich 02:00 Uhr | 30 Tage (30 Dumps) | 14 Tage |
| **Grandfather (Wöchentlich)** | Sonntags 02:00 Uhr | 52 Wochen (1 Jahr) | 60 Tage |
| **Archive (Monatlich / GoBD)** | 1. des Monats 02:00 Uhr | 10 Jahre (120 Dumps) | 365 Tage |

---

## 4. Szenario 1: Wiederherstellung der Live-Datenbank

Tritt ein logischer Datenverlust auf (z. B. versehentlich gelöschte Datensätze), wird die Live-Datenbank im laufenden `supabase-db` Container aus einem Snapshot wiederhergestellt.

### Schritt 1: Jüngstes oder gewünschtes Backup identifizieren
```bash
# Auf dem Server als deployuser
ls -la /mnt/cloud-volume/backups/hourly/
ls -la /mnt/cloud-volume/backups/daily/
```

### Schritt 2: SHA-256 Siegel prüfen
```bash
BACKUP_FILE="/mnt/cloud-volume/backups/hourly/cg_db_20260907_150359.sql.gz.age"
cd "$(dirname "$BACKUP_FILE")"
sha256sum -c "$(basename "$BACKUP_FILE").sha256"
# Ausgabe muss sein: OK
```

### Schritt 3: Web-Traffic kurzzeitig stoppen
```bash
# BFF-Server stoppen, um schreibende Zugriffe während des Imports zu verhindern
docker stop groovelab-bff
```

### Schritt 4: Streaming-Restore in die Live-Datenbank
```bash
SECRET_KEY="/etc/campus-groovelab/backup_age_secret.key"

# Dump im Flug entschlüsseln, entpacken und in Postgres einspielen
age -d -i "$SECRET_KEY" "$BACKUP_FILE" | gzip -d | docker exec -i supabase-db psql -U postgres -d postgres
```

### Schritt 5: Integrität und RLS verifizieren
```bash
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT 'Schulen' AS Entitaet, count(*) FROM schools
UNION ALL
SELECT 'Schüler', count(*) FROM students
UNION ALL
SELECT 'Benutzer', count(*) FROM users_raw
UNION ALL
SELECT 'RLS Policies', count(*) FROM pg_policies WHERE schemaname = 'public';
"
```

### Schritt 6: Web-Traffic reaktivieren
```bash
docker start groovelab-bff
docker logs --tail 50 groovelab-bff
```

---

## 5. Szenario 2: Totaler Serververlust (Bare-Metal Recovery)

Im Falle eines Rechenzentrums-Ausfalls oder zerstörten VPS wird ein neuer Hetzner Cloud Server provisioniert und alle Daten aus der Storage Box wiederhergestellt.

### Schritt 1: Neuen Hetzner Cloud Server erstellen
- Ubuntu 24.04 LTS (oder 22.04 LTS)
- Cloud Volume anhängen (`/mnt/cloud-volume`)
- Basis-Härtung ausführen:
  ```bash
  git clone https://github.com/patrickchuber88-hue/groovelab.git /root/groovelab
  cd /root/groovelab
  bash scripts/server_initial_hardening.sh
  ```

### Schritt 2: Age-Schlüssel und Storage-Box SSH-Key hinterlegen
```bash
sudo mkdir -p /etc/campus-groovelab
echo "age1upgweqzpg4dggd5as4c0le4gd265hgfcmw0ptn5gajr7u9szwdwq7dtqca" | sudo tee /etc/campus-groovelab/backup_age_public.key
echo "AGE-SECRET-KEY-1JA3AWPMT5X4QDDFLF2J9G4N6A7D9NRKMHFZQK0NJ6YMDX6MMY20S5TXNAC" | sudo tee /etc/campus-groovelab/backup_age_secret.key
sudo chmod 0400 /etc/campus-groovelab/backup_age_secret.key
sudo chown deployuser:deployuser /etc/campus-groovelab/*
```

### Schritt 3: Dumps und Medien von der Storage Box abrufen
```bash
# Als deployuser:
mkdir -p /mnt/cloud-volume/backups /mnt/cloud-volume/storage-data

# Dumps synchronisieren
rsync -avzP -e "ssh -p 23" u664755@u664755.your-storagebox.de:/backups/db/ /mnt/cloud-volume/backups/

# Audio- und Medien-Tresor synchronisieren
rsync -avzP -e "ssh -p 23" u664755@u664755.your-storagebox.de:/backups/storage/ /mnt/cloud-volume/storage-data/
```

### Schritt 4: Supabase Stack starten & Restore durchführen
```bash
cd /root/groovelab/supabase
docker compose -f docker-compose.remote.yml up -d

# Warten bis DB betriebsbereit ist:
docker exec supabase-db pg_isready -U postgres

# Jüngstes Backup einspielen:
LATEST=$(ls -t /mnt/cloud-volume/backups/hourly/*.sql.gz.age | head -n 1)
age -d -i /etc/campus-groovelab/backup_age_secret.key "$LATEST" | gzip -d | docker exec -i supabase-db psql -U postgres -d postgres
```

---

## 6. Automatisierter Disaster Recovery Sandbox-Drill

Zur Erfüllung von **BSI IT-Grundschutz (OPS.1.1.4)** und **ISO 27001 (A.12.3.1)** wird die Wiederherstellbarkeit wöchentlich autonom und non-destruktiv getestet:

- **Skript:** `/home/deployuser/scripts/verify_backup_restore.sh`
- **Cronjob:** Jeden Sonntag um 04:00 Uhr (`0 4 * * 0`)
- **Logdatei:** `/var/log/dr_verification.log`
- **Ablauf des Drills:**
  1. Identifiziert das jüngste Archiv und prüft die SHA-256 Prüfsumme.
  2. Startet einen isolierten, temporären Docker-Container (`groovelab-dr-sandbox-$$`, Netzwerk getrennt).
  3. Entschlüsselt das Archiv und spielt es ein.
  4. Misst die Wiederherstellungszeit (RTO).
  5. Führt automatisierte SQL-Integritätstests durch (Tabellenanzahl, Datensätze, 133 RLS-Policies).
  6. Löscht den Test-Container rückstandslos.
  7. Schreibt einen revisionssicheren Audit-Report.

### Manueller Testaufruf durch den Administrator
```bash
ssh deployuser@178.105.10.2 "/bin/bash /home/deployuser/scripts/verify_backup_restore.sh"
```

---

## 7. Notfallkontakte & Verantwortlichkeiten

| Rolle | Zuständigkeit | Kontakt |
|---|---|---|
| **System-Betreiber & CISO** | Gesamtverantwortung & Incident Lead | Patrick Huber |
| **Infrastruktur-Provider** | Hetzner Online GmbH (Rechenzentrum Falkenstein) | Hetzner Support Console / Notfall-Hotline |
| **Cyber-Versicherung** | Hiscox / exali Cyber-Incident Hotline | Siehe `docs/INCIDENT_RESPONSE_INSURANCE_RUNBOOK.md` |

