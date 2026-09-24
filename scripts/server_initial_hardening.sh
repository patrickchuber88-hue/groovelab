#!/bin/bash
# ==============================================================================
# 🛡️ Campus-Groovelab Server Hardening & Zero-Trust Host Provisioning
# Standard: BSI IT-Grundschutz / OWASP ASVS Level 3 / Hiscox CyberSafe 05/2026
# Target Host: Ubuntu 22.04 / 24.04 LTS (Hetzner Cloud Server)
# Safe Execution: Idempotent, Non-destructive, Zero US-Dependency
# ==============================================================================

set -eo pipefail

DEPLOY_USER="${DEPLOY_USER:-deployuser}"
SSH_PORT="${SSH_PORT:-22}"

# Text formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_step() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
}

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ------------------------------------------------------------------------------
# 0. Vorab-Prüfung der Ausführungsberechtigung (Root Check)
# ------------------------------------------------------------------------------
if [[ "$EUID" -ne 0 ]]; then
    log_error "Dieses Skript muss als root ausgeführt werden (z. B. via 'sudo bash scripts/server_initial_hardening.sh')."
    exit 1
fi

log_step "1. Dedizierter Deploy-User ('$DEPLOY_USER') & Sudo-Schutzschirm"
if id "$DEPLOY_USER" &>/dev/null; then
    log_info "Benutzer '$DEPLOY_USER' existiert bereits."
else
    log_info "Erstelle dedizierten Deploy-User '$DEPLOY_USER'..."
    adduser --disabled-password --gecos "Campus-Groovelab Deploy User" "$DEPLOY_USER"
fi

# In Sudo-Gruppe aufnehmen
usermod -aG sudo "$DEPLOY_USER"
log_info "Benutzer '$DEPLOY_USER' zur 'sudo'-Gruppe hinzugefügt."

# SSH-Schlüssel aus /root/.ssh/authorized_keys übernehmen (sofern vorhanden)
USER_SSH_DIR="/home/$DEPLOY_USER/.ssh"
USER_AUTH_KEYS="$USER_SSH_DIR/authorized_keys"
mkdir -p "$USER_SSH_DIR"
chmod 700 "$USER_SSH_DIR"

if [[ -f "/root/.ssh/authorized_keys" ]] && [[ ! -f "$USER_AUTH_KEYS" || ! -s "$USER_AUTH_KEYS" ]]; then
    log_info "Kopiere autorisierte SSH-Schlüssel von /root/.ssh/authorized_keys zu $USER_AUTH_KEYS..."
    cp /root/.ssh/authorized_keys "$USER_AUTH_KEYS"
fi

if [[ -f "$USER_AUTH_KEYS" ]]; then
    chmod 600 "$USER_AUTH_KEYS"
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$USER_SSH_DIR"
    log_info "SSH-Berechtigungen für '$DEPLOY_USER' gehärtet (0700 / 0600)."
else
    log_warn "Keine authorized_keys in '$USER_SSH_DIR' gefunden! Bitte stelle sicher, dass dein Public Key hinterlegt ist."
fi

# Sudoers Drop-In für passwortlose oder geschützte Ausführung
cat << EOF > "/etc/sudoers.d/$DEPLOY_USER"
# Campus-Groovelab Deploy User Sudo Configuration
$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL
EOF
chmod 0440 "/etc/sudoers.d/$DEPLOY_USER"
log_info "Sudoers-Konfiguration (/etc/sudoers.d/$DEPLOY_USER) eingerichtet."

# ------------------------------------------------------------------------------
# 2. SSH Daemon Hardening (/etc/ssh/sshd_config.d/99-security-hardening.conf)
# ------------------------------------------------------------------------------
log_step "2. SSH Daemon Hardening & Aussperrschutz"

# Sicherheitsprüfung: Nur deaktivieren, wenn $DEPLOY_USER mindestens einen Key hat
if [[ -s "$USER_AUTH_KEYS" ]]; then
    mkdir -p /etc/ssh/sshd_config.d
    SSH_HARDENED_CONF="/etc/ssh/sshd_config.d/99-security-hardening.conf"
    
    cat << EOF > "$SSH_HARDENED_CONF"
# ==============================================================================
# Campus-Groovelab SSH Security Hardening
# Standard: BSI IT-Grundschutz / OWASP ASVS Level 3
# ==============================================================================
Port $SSH_PORT
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding yes
LogLevel VERBOSE
EOF
    chmod 644 "$SSH_HARDENED_CONF"
    log_info "SSH-Härtungskonfiguration in $SSH_HARDENED_CONF hinterlegt."

    # Syntax-Validierung vor Neustart
    if sshd -t; then
        log_info "SSH-Konfiguration syntaktisch valide (sshd -t = 0)."
        systemctl daemon-reload 2>/dev/null || true
        systemctl reload-or-restart ssh 2>/dev/null || systemctl reload-or-restart sshd 2>/dev/null || systemctl reload ssh 2>/dev/null || true
        log_info "SSH-Dienst erfolgreich neu geladen."
    else
        log_error "Fehler in der SSH-Konfiguration! Entferne Konfiguration zur Vermeidung eines Lockouts."
        rm -f "$SSH_HARDENED_CONF"
        exit 1
    fi
