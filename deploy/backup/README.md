# 🛡️ Campus-Groovelab Backup- & Notfallwiederherstellungs-Suite

Diese Suite implementiert die automatische, AES-256-verschlüsselte Datenbanksicherung nach **BSI IT-Grundschutz** und **DSGVO Art. 32**.

## 1. Installation auf dem Hetzner-Server

```bash
# 1. Backup-Skript kopieren und ausführbar machen
sudo cp deploy/backup/backup_campus_db.sh /usr/local/bin/backup_campus_db.sh
sudo chmod +x /usr/local/bin/backup_campus_db.sh

# 2. Cronjob einrichten (jeden Tag um 03:00 Uhr)
sudo crontab -l | cat - deploy/backup/campus_backup.cron | sudo crontab -

# 3. Test-Lauf durchführen
sudo /usr/local/bin/backup_campus_db.sh
```

## 2. Notfall-Wiederherstellung (Disaster Recovery / Restore)

Falls die Datenbank aus einem verschlüsselten Backup wiederhergestellt werden soll:

```bash
# 1. Backup entschlüsseln
gpg -d dump_20260830_030000.sql.gz.gpg > restored.sql.gz

# 2. Entpacken
gunzip restored.sql.gz

# 3. In die PostgreSQL-Datenbank einspielen
cat restored.sql | docker exec -i supabase-db psql -U postgres postgres
```
