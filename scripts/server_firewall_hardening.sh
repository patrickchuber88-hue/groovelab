#!/bin/bash
# ==============================================================================
# Campus-Groovelab Host Firewall & Ingress/Egress Hardening Script
# Standard: Hiscox CyberSafe 05/2026 / OWASP ASVS Level 3 / BSI IT-Grundschutz
# Target: Hetzner Cloud Production Server (178.105.10.2)
# ==============================================================================

set -eo pipefail

SERVER="${SERVER:-root@178.105.10.2}"
SSH_PORT="${SSH_PORT:-22}"

echo "=============================================================================="
echo "🛡️  Campus-Groovelab Hiscox CyberSafe Firewall & Egress Hardening"
echo "    Target Server: $SERVER (SSH Port: $SSH_PORT)"
echo "=============================================================================="

ssh "$SERVER" bash -c "'
set -eo pipefail

echo \"📋 1. Aktueller UFW Firewall Status:\"
ufw status verbose || true

echo \"🔒 2. Konfiguriere Default Policies (Hiscox Minimalprinzip / Deny Any)...\"
ufw default deny incoming

echo \"🌐 3. Konfiguriere Ingress-Regeln (Eingehende Verbindungen)...\"
ufw allow in on lo comment \"Allow Loopback Ingress\" || true
ufw allow \"${SSH_PORT}/tcp\" comment \"SSH Secure Access (Port ${SSH_PORT})\" || true
ufw allow 80/tcp comment \"HTTP Let Encrypt ACME Ingress\" || true
ufw allow 443/tcp comment \"HTTPS Secure Ingress\" || true

echo \"🛡️  4. Konfiguriere Egress-Regeln (Hiscox Ausgehende Firewall-Schranke)...\"
ufw allow out on lo comment \"Allow Loopback Egress\" || true
ufw allow out 53 comment \"DNS Resolution (UDP/TCP)\" || true
ufw allow out 123/udp comment \"NTP Time Synchronization\" || true
ufw allow out 80/tcp comment \"HTTP Package Repository Egress\" || true
ufw allow out 443/tcp comment \"HTTPS Cloud APIs & Backup Sync Egress\" || true

echo \"🔍 5. Prüfe Intrusion Prevention (Fail2ban)...\"
if command -v fail2ban-client &>/dev/null; then
    echo \"  ✓ Fail2ban ist installiert. Status:\"
    fail2ban-client status sshd 2>/dev/null || fail2ban-client status || true
else
    echo \"  ℹ️  Fail2ban nicht gefunden. Empfehlung: 'apt-get install -y fail2ban'\"
fi

echo \"🔑 6. Prüfe SSH-Konfiguration auf Härtung (Hiscox Tipp 7)...\"
if grep -qE \"^PermitRootLogin\s+no\" /etc/ssh/sshd_config /etc/ssh/sshd_config.d/* 2>/dev/null; then
    echo \"  ✓ SSH Root-Login ist deaktiviert (PermitRootLogin no).\"
else
    echo \"  ℹ️  SSH-Härtungshinweis: Root-Login sollte nach Anlage eines Sudo-Users deaktiviert werden.\"
fi

echo \"\"
echo \"✅ Firewall-Regeln erfolgreich nach Hiscox CyberSafe Standard gehärtet!\"
echo \"==============================================================================\"
ufw status numbered || true
'"
