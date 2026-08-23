#!/usr/bin/env bash
# ==============================================================================
# Campus-Groovelab Tier-1 Automated Cron Installer
# Sets up nightly 03:00 AM AES-256 database backups on Hetzner Server
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup_postgres.sh"
LOG_FILE="/var/log/campus_groovelab_backup.log"
CRON_JOB="0 3 * * * ${BACKUP_SCRIPT} >> ${LOG_FILE} 2>&1"

echo "================================================================="
echo "🛡️  Campus-Groovelab Automated Backup Cronjob Installer"
echo "📂  Backup Script: ${BACKUP_SCRIPT}"
echo "📝  Log Target: ${LOG_FILE}"
echo "================================================================="

# Ensure backup script is executable
chmod +x "${BACKUP_SCRIPT}"

# Add cron job if not already present
if crontab -l 2>/dev/null | grep -Fq "${BACKUP_SCRIPT}"; then
    echo "ℹ️  Cronjob is already installed in crontab."
else
    (crontab -l 2>/dev/null || true; echo "${CRON_JOB}") | crontab -
    echo "✅ Successfully added nightly 03:00 AM backup cronjob to crontab:"
    echo "   ${CRON_JOB}"
fi

echo "================================================================="
echo "🎉 Setup complete! Backups will run every night at 03:00 AM."
echo "================================================================="
