# Runbook: Georedundantes Disaster Recovery (BSI DER.4 / ISO 22301)

| Parameter | Spezifikation |
| :--- | :--- |
| **System** | Campus-Groovelab Core Engine & Database Layer |
| **RPO (Recovery Point Objective)** | $\le$ 60 Minuten (Stündliche Dumps + WORM Tombstones) |
| **RTO (Recovery Time Objective)** | $\le$ 45 Minuten (Kaltstart auf georedundanter Node) |
| **Verschlüsselung** | Asymmetrisch via Age X25519 (`age1upgwe...`) |
| **Sicherheitsniveau** | Zero-Knowledge Primary Server / No Server-Side Private Key |
| **Ziel-Rechenzentrum** | Primär: Nürnberg (`nbg1`) $\rightarrow$ Failover: Falkenstein (`fsn1`) |

---

## 0. Notfall-Voraussetzungen (Operator Checklist)

Vor Beginn sicherstellen:
* [ ] Zugriff auf Hetzner Cloud Console & API-Token (`HETZNER_DNS_API_TOKEN`, `HCLOUD_TOKEN`).
* [ ] Hardware-Token / Bitwarden-Tresor entsperrt für Zugriff auf privaten Age-Schlüssel (`backup_age_private.key`).
* [ ] Zugangsdaten für Hetzner Storage Box (`u664755`, Sub-Account Port 23 SFTP).

---

## Phase 1: Georedundante Node provisionieren (Minuten 0 – 5)

Einen neuen Cloud-Server im alternativen Rechenzentrum Falkenstein (`fsn1`) starten:

```bash
hcloud server create \
  --name groovelab-dr-recovery \
  --type cpx31 \
  --location fsn1 \
  --image ubuntu-24.04 \
  --ssh-key ops-master-key
```

Temporäre IP in der lokalen Shell des Operators exportieren:

```bash
export NEW_SERVER_IP="<NEUE_IP_AUS_HCLOUD_OUTPUT>"
```

---

## Phase 2: Basis-Setup & OS-Härtung (Minuten 5 – 12)

Die Ziel-Node minimal bootstrappen:

```bash
ssh -o StrictHostKeyChecking=accept-new root@${NEW_SERVER_IP} << 'EOF'
set -euo pipefail
apt update && apt install -y --no-install-recommends \
  docker.io docker-compose-v2 age gzip rsync curl ufw

# UFW Minimal-Härtung (SSH + HTTP/HTTPS)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable --now docker
mkdir -p /root/recovery /root/scripts /root/deploy
EOF
```

---

## Phase 3: Age X25519 Secret-Injektion (Minuten 12 – 15)

Den privaten Schlüssel aus dem lokalen Offline-Tresor übertragen (bleibt niemals dauerhaft auf Storage Box oder Repositories):

```bash
scp ~/.secure/backup_age_private.key root@${NEW_SERVER_IP}:/root/backup_age_private.key
ssh root@${NEW_SERVER_IP} "chmod 600 /root/backup_age_private.key"
```

---

## Phase 4: Storage Box Ingestion & Entschlüsselung (Minuten 15 – 25)

Backup-Dump und SHA-256 Integritätssiegel über Port 23 (SFTP/rsync) ziehen und verifizieren:

```bash
ssh root@${NEW_SERVER_IP} << 'EOF'
set -euo pipefail
cd /root/recovery

# 1. Download Backup und Integritätssiegel
rsync -avz -e "ssh -p 23 -o StrictHostKeyChecking=accept-new" \
  u664755@u664755.your-storagebox.de:backups/hourly/latest.sql.gz.age .
rsync -avz -e "ssh -p 23 -o StrictHostKeyChecking=accept-new" \
  u664755@u664755.your-storagebox.de:backups/hourly/latest.sql.gz.age.sha256 .

# 2. Kryptografische Integritätsprüfung
sha256sum -c latest.sql.gz.age.sha256

# 3. Asymmetrische Entschlüsselung & Dekompression
age --decrypt -i /root/backup_age_private.key latest.sql.gz.age | gunzip > recovery_dump.sql

# 4. Privaten Schlüssel nach Entschlüsselung sofort vom Server tilgen
shred -u /root/backup_age_private.key
EOF
```

---

## Phase 5: DB-Restore & Art. 17 Tombstone Reconcile (Minuten 25 – 35)

Postgres hochfahren, Dump restlos importieren und anschließend das Löschregister synchronisieren, um Zombie-Datensätze gelöschter Minderjähriger auszuschließen:

```bash
ssh root@${NEW_SERVER_IP} << 'EOF'
set -euo pipefail

# 1. Isolierte DB-Instanz starten
docker run -d \
  --name campus-db-recovery \
  --restart unless-stopped \
  -e POSTGRES_PASSWORD=postgres \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15-alpine

until docker exec campus-db-recovery pg_isready -U postgres; do
  sleep 1
done

# 2. Dump einspielen (Schema, 501 Migrationen, RLS, Views)
cat /root/recovery/recovery_dump.sql | docker exec -i campus-db-recovery psql -U postgres

# 3. Tombstone-Scrubbing gegen Zombie-Datensätze (DSGVO Art. 17)
# Zieht das WORM-Löschregister von der Storage Box und bereinigt kaskadierend
bash /root/scripts/post_restore_reconcile_tombstones.sh

# 4. Bereinigen des Dumps im Filesystem
shred -u /root/recovery/recovery_dump.sql
EOF
```

---

## Phase 6: Application Stack Boot & Health Verification (Minuten 35 – 40)

Nginx mit Post-Quantum Hybrid TLS (`X25519MLKEM768`), Express BFF-Server und Web-App starten:

```bash
ssh root@${NEW_SERVER_IP} << 'EOF'
set -euo pipefail
cd /root/deploy
docker compose -f docker-compose.prod.yml up -d

# Smoke-Check auf den lokalen BFF- und Health-Endpunkten
sleep 5
curl -fsS http://localhost:3000/api/health > /dev/null || (echo "Health check FAILED" && exit 1)
EOF
```

---

## Phase 7: Hetzner DNS API Failover (Minuten 40 – 42)

Routing auf die neue georedundante Node umstellen:

```bash
curl -X "PUT" "https://dns.hetzner.com/api/v1/records/${RECORD_ID}" \
     -H 'Content-Type: application/json' \
     -H "Auth-API-Token: ${HETZNER_DNS_API_TOKEN}" \
     -d "{
       \"value\": \"${NEW_SERVER_IP}\",
       \"ttl\": 300,
       \"type\": \"A\",
       \"name\": \"@\",
       \"zone_id\": \"${ZONE_ID}\"
     }"
```

---

## Post-Mortem & Audit-Protokoll

Nach erfolgreichem Failover ist innerhalb von 24 Stunden folgendes BSI DER.4 konformes Incident-Dokument auszufüllen:
1. Tatsächliche RTO / RPO Werte dokumentieren.
2. Anzahl der reconcilierten DSGVO Art. 17 Tombstones festhalten.
3. Altes Subsystem forensisch sichern (dd-Image der NVMe) zur Klärung der Ausfallursache.
