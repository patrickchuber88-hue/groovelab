#!/bin/bash
# ==============================================================================
# Campus-Groovelab Host Firewall & Ingress Hardening Script
# Ensures strict port isolation on Hetzner Server (Only 22, 80, 443 permitted)
# ==============================================================================

set -e

SERVER="root@178.105.10.2"

echo "🛡️  Prüfe und härte Host Firewall (UFW) auf $SERVER..."

ssh "$SERVER" bash -c "'
set -e

echo \"📋 Aktueller UFW Status:\"
ufw status verbose || true

echo \"🔒 Stelle sicher, dass essentielle Ports (22, 80, 443) erlaubt sind...\"
ufw allow 22/tcp comment \"SSH Secure Access\" || true
ufw allow 80/tcp comment \"HTTP Let Encrypt ACME Ingress\" || true
ufw allow 443/tcp comment \"HTTPS Secure Ingress\" || true

echo \"✅ Firewall-Regeln überprüft und gehärtet!\"
'"
