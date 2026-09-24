---
name: campus-disaster-recovery
description: >-
  Deterministisches Notfall-Wiederherstellungs-Runbook (RTO <= 45 Min, RPO <= 60 Min)
  für Campus-Groovelab auf Hetzner Cloud. Umfasst Georedundanz (nbg1 -> fsn1),
  Age X25519 Zero-Knowledge Entschlüsselung, Hetzner Storage Box Port 23 Sync,
  DSGVO Art. 17 Tombstone-Reconciliation gegen Zombie-Datensätze und Hetzner DNS API Failover.
---

# 🚨 Campus-Groovelab Disaster Recovery Runbook (BSI DER.4 / ISO 22301)

Verwende diesen Skill bei simulierten oder realen Ausfällen des primären Hetzner-Servers, Datenkorruption oder für forensische Notfall-Drills.

## 0. Notfall-Voraussetzungen (Operator Checklist)
* Hetzner API-Tokens bereitstellen: `HETZNER_DNS_API_TOKEN`, `HCLOUD_TOKEN`.
* Privaten Age X25519-Schlüssel aus dem Offline-Tresor (Bitwarden / Hardware-Key) abrufen: `backup_age_private.key`.
* Hetzner Storage Box Zugriff prüfen (`u664755`, Port 23 via SFTP).

---

## 7-Phasen Notfall-Ablauf

### Phase 1: Neue Node provisionieren (Minuten 0 – 5)
```bash
hcloud server create \
  --name groovelab-dr-recovery \
  --type cpx31 \
  --location fsn1 \
  --image ubuntu-24.04 \
  --ssh-key ops-master-key

export NEW_SERVER_IP="<NEUE_IP_AUS_HCLOUD_OUTPUT>"
```

### Phase 2: Basis-Setup & OS-Härtung (Minuten 5 – 12)
```bash
ssh -o StrictHostKeyChecking=accept-new root@${NEW_SERVER_IP} << 'EOF'
set -euo pipefail
apt update && apt install -y --no-install-recommends \
  docker.io docker-compose-v2 age gzip rsync curl ufw

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

### Phase 3: Age X25519 Secret-Injektion (Minuten 12 – 15)
```bash
scp ~/.secure/backup_age_private.key root@${NEW_SERVER_IP}:/root/backup_age_private.key
ssh root@${NEW_SERVER_IP} "chmod 600 /root/backup_age_private.key"
```

### Phase 4: Storage Box Ingestion & Entschlüsselung (Minuten 15 – 25)
```bash
ssh root@${NEW_SERVER_IP} << 'EOF'
set -euo pipefail
cd /root/recovery

# 1. Download Backup und Integritätssiegel von Storage Box (Port 23)
rsync -avz -e "ssh -p 23 -o StrictHostKeyChecking=accept-new" \
  u664755@u664755.your-storagebox.de:backups/hourly/latest.sql.gz.age .
rsync -avz -e "ssh -p 23 -o StrictHostKeyChecking=accept-new" \
  u664755@u664755.your-storagebox.de:backups/hourly/latest.sql.gz.age.sha256 .

# 2. SHA-256 Integritätsprüfung
sha256sum -c latest.sql.gz.age.sha256

# 3. Asymmetrische Age-Entschlüsselung
age --decrypt -i /root/backup_age_private.key latest.sql.gz.age | gunzip > recovery_dump.sql

# 4. Zero-Knowledge Hygiene: Private Key sofort vernichten!
shred -u /root/backup_age_private.key
EOF
```

### Phase 5: DB-Restore & Art. 17 Tombstone Reconcile (Minuten 25 – 35)
```bash
ssh root@${NEW_SERVER_IP} << 'EOF'
set -euo pipefail

docker run -d \
  --name campus-db-recovery \
  --restart unless-stopped \
  -e POSTGRES_PASSWORD=postgres \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15-alpine

until docker exec campus-db-recovery pg_isready -U postgres; do sleep 1; done

# Dump einspielen (Schema, 501+ Migrationen, RLS, Views)
cat /root/recovery/recovery_dump.sql | docker exec -i campus-db-recovery psql -U postgres

# ⚖️ ZWINGEND: Zombie-Datensätze nach Restore tilgen!
bash /root/scripts/post_restore_reconcile_tombstones.sh

shred -u /root/recovery/recovery_dump.sql
EOF
```

### Phase 6: Application Stack Boot & Health Verification (Minuten 35 – 40)
```bash
ssh root@${NEW_SERVER_IP} << 'EOF'
set -euo pipefail
cd /root/deploy
docker compose -f docker-compose.prod.yml up -d
sleep 5
curl -fsS http://localhost:3000/api/health > /dev/null || (echo "Health check FAILED" && exit 1)
EOF
```

### Phase 7: Hetzner DNS API Failover (Minuten 40 – 42)
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
