# 🚀 Migration Runbook: PGDATA von Ceph-Volume auf Lokales NVMe

**Plattform:** Campus-Groovelab (https://campus-groovelab.de)  
**Host:** Hetzner Cloud VM (2 vCPU / 4 GB RAM / 40 GB NVMe)  
**Ziel:** Beseitigung von I/O-Thrashing und Latenzen durch Verlagerung der PostgreSQL-Transaktionsdaten auf das lokale High-IOPS NVMe Dateisystem.  
**Wartungsfenster:** Geplant 10–15 Minuten (Empfohlen: Dienstag–Donnerstag 03:00 CEST).  
**Verantwortlich:** SRE / Lead Infrastructure Architect.  

---

## 📋 Übersicht der Pfade (IST vs. SOLL)

| Komponente | IST-Zustand (Ceph-Netzwerk-Volume) | SOLL-Zustand (Lokales NVMe) |
| :--- | :--- | :--- |
| **PostgreSQL `PGDATA`** | `/mnt/cloud-volume/supabase-data` (Latenz: 5–20 ms) | `/var/lib/supabase_nvme/data` (Latenz: < 0,1 ms) |
| **Swapfile (OOM-Schutz)** | Keines oder unzureichend | `/swapfile` (4 GB auf NVMe, `swappiness=10`) |
| **Docker-Mount** | `- /mnt/cloud-volume/supabase-data:/var/lib/postgresql/data:Z` | `- /var/lib/supabase_nvme/data:/var/lib/postgresql/data:Z` |
| **Audio-Storage** | `/mnt/cloud-volume/storage-data` (bleibt unverändert!) | `/mnt/cloud-volume/storage-data` (bleibt auf Volume!) |

---

## ⏱️ Ablaufplan (10-Minuten-Wartungsfenster)

```
[02:50] Vorbereitung & Safety-Dump
   │
[03:00] Start Wartungsfenster: Ingress pausieren & DB stoppen
   │
[03:02] High-Speed NVMe Rsync & Berechtigungsprüfung
   │
[03:05] Swapfile-Aktivierung (4 GB) & Docker-Mount Aktualisierung
   │
[03:07] Datenbank-Start & Konsistenzprüfung (pg_isready, Pre-Flight)
   │
[03:10] Alle Dienste live schalten & Wartungsfenster schließen
```

---

## 🛠️ Phase 0: Vorbereitung (Vor dem Wartungsfenster, ca. 02:50 Uhr)

### 1. Pre-Flight Check ausführen
```bash
sudo bash /root/scripts/infra_preflight.sh
```

### 2. Sicherheits-Dump auf Hetzner Storage Box ziehen
```bash
CONTAINER=$(docker ps --format '{{.Names}}' | grep 'supabase-db\|postgres' | head -n 1)
docker exec -t "${CONTAINER}" pg_dump -U postgres -d postgres | gzip -9 > "/tmp/pre_migration_safety_$(date +%Y%m%d_%H%M%S).sql.gz"
echo "✓ Sicherheits-Dump in /tmp abgelegt."
```

### 3. Zielverzeichnis auf lokalem NVMe vorbereiten
```bash
sudo mkdir -p /var/lib/supabase_nvme/data
sudo chmod 700 /var/lib/supabase_nvme/data
```

### 4. 4 GB NVMe-Swapfile als Anti-OOM-Airbag anlegen (falls noch nicht vorhanden)
```bash
if [ ! -f /swapfile ]; then
  echo "Erstelle 4 GB Swapfile auf schnellem NVMe..."
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  sudo sysctl vm.swappiness=10
  echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.d/99-swap.conf
  echo "✓ 4 GB NVMe Swapfile erfolgreich aktiviert."
fi
```

---

## 🔴 Phase 1: Wartungsfenster starten (03:00 Uhr)

### 1. Wartungsseite für Ingress aktivieren (oder BFF kurz anhalten)
```bash
# BFF Container stoppen, um neue Schreiboperationen abzublocken
docker stop groovelab-bff || true
```

### 2. PostgreSQL geordnet und transaktionssicher beenden
```bash
# Sauberen Checkpoint erzwingen vor dem Stop
docker exec -t supabase-db psql -U postgres -c "CHECKPOINT;" || true
docker stop supabase-db
```

---

## ⚡ Phase 2: Datenübertragung auf lokales NVMe (03:02 Uhr)

### 1. High-Speed Blockübertragung mit Erhalt aller Attribute
```bash
# Übertrage PGDATA atomar vom Cloud Volume auf das lokale NVMe
sudo rsync -aHAX --delete --info=progress2 /mnt/cloud-volume/supabase-data/ /var/lib/supabase_nvme/data/
```

### 2. Eigentümerrechte strikt auf Postgres-UID (999:999) setzen
```bash
sudo chown -R 999:999 /var/lib/supabase_nvme/data
sudo chmod 700 /var/lib/supabase_nvme/data
```

---

## 🔧 Phase 3: Docker-Compose Mount & Config umschalten (03:05 Uhr)

### 1. Backup der bestehenden Compose-Datei erstellen
```bash
cp /root/supabase/docker-compose.remote.yml /root/supabase/docker-compose.remote.yml.bak.$(date +%F_%H%M%S)
```

### 2. Mount auf lokales NVMe umbiegen
In `/root/supabase/docker-compose.remote.yml` (bzw. `deploy/docker-compose.production.yml`):
```yaml
    volumes:
      # Alt: - /mnt/cloud-volume/supabase-data:/var/lib/postgresql/data:Z
      # Neu:
      - /var/lib/supabase_nvme/data:/var/lib/postgresql/data:Z
```

### 3. Gehärtete PostgreSQL-Konfiguration einhängen
Sicherstellen, dass die optimierten Parameter (`shared_buffers=512MB`, `effective_cache_size=1536MB`, `work_mem=8MB`) geladen werden.

---

## 🟢 Phase 4: Start & Verifikation (03:07 Uhr)

### 1. Datenbank starten
```bash
cd /root/supabase
docker compose -f docker-compose.remote.yml up -d db
```

### 2. Healthcheck & Verbindungstest abwarten
```bash
# Warten bis DB healthy ist
until docker exec supabase-db pg_isready -U postgres -h localhost >/dev/null 2>&1; do
  echo "Warte auf PostgreSQL Start..."
  sleep 2
done
echo "✓ PostgreSQL auf lokalem NVMe erfolgreich online!"
```

### 3. Datenintegritätsprüfung
```bash
# Zähle Schülerdatensätze zur Verifikation
STUDENT_COUNT=$(docker exec supabase-db psql -U postgres -d postgres -t -A -c "SELECT count(*) FROM students;")
SCHOOL_COUNT=$(docker exec supabase-db psql -U postgres -d postgres -t -A -c "SELECT count(*) FROM schools;")
echo "✓ Verifizierte Datensätze: ${STUDENT_COUNT} Schüler in ${SCHOOL_COUNT} Musikschulen."

# Dateisystem-Mount verifizieren (muss auf dem lokalen Root-Device liegen)
DB_MOUNT=$(df -T /var/lib/supabase_nvme/data | tail -n 1 | awk '{print $1}')
echo "✓ Aktives Speichergerät: ${DB_MOUNT} (Lokales NVMe)"
```

### 4. Alle Begleitdienste starten
```bash
docker compose -f docker-compose.remote.yml up -d
docker start groovelab-bff || true
```

### 5. Abschließender Infrastruktur-Preflight
```bash
sudo bash /root/scripts/infra_preflight.sh
```

---

## 🛟 Phase 5: Notfall-Rollback (Nur bei kritischem Fehler)

Sollte wider Erwarten ein unlösbares Problem auftreten, ist das Original-Volume `/mnt/cloud-volume/supabase-data` **zu 100 % unberührt** vorhanden:

```bash
# 1. DB stoppen
docker stop supabase-db

# 2. Compose-Datei auf Backup zurückrollen
cp /root/supabase/docker-compose.remote.yml.bak.* /root/supabase/docker-compose.remote.yml

# 3. DB wieder vom Cloud-Volume starten
docker compose -f /root/supabase/docker-compose.remote.yml up -d db

# 4. BFF wieder starten
docker start groovelab-bff
```
*Rollback-Dauer:* **< 3 Minuten**.
