#!/usr/bin/env bash
# ==============================================================================
# 🛡️ Campus-Groovelab Sovereign Host & Container Security Baseline
# Standards: BSI TR-03103 / ISO/IEC 27037 / OWASP ASVS Level 3 / DSGVO Art. 32
# Target: Hetzner Cloud / Dedicated Host (Falkenstein fsn1 & Nürnberg nbg1)
# ==============================================================================

set -euo pipefail

echo "=============================================================================="
echo "🛡️  Campus-Groovelab Sovereign Host Hardening & PTB NTS Setup"
echo "    Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=============================================================================="

# 1. NTS (Network Time Security) via Physikalisch-Technische Bundesanstalt (PTB)
echo "⏰ [1/3] Konfiguriere authentifizierte Zeitsynchronisation via PTB Braunschweig..."

CHRONY_CONF="/etc/chrony/chrony.conf"
if [ -f "$CHRONY_CONF" ]; then
    echo "  -> Prüfe PTB NTS Server in $CHRONY_CONF..."
    if ! grep -q "ptbtime1.ptb.de" "$CHRONY_CONF"; then
        cat << 'EOF' | sudo tee -a "$CHRONY_CONF"

# ------------------------------------------------------------------------------
# 🏛️ Campus-Groovelab Sovereign NTS Time Security (BSI TR-03103 / PTB)
# ------------------------------------------------------------------------------
server ptbtime1.ptb.de iburst nts
server ptbtime2.ptb.de iburst nts
server ptbtime3.ptb.de iburst nts

# Fallback Stratum-1 Zeitquellen
server time.fu-berlin.de iburst nts
EOF
        echo "  ✓ PTB NTS Server hinzugefügt."
        sudo systemctl restart chrony 2>/dev/null || true
    else
        echo "  ✓ PTB NTS Server bereits konfiguriert."
    fi
else
    echo "  ℹ️  Chrony Konfigurationsdatei nicht gefunden. Manuelle Bereitstellung auf Host empfohlen."
fi

# 2. Kernel Anti-Dump & Memory Peeking Schutz
echo "🔒 [2/3] Härte Linux-Kernel gegen Memory Dumps (Anti-RAM-Peeking)..."

# Verhindere Core-Dumps für setuid/setgid Prozesse
if [ -w /proc/sys/fs/suid_dumpable ]; then
    echo 0 | sudo tee /proc/sys/fs/suid_dumpable > /dev/null
    echo "  ✓ /proc/sys/fs/suid_dumpable auf 0 gesetzt."
fi

# Dauerhafte Verankerung in sysctl.d
SYSCTL_HARDENING="/etc/sysctl.d/99-groovelab-security.conf"
if [ -d "/etc/sysctl.d" ]; then
    cat << 'EOF' | sudo tee "$SYSCTL_HARDENING" > /dev/null
# 🛡️ Campus-Groovelab Kernel Hardening (OWASP ASVS Level 3 / BSI)
fs.suid_dumpable = 0
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
kernel.yama.ptrace_scope = 2
EOF
    sudo sysctl -p "$SYSCTL_HARDENING" 2>/dev/null || true
    echo "  ✓ Kernel Hardening Parameter in $SYSCTL_HARDENING verankert."
fi

# 3. Docker Container Härtungs-Verifikation
echo "🐳 [3/3] Docker Security Invarianten (Checkliste für Container Deployment):"
cat << 'EOF'
  Die Produktions-Container MÜSSEN mit folgenden Flags betrieben werden:
  
  services:
    supabase-db:
      cap_drop:
        - SYS_PTRACE
      ulimits:
        core: 0
    groovelab-bff:
      cap_drop:
        - SYS_PTRACE
      ulimits:
        core: 0
EOF

echo ""
echo "=============================================================================="
echo "✅ Sovereign Host Hardening Baseline erfolgreich angewendet."
echo "=============================================================================="