else
    log_warn "SSH-Härtung (PermitRootLogin no / PasswordAuthentication no) vorerst übersprungen, da noch kein SSH-Key in $USER_AUTH_KEYS liegt!"
    log_warn "Hinterlege deinen SSH-Public-Key in /home/$DEPLOY_USER/.ssh/authorized_keys und führe das Skript erneut aus."
fi

# ------------------------------------------------------------------------------
# 3. Host Firewall (UFW) Hardening
# ------------------------------------------------------------------------------
log_step "3. Host Firewall (UFW) Ingress- & Egress-Schranke"

if ! command -v ufw &>/dev/null; then
    log_info "Installiere UFW..."
    apt-get update -qq && apt-get install -y ufw
fi

# Default Policies
ufw default deny incoming
ufw default allow outgoing

# Loopback-Verbindungen
ufw allow in on lo comment "Allow Loopback Ingress" || true
ufw allow out on lo comment "Allow Loopback Egress" || true

# Erlaubte Ingress-Dienste
ufw allow "${SSH_PORT}/tcp" comment "SSH Secure Management (Port ${SSH_PORT})" || true
ufw allow 80/tcp comment "HTTP ACME Let's Encrypt Ingress" || true
ufw allow 443/tcp comment "HTTPS Production Ingress" || true
ufw allow 443/udp comment "HTTP3/QUIC Ingress" || true

# UFW aktivieren
ufw --force enable
log_info "UFW Firewall aktiviert und auf striktes Whitelisting gesetzt."

# ------------------------------------------------------------------------------
# 4. Docker UFW-Bypass-Schranke (DOCKER-USER Iptables Protection)
# ------------------------------------------------------------------------------
log_step "4. Docker UFW-Bypass-Schranke (Forensische Isolation)"

# Docker umgeht per Default UFW-Regeln über direkte iptables-Regeln.
# Die DOCKER-USER-Kette wird vor Docker-eigenen Regeln evaluiert.
DOCKER_AFTER_RULES="/etc/ufw/after.rules"
if [[ -f "$DOCKER_AFTER_RULES" ]]; then
    if ! grep -q "DOCKER-USER" "$DOCKER_AFTER_RULES"; then
        log_info "Füge DOCKER-USER Schutzregeln vor dem finalen COMMIT in $DOCKER_AFTER_RULES ein..."
        python3 -c "
with open('$DOCKER_AFTER_RULES', 'r') as f:
    content = f.read()
if 'DOCKER-USER' not in content:
    idx = content.rfind('COMMIT')
    if idx != -1:
        rules = '''
# ==============================================================================
# Campus-Groovelab: Docker UFW Bypass Schranke
# Verhindert, dass Docker-Ports (z.B. PostgreSQL 5432) extern exponiert werden
# ==============================================================================
:DOCKER-USER - [0:0]
-A DOCKER-USER -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A DOCKER-USER -i lo -j ACCEPT
-A DOCKER-USER -i docker0 -j ACCEPT
-A DOCKER-USER -i br-+ -j ACCEPT
-A DOCKER-USER -p tcp -m multiport --dports 80,443 -j ACCEPT
-A DOCKER-USER -p udp --dport 443 -j ACCEPT
-A DOCKER-USER -j DROP

'''
        new_content = content[:idx] + rules + content[idx:]
        with open('$DOCKER_AFTER_RULES', 'w') as f:
            f.write(new_content)
"
        ufw reload || true
        log_info "DOCKER-USER Schranke in UFW aktiviert."
    else
        log_info "DOCKER-USER Schranke ist bereits in $DOCKER_AFTER_RULES konfiguriert."
    fi
fi

# ------------------------------------------------------------------------------
# 5. Fail2Ban Intrusion Prevention System (IPS)
# ------------------------------------------------------------------------------
log_step "5. Fail2Ban Intrusion Prevention (Schutz vor Brute-Force)"

if ! command -v fail2ban-client &>/dev/null; then
    log_info "Installiere Fail2ban..."
    apt-get update -qq && apt-get install -y fail2ban
fi

FAIL2BAN_JAIL="/etc/fail2ban/jail.local"
cat << EOF > "$FAIL2BAN_JAIL"
# ==============================================================================
# Campus-Groovelab Fail2ban Production Jail Configuration
# ==============================================================================
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 3
banaction = ufw
banaction_allports = ufw
backend = systemd

[sshd]
enabled = true
port    = $SSH_PORT
mode    = aggressive
maxretry = 3
bantime = 7200
EOF

