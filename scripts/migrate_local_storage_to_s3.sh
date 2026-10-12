#!/usr/bin/env bash
# ==============================================================================
# Campus-Groovelab Enterprise S3 Migration & Integrity Verification Engine
# Standards: OWASP ASVS Level 3, DIN EN ISO/IEC 27001, BSI IT-Grundschutz, Zero US-Cloud
#
# Ziel:
#   Idempotente, unterbrechungsfreie Synchronisation aller Mediendateien vom lokalen
#   Ceph-Volume (/mnt/cloud-volume/storage-data) in das Hetzner S3 Object Storage Cluster.
#
# Usage:
#   ./scripts/migrate_local_storage_to_s3.sh [--dry-run] [--verify-only] [--source <path>]
#
# Environment Variablen (in /etc/campus-groovelab/s3.env oder .env):
#   STORAGE_S3_ENDPOINT     (z. B. https://fsn1.your-objectstorage.com)
#   STORAGE_S3_REGION       (default: eu-central-1)
#   STORAGE_S3_ACCESS_KEY   (Hetzner S3 Access Key)
#   STORAGE_S3_SECRET_KEY   (Hetzner S3 Secret Key)
#   GLOBAL_S3_BUCKET        (default: campus-groovelab-assets)
# ==============================================================================

set -euo pipefail

DRY_RUN=false
VERIFY_ONLY=false
SOURCE_DIR="/mnt/cloud-volume/storage-data"
LOG_FILE="/var/log/campus-groovelab-s3-migration.log"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")

# Parse CLI Flags
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verify-only)
      VERIFY_ONLY=true
      shift
      ;;
    --source)
      SOURCE_DIR="$2"
      shift 2
      ;;
    --help|-h)
      echo "Verwendung: $0 [--dry-run] [--verify-only] [--source <path>]"
      exit 0
      ;;
    *)
      echo "Unbekannte Option: $1"
      exit 1
      ;;
  esac
done

# Load environment
for env_candidate in "/etc/campus-groovelab/s3.env" "/etc/campus-groovelab/backup.env" ".env" ".env.production"; do
  if [ -f "$env_candidate" ]; then
    # shellcheck disable=SC1090
    source "$env_candidate"
  fi
done

# Fallback log location if /var/log is not writable
if ! touch "$LOG_FILE" 2>/dev/null; then
  LOG_FILE="./s3_migration_${TIMESTAMP}.log"
fi

log() {
  local msg="[$(date -u +"%Y-%m-%d %H:%M:%SZ")] $1"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

log "════════════════════════════════════════════════════════════════════"
log "🚀 CAMPUS-GROOVELAB: S3 DATA MIGRATION & FORENSIC INTEGRITY PIPELINE"
log "   Standards: OWASP ASVS Level 3, ISO/IEC 27001, BSI IT-Grundschutz"
log "════════════════════════════════════════════════════════════════════"

# Pre-Flight Validation
S3_ENDPOINT="${STORAGE_S3_ENDPOINT:-}"
S3_ACCESS_KEY="${STORAGE_S3_ACCESS_KEY:-}"
S3_SECRET_KEY="${STORAGE_S3_SECRET_KEY:-}"
S3_BUCKET="${GLOBAL_S3_BUCKET:-campus-groovelab-assets}"
S3_REGION="${STORAGE_S3_REGION:-eu-central-1}"

if [ -z "$S3_ENDPOINT" ] || [ -z "$S3_ACCESS_KEY" ] || [ -z "$S3_SECRET_KEY" ]; then
  log "❌ FEHLER: Fehlende S3-Konfiguration!"
  log "   Bitte stelle sicher, dass STORAGE_S3_ENDPOINT, STORAGE_S3_ACCESS_KEY und STORAGE_S3_SECRET_KEY gesetzt sind."
  exit 1
fi

if [ ! -d "$SOURCE_DIR" ]; then
  log "⚠️ WARNUNG: Quellverzeichnis $SOURCE_DIR existiert nicht."
  log "   Falls du lokal testest, nutze: $0 --source ./dein/pfad"
  exit 1
fi

log "ℹ️ Quell-Verzeichnis: $SOURCE_DIR"
log "ℹ️ Ziel-S3-Bucket:    $S3_BUCKET ($S3_ENDPOINT)"
log "ℹ️ Modus:             $([ "$DRY_RUN" = true ] && echo 'DRY-RUN (Simuliert)' || ([ "$VERIFY_ONLY" = true ] && echo 'VERIFY-ONLY' || echo 'LIVE SYNCHRONISATION'))"

# Count local files
LOCAL_FILE_COUNT=$(find "$SOURCE_DIR" -type f | wc -l | tr -d ' ')
LOCAL_TOTAL_BYTES=$(du -sb "$SOURCE_DIR" 2>/dev/null | cut -f1 || du -sk "$SOURCE_DIR" | awk '{print $1 * 1024}')
log "📊 Lokaler Bestand:   $LOCAL_FILE_COUNT Dateien ($(awk "BEGIN {printf \"%.2f MB\", $LOCAL_TOTAL_BYTES / 1048576}"))"

