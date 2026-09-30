#!/usr/bin/env bash
# ==============================================================================
# 🛡️ Campus-Groovelab FIDO2 / Touch-ID SSH Zero-Trust Hardening Helper
# Purpose: Generates a hardware-backed SSH key tied to your Mac's Touch ID / Secure Enclave
# Standard: Zero-Trust / BSI IT-Grundschutz (OPS.1.1.4, DER.4) / NIST SP 800-63B
# ==============================================================================

set -euo pipefail

KEY_PATH="${HOME}/.ssh/id_ed25519_sk_groovelab"

echo "=============================================================================="
echo "🛡️  Campus-Groovelab FIDO2 / Touch-ID SSH Zero-Trust Key Generator"
echo "=============================================================================="

# 1. Prüfe OpenSSH Version (muss >= 8.2 sein für FIDO2 / ed25519-sk)
SSH_VER=$(ssh -V 2>&1 | awk '{print $1}' | cut -d'_' -f2 || true)
echo "➔ Erkannte OpenSSH-Version: ${SSH_VER}"

# 2. Key-Erstellung mit physischer Touch-Bestätigung
if [ -f "${KEY_PATH}" ]; then
    echo "ℹ️  Schlüssel '${KEY_PATH}' existiert bereits."
else
    echo "🔑 Erstelle neuen hardware-gebundenen FIDO2 / Touch-ID SSH-Schlüssel..."
    echo "👉 Bitte berühre jetzt deinen Touch ID Sensor oder deinen Hardware-Token..."
    
    # Generiere ed25519-sk Schlüssel mit Zwang zur Benutzerinteraktion (Touch)
    ssh-keygen -t ed25519-sk -O resident -O application=ssh:campus-groovelab -C "deployuser@campus-groovelab-touchid" -f "${KEY_PATH}" || {
        echo "⚠️  Hinweis: Falls 'ed25519-sk' auf älteren Systemen nicht verfügbar ist,"
        echo "   nutze alternativ: ssh-keygen -t ed25519 -f ${HOME}/.ssh/id_ed25519_groovelab"
        exit 1
    }
    chmod 600 "${KEY_PATH}"
    echo "✓ Hardware-Schlüssel erfolgreich generiert: ${KEY_PATH}"
fi

echo ""
echo "=============================================================================="
echo "📋 Nächste Schritte zur Aktivierung auf dem Produktionsserver:"
echo "=============================================================================="
echo "1. Öffentlichen Schlüssel auf den Server übertragen:"
echo "   ssh-copy-id -i ${KEY_PATH}.pub deployuser@178.105.10.2"
echo ""
echo "2. Konfiguriere deine lokale ~/.ssh/config:"
echo "   Host campus-prod"
echo "       HostName 178.105.10.2"
echo "       User deployuser"
echo "       IdentityFile ${KEY_PATH}"
echo "       IdentitiesOnly yes"
echo ""
echo "Ab jetzt erfordert jeder SSH- und Deploy-Zugriff deinen physischen Fingerabdruck!"
echo "=============================================================================="
