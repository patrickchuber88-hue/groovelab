#!/usr/bin/env bash
# ==============================================================================
# 🛡️ Campus-Groovelab Tier-1 Ingress Deployer
# Purpose: Sync Nginx site configs to Hetzner server and reload safely.
# Standards: OWASP ASVS Level 3 / Fail-Closed
# ==============================================================================

set -euo pipefail

SERVER="${SERVER:-root@178.105.10.2}"
REMOTE_AVAIL="/etc/nginx/sites-available"
REMOTE_ENAB="/etc/nginx/sites-enabled"

echo "🛡️  Deploye Nginx Ingress Konfigurationen..."
echo "   Ziel: $SERVER"

# 1. Sicherstellen, dass Verzeichnisse auf dem Server existieren
ssh "$SERVER" "mkdir -p $REMOTE_AVAIL $REMOTE_ENAB /var/www/certbot /var/www/groovelab"

# 2. Synchronisiere Site-Konfigurationen
scp deploy/nginx/campus-groovelab.de.conf "$SERVER:$REMOTE_AVAIL/"
scp deploy/nginx/supabase.campus-groovelab.de.conf "$SERVER:$REMOTE_AVAIL/"

# 3. Verknüpfen & Testen
ssh "$SERVER" "
  ln -sf $REMOTE_AVAIL/campus-groovelab.de.conf $REMOTE_ENAB/
  ln -sf $REMOTE_AVAIL/supabase.campus-groovelab.de.conf $REMOTE_ENAB/
  if command -v nginx >/dev/null 2>&1; then
    nginx -t && systemctl reload nginx && echo '  ✓ Nginx Ingress erfolgreich validiert und neu geladen.'
  else
    echo '  ℹ Hinweis: Host-Nginx noch nicht aktiv. Konfigurationsdateien bereitgestellt.'
  fi
"

echo "✅ Ingress-Konfigurationen erfolgreich synchronisiert!"
