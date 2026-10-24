#!/bin/bash
# ==============================================================================
# 🛰️ Campus-Groovelab Server Health & Telemetry Watchdog
# Platform: Campus-Groovelab (https://campus-groovelab.de)
# Location on Server: /root/scripts/server_health_watchdog.sh
# Crontab: */5 * * * * /bin/bash /root/scripts/server_health_watchdog.sh >> /var/log/campus_health_watchdog.log 2>&1
# ==============================================================================

set -eo pipefail

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
HOSTNAME=$(hostname)
ALERT_TRIGGERED=0
ALERT_MESSAGES=()

# Load optional external alert configuration (e.g. webhook URL)
if [ -f "/root/.campus_alert_config" ]; then
  # shellcheck disable=SC1091
  source "/root/.campus_alert_config"
fi

echo "=============================================================================="
echo "🛰️  [$TIMESTAMP] Campus-Groovelab Health Watchdog gestartet auf $HOSTNAME..."
echo "=============================================================================="

# 1. Disk Space Verification (Root SSD & /mnt/supabase_data Volume)
check_disk() {
  local mount_point="$1"
  local threshold="${2:-85}"
  
  if df -h "$mount_point" >/dev/null 2>&1; then
    local usage
    usage=$(df "$mount_point" | awk 'NR==2 {print $5}' | tr -d '%')
    if [ "$usage" -ge "$threshold" ]; then
      echo "⚠️  WARNUNG: Speicherplatz auf '$mount_point' bei ${usage}% (Schwellenwert: ${threshold}%)!"
      ALERT_TRIGGERED=1
      ALERT_MESSAGES+=("Disk usage on $mount_point is ${usage}% (>= ${threshold}%)")
    else
      echo "  ✓ Speicherplatz '$mount_point': ${usage}% belegt (OK)"
    fi
  else
    echo "  ℹ Mount-Point '$mount_point' nicht vorhanden, überspringe."
  fi
}

check_disk "/" 85
check_disk "/mnt/supabase_data" 85

# 2. RAM / Memory Usage Check
MEM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
MEM_USED=$(free -m | awk '/Mem:/ {print $3}')
if [ "$MEM_TOTAL" -gt 0 ]; then
  MEM_PERCENT=$(( MEM_USED * 100 / MEM_TOTAL ))
  if [ "$MEM_PERCENT" -ge 90 ]; then
    echo "⚠️  WARNUNG: RAM-Auslastung bei ${MEM_PERCENT}% (${MEM_USED}MB von ${MEM_TOTAL}MB)!"
    ALERT_TRIGGERED=1
    ALERT_MESSAGES+=("High Memory Usage: ${MEM_PERCENT}% (${MEM_USED}MB / ${MEM_TOTAL}MB)")
  else
    echo "  ✓ RAM-Auslastung: ${MEM_PERCENT}% (${MEM_USED}MB / ${MEM_TOTAL}MB) (OK)"
  fi
fi

# 3. Docker Container & Host Ingress Health Check
if command -v docker >/dev/null 2>&1; then
  RUNNING_CONTAINERS=$(docker ps --format '{{.Names}}')
  
  # Check for PostgreSQL container
  if echo "$RUNNING_CONTAINERS" | grep -qE 'supabase-db|postgres'; then
    echo "  ✓ PostgreSQL/Supabase DB-Container aktiv (OK)"
  else
    echo "❌ FEHLER: Kein PostgreSQL DB-Container aktiv!"
    ALERT_TRIGGERED=1
    ALERT_MESSAGES+=("CRITICAL: Database container is down!")
  fi

  # Check for BFF & Kong Gateway containers
  if echo "$RUNNING_CONTAINERS" | grep -qE 'groovelab-bff' && echo "$RUNNING_CONTAINERS" | grep -qE 'supabase-kong'; then
    echo "  ✓ BFF & Supabase Kong Gateway-Container aktiv (OK)"
  else
    echo "⚠️  WARNUNG: BFF oder Supabase Kong Container nicht aktiv!"
    ALERT_TRIGGERED=1
    ALERT_MESSAGES+=("Warning: BFF or Supabase Kong container is not running!")
  fi
