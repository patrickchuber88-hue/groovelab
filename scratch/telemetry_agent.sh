#!/bin/bash
# 📊 GrooveLab Server Telemetry Daemon
# Sammelt Systemleistungsdaten auf dem Hetzner-Host und speichert sie in PostgreSQL.

# 1. CPU-Last (1-Minuten Load Average) ermitteln
CPU_LOAD=$(cat /proc/loadavg | awk '{print $1}')

# 2. RAM-Speicherwerte in MB ermitteln
MEM_INFO=$(free -m)
MEM_TOTAL=$(echo "$MEM_INFO" | grep "Mem:" | awk '{print $2}')
MEM_USED=$(echo "$MEM_INFO" | grep "Mem:" | awk '{print $3}')
SWAP_USED=$(echo "$MEM_INFO" | grep "Swap:" | awk '{print $3}')

# Fallbacks falls leer
CPU_LOAD=${CPU_LOAD:-0.0}
MEM_TOTAL=${MEM_TOTAL:-0}
MEM_USED=${MEM_USED:-0}
SWAP_USED=${SWAP_USED:-0}

# 3. Disk-Speicherwerte ermitteln (in GB als float)
DISK_TOTAL=$(df -k / | tail -1 | awk '{printf "%.2f", $2 / 1024 / 1024}')
DISK_USED=$(df -k / | tail -1 | awk '{printf "%.2f", $3 / 1024 / 1024}')
VOL_TOTAL=$(df -k /mnt/HC_Volume_105951580 | tail -1 | awk '{printf "%.2f", $2 / 1024 / 1024}')
VOL_USED=$(df -k /mnt/HC_Volume_105951580 | tail -1 | awk '{printf "%.2f", $3 / 1024 / 1024}')

DISK_TOTAL=${DISK_TOTAL:-40.00}
DISK_USED=${DISK_USED:-18.00}
VOL_TOTAL=${VOL_TOTAL:-14.00}
VOL_USED=${VOL_USED:-2.10}

# 4. Aktive DB-Verbindungen zählen
DB_CONN=$(docker exec -i supabase-db psql -U postgres -d postgres -t -A -c "SELECT count(*) FROM pg_stat_activity;")
DB_CONN=${DB_CONN:-0}

# 5. In die Tabelle server_metrics einfügen und alte Daten aufräumen
docker exec -i supabase-db psql -U postgres -d postgres -c "
  INSERT INTO public.server_metrics (
    cpu_load, mem_used_mb, mem_total_mb, swap_used_mb, active_connections,
    disk_used_gb, disk_total_gb, volume_used_gb, volume_total_gb
  )
  VALUES (
    $CPU_LOAD, $MEM_USED, $MEM_TOTAL, $SWAP_USED, $DB_CONN,
    $DISK_USED, $DISK_TOTAL, $VOL_USED, $VOL_TOTAL
  );
  
  -- Datenbereinigung: Daten älter als 7 Tage löschen
  DELETE FROM public.server_metrics WHERE created_at < now() - INTERVAL '7 days';
  
  -- Datenbereinigung: Audit-Logs älter als 30 Tage löschen (Datensparsamkeit)
  DELETE FROM public.audit_logs WHERE created_at < now() - INTERVAL '30 days';
" > /dev/null 2>&1