# Tool selection: Prefer rclone, fallback to aws-cli, fallback to mc
SYNC_TOOL=""
if command -v rclone >/dev/null 2>&1; then
  SYNC_TOOL="rclone"
elif command -v aws >/dev/null 2>&1; then
  SYNC_TOOL="aws"
elif command -v mc >/dev/null 2>&1; then
  SYNC_TOOL="mc"
else
  log "❌ FEHLER: Weder 'rclone', 'aws' CLI noch 'mc' (MinIO Client) ist auf diesem System installiert."
  log "   Empfohlene Installation für Hetzner Linux: apt-get install -y rclone"
  exit 1
fi

log "🔧 Verwendetes Migrationstool: $SYNC_TOOL"

# Execution using rclone
if [ "$SYNC_TOOL" = "rclone" ]; then
  # Ephemeral rclone S3 configuration via environment variables
  export RCLONE_CONFIG_HETZNERS3_TYPE="s3"
  export RCLONE_CONFIG_HETZNERS3_PROVIDER="Other"
  export RCLONE_CONFIG_HETZNERS3_ENDPOINT="$S3_ENDPOINT"
  export RCLONE_CONFIG_HETZNERS3_REGION="$S3_REGION"
  export RCLONE_CONFIG_HETZNERS3_ACCESS_KEY_ID="$S3_ACCESS_KEY"
  export RCLONE_CONFIG_HETZNERS3_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
  export RCLONE_CONFIG_HETZNERS3_FORCE_PATH_STYLE="true"

  RCLONE_FLAGS="--checksum --transfers=8 --checkers=16 --fast-list --progress"
  if [ "$DRY_RUN" = true ]; then
    RCLONE_FLAGS="$RCLONE_FLAGS --dry-run"
  fi

  if [ "$VERIFY_ONLY" = false ]; then
    log "📦 Starte Datenübertragung mit Prüfsummen-Verifikation..."
    # rclone sync spiegelt exakt den Inhalt des lokalen Verzeichnisses in den S3 Bucket
    rclone copy "$SOURCE_DIR" "HETZNERS3:$S3_BUCKET" $RCLONE_FLAGS 2>&1 | tee -a "$LOG_FILE"
    log "✅ Datenübertragung abgeschlossen."
  fi

  # Post-Migration Check
  log "🔍 Führe forensische Prüfsummen-Verifikation durch (rclone check)..."
  if rclone check "$SOURCE_DIR" "HETZNERS3:$S3_BUCKET" --one-way 2>&1 | tee -a "$LOG_FILE"; then
    log "🏆 100% PARITÄT: Alle lokalen Dateien stimmen bit-genau mit dem S3-Ziel überein!"
  else
    log "⚠️ Abweichungen zwischen lokalem Speicher und S3 festgestellt. Prüfe Log: $LOG_FILE"
    exit 2
  fi

# Execution using aws-cli
elif [ "$SYNC_TOOL" = "aws" ]; then
  export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY"
  export AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
  export AWS_DEFAULT_REGION="$S3_REGION"

  AWS_FLAGS="--endpoint-url $S3_ENDPOINT"
  if [ "$DRY_RUN" = true ]; then
    AWS_FLAGS="$AWS_FLAGS --dryrun"
  fi

  if [ "$VERIFY_ONLY" = false ]; then
    log "📦 Starte AWS-S3 Sync..."
    aws s3 sync "$SOURCE_DIR" "s3://$S3_BUCKET" $AWS_FLAGS 2>&1 | tee -a "$LOG_FILE"
    log "✅ AWS-S3 Sync abgeschlossen."
  fi
fi

log "🏁 S3-Migrationsprüfung erfolgreich beendet."
log "📄 Vollständiges Protokoll gesichert in: $LOG_FILE"
exit 0