fi

# 3b. Host Nginx Ingress & L7 Health Probe (Self-Healing)
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files nginx.service >/dev/null 2>&1; then
  if systemctl is-active --quiet nginx; then
    echo "  ✓ Host Nginx Ingress (nginx.service) aktiv (OK)"
  else
    echo "🚨 KRITISCH: Host Nginx Ingress (nginx.service) ist INAKTIV! Starte Self-Healing..."
    ALERT_TRIGGERED=1
    if /usr/sbin/nginx -t >/dev/null 2>&1 && systemctl restart nginx; then
      echo "  ✓ Self-Healing erfolgreich: nginx.service wurde automatisch neu gestartet."
      ALERT_MESSAGES+=("SELF-HEALED: Host nginx.service was down and automatically restarted.")
    else
      echo "❌ FEHLER: Self-Healing für nginx.service fehlgeschlagen (nginx -t oder restart Error)!"
      ALERT_MESSAGES+=("CRITICAL: Host nginx.service is down and automatic restart failed!")
    fi
  fi

  # L7 HTTPS Loopback Health Probe
  HTTP_HEALTH=$(curl -ksS -o /dev/null -w "%{http_code}" --max-time 5 --resolve "campus-groovelab.de:443:127.0.0.1" https://campus-groovelab.de/healthz 2>/dev/null || echo "000")
  if [ "$HTTP_HEALTH" = "200" ]; then
    echo "  ✓ L7 HTTPS Loopback Probe (/healthz): HTTP 200 (OK)"
  else
    echo "❌ FEHLER: L7 HTTPS Loopback Probe (/healthz) lieferte HTTP $HTTP_HEALTH!"
    ALERT_TRIGGERED=1
    ALERT_MESSAGES+=("CRITICAL: L7 HTTPS probe to https://campus-groovelab.de/healthz returned HTTP $HTTP_HEALTH")
  fi
fi

# 4. SSL Certificate Expiration Check
DOMAIN="campus-groovelab.de"
CERT_FILE="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
if [ -f "$CERT_FILE" ]; then
  EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
  EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null || true)
  NOW_EPOCH=$(date +%s)
  
  if [ -n "$EXPIRY_EPOCH" ]; then
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
    if [ "$DAYS_LEFT" -le 14 ]; then
      echo "⚠️  WARNUNG: SSL-Zertifikat für $DOMAIN läuft in $DAYS_LEFT Tagen ab!"
      ALERT_TRIGGERED=1
      ALERT_MESSAGES+=("SSL Certificate for $DOMAIN expires in $DAYS_LEFT days!")
    else
      echo "  ✓ SSL-Zertifikat für $DOMAIN gültig für $DAYS_LEFT Tage (OK)"
    fi
  fi
fi

# 5. Dispatch Alert Notification (if Webhook configured)
if [ "$ALERT_TRIGGERED" -eq 1 ] && [ -n "${ALERT_WEBHOOK_URL:-}" ]; then
  echo "🚨 Sende Alert an Webhook..."
  PAYLOAD=$(printf '%s\n' "${ALERT_MESSAGES[@]}" | jq -R . | jq -s .)
  curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"text\": \"🚨 [Campus-Groovelab Alert] Host: $HOSTNAME\nIssues:\n$(printf '%s\n' "${ALERT_MESSAGES[@]}")\"}" \
    "$ALERT_WEBHOOK_URL" || true
fi

echo "=============================================================================="
if [ "$ALERT_TRIGGERED" -eq 0 ]; then
  echo "✅ [$TIMESTAMP] Alle Server-Systeme im optimalen Enterprise+ Zustand."
else
  echo "⚠️  [$TIMESTAMP] Watchdog hat Warnungen/Fehler registriert!"
fi
echo "=============================================================================="
