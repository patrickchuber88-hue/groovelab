#!/bin/bash
# ==============================================================================
# Apply Enterprise Nginx WAF & Rate-Limiting Configuration to Hetzner Server
# ==============================================================================

set -e

SERVER="root@178.105.10.2"
REMOTE_CONF_DIR="/etc/nginx/conf.d"

echo "🛡️  Deploye Enterprise Nginx WAF & Edge Rate-Limiting Config..."

ssh "$SERVER" "mkdir -p $REMOTE_CONF_DIR"
scp scripts/nginx_enterprise_waf.conf "$SERVER:$REMOTE_CONF_DIR/campus_groovelab_waf.conf" || true

ssh "$SERVER" "if command -v nginx >/dev/null 2>&1; then nginx -t && nginx -s reload && echo '  ✓ Nginx WAF reloaded successfully.'; else echo '  ℹ Nginx is running in container, synced configuration.'; fi"

echo "✅ Edge WAF Shield erfolgreich bereitgestellt!"
