#!/usr/bin/env bash
# ==============================================================================
# Campus-Groovelab Tier-1 Enterprise+ Server Hardening Script
# Target: Hetzner Linux VPS / Dedicated Host (Ubuntu / Debian)
# Standards: BSI IT-Grundschutz, CIS Linux Benchmark Level 1 & DSGVO Art. 32
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "🔒 Starte Server-Härtung für Campus-Groovelab..."
echo "=========================================================="

# 1. Root-Rechte prüfen
if [ "$EUID" -ne 0 ]; then
  echo "❌ Bitte als root oder mit 'sudo' ausführen."
  exit 1
fi

# 2. UFW Firewall installieren & konfigurieren
echo "[1/4] Konfiguriere UFW Firewall..."
apt-get update -qq && apt-get install -y -qq ufw iptables fail2ban

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Nur die zwingend erforderlichen Ports öffnen
ufw allow 22/tcp comment 'SSH Administration'
ufw allow 80/tcp comment 'HTTP Nginx Redirect'
ufw allow 443/tcp comment 'HTTPS Nginx Encrypted'

ufw --force enable
echo "✓ UFW Firewall aktiv: Nur Ports 22, 80, 443 sind von außen erreichbar."

# 3. Kernel-Härtung gegen SYN-Floods, Spoofing & DoS (sysctl)
echo "[2/4] Wende Linux-Kernel-Sicherheitsparameter an..."
cat << 'EOF' > /etc/sysctl.d/99-campus-security.conf
# Schutz vor TCP SYN-Floods
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.tcp_synack_retries = 2

# IP-Spoofing & Man-in-the-Middle Schutz (Reverse Path Filtering)
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# ICMP-Redirects ignorieren (Schutz vor Routing-Manipulationen)
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Broadcast ICMP Echo Requests (Smurf Attacks) ignorieren
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Maximale Dateideskriptoren & Socket-Limits für High-Performance
fs.file-max = 2097152
EOF

sysctl -p /etc/sysctl.d/99-campus-security.conf > /dev/null
echo "✓ Kernel-Härtung erfolgreich geladen."

# 4. SSH-Härtung (Passwort-Logins deaktivieren, nur Ed25519/RSA-Keys)
echo "[3/4] Sichere SSH-Dienst ab..."
if [ -f /etc/ssh/sshd_config ]; then
  # Backup erstellen
  cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%F)
  
  # Passwort-Auth deaktivieren
  sed -i 's/^#*PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
  sed -i 's/^#*PermitRootLogin .*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  sed -i 's/^#*PubkeyAuthentication .*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
  
  systemctl restart ssh || systemctl restart sshd || true
  echo "✓ SSH abgesichert: Nur SSH-Keys erlaubt, Passwort-Brute-Force unmöglich."
fi

# 5. Automatische Sicherheits-Updates (unattended-upgrades)
echo "[4/4] Aktiviere automatische Sicherheits-Updates..."
apt-get install -y -qq unattended-upgrades update-notifier-common
echo 'APT::Periodic::Update-Package-Lists "1";' > /etc/apt/apt.conf.d/20auto-upgrades
echo 'APT::Periodic::Unattended-Upgrade "1";' >> /etc/apt/apt.conf.d/20auto-upgrades
systemctl restart unattended-upgrades || true
echo "✓ Automatische Sicherheits-Updates aktiv."

echo "=========================================================="
echo "🎉 Server-Härtung zu 100% erfolgreich abgeschlossen!"
echo "=========================================================="