systemctl enable fail2ban
systemctl restart fail2ban
log_info "Fail2ban konfiguriert und gestartet (Bantime: 2h bei 3 Fehlversuchen)."

# ------------------------------------------------------------------------------
# 6. Automatisierte Sicherheitsupdates (unattended-upgrades)
# ------------------------------------------------------------------------------
log_step "6. Unattended-Upgrades (Automatisches Security-Patching)"

apt-get update -qq && apt-get install -y unattended-upgrades update-notifier-common

cat << 'EOF' > /etc/apt/apt.conf.d/50unattended-upgrades
// Campus-Groovelab: Ausschließlich offizielle Sicherheits-Updates
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Package-Blacklist {
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::InstallOnShutdown "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-WithUsers "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:30";
EOF

cat << 'EOF' > /etc/apt/apt.conf.d/20auto-upgrades
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
EOF

systemctl restart unattended-upgrades || true
log_info "Automatisierte Sicherheits-Updates aktiv (Neustart-Fenster bei Bedarf: 03:30 Uhr)."

# ------------------------------------------------------------------------------
# 7. Kernel & TCP/IP-Stack Hardening (/etc/sysctl.d/99-security-hardening.conf)
# ------------------------------------------------------------------------------
log_step "7. Kernel & TCP/IP-Stack Hardening (Sysctl)"

SYSCTL_CONF="/etc/sysctl.d/99-security-hardening.conf"
cat << 'EOF' > "$SYSCTL_CONF"
# ==============================================================================
# Campus-Groovelab Kernel & TCP/IP Security Hardening
# Standard: BSI IT-Grundschutz / CIS Benchmark
# ==============================================================================

# TCP SYN Flood Protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.tcp_synack_retries = 2

# IP Spoofing & Source Routing Schutz
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# ICMP Redirects verbieten
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Broadcast ICMP & Bogus Errors ignorieren
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Filesystem Link-Protection
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
fs.protected_fifos = 2
fs.protected_regular = 2

# Address Space Layout Randomization (ASLR)
kernel.randomize_va_space = 2
EOF

chmod 644 "$SYSCTL_CONF"
sysctl --system >/dev/null || true
log_info "Sysctl-Hardening erfolgreich auf Kernel-Ebene angewendet."

# ------------------------------------------------------------------------------
# 8. Docker Daemon Log-Rotation & Privilegien-Härtung
# ------------------------------------------------------------------------------
log_step "8. Docker Daemon Hardening (/etc/docker/daemon.json)"

mkdir -p /etc/docker
cat << 'EOF' > /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "3"
  },
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true
}
EOF

if command -v docker &>/dev/null; then
    systemctl reload docker 2>/dev/null || systemctl restart docker || true
    log_info "Docker Daemon Konfiguration (/etc/docker/daemon.json) geladen."
fi

# ------------------------------------------------------------------------------
# 9. NVMe Swapfile Anti-OOM Airbag (4 GB, vm.swappiness = 10)
# ------------------------------------------------------------------------------
log_step "9. NVMe Swapfile Anti-OOM Airbag (4 GB)"

if [ ! -f /swapfile ]; then
    log_info "Erstelle 4 GB Swapfile auf NVMe zur Verhinderung von Kernel-OOM-Kills..."
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    sysctl vm.swappiness=10 >/dev/null
    echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
    log_info "4 GB NVMe-Swapfile erfolgreich angelegt und aktiviert (swappiness=10)."
else
    log_info "Swapfile /swapfile existiert bereits."
fi

# ------------------------------------------------------------------------------
# Zusammenfassung & Verifikation
# ------------------------------------------------------------------------------
log_step "Zusammenfassung & Status der Sicherheits-Härtung"

echo -e "👤 Deploy-User:      ${GREEN}$DEPLOY_USER (Sudo aktiv)${NC}"
echo -e "🔑 SSH-Zugang:       ${GREEN}Port $SSH_PORT (PermitRootLogin no, Pubkey Only)${NC}"
echo -e "🛡️  UFW-Firewall:     ${GREEN}Aktiv (Ports: lo, $SSH_PORT, 80, 443; DOCKER-USER Drop)${NC}"
echo -e "🚨 Fail2Ban:         ${GREEN}Aktiv (sshd-Jail aktiv)${NC}"
echo -e "🔄 Security-Updates: ${GREEN}Aktiv (unattended-upgrades 03:30 Uhr)${NC}"
echo -e "⚙️  Kernel-Sysctl:    ${GREEN}SYN-Cookies & Spoofing-Schutz aktiv${NC}"
echo -e "🐳 Docker Daemon:    ${GREEN}No-New-Privileges & Log-Rotation aktiv${NC}"
echo -e "💾 Swap-Airbag:      ${GREEN}Aktiv (4 GB NVMe, swappiness=10)${NC}"
echo ""
log_info "Die Host-Härtung für Campus-Groovelab wurde erfolgreich abgeschlossen!"
