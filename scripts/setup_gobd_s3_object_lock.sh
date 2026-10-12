#!/usr/bin/env bash
# ==============================================================================
# Campus-Groovelab GoBD WORM Object Lock Setup Engine (§ 147 AO / BSI TR-03138)
# Standards: GoBD, § 147 AO, OWASP ASVS Level 3, DIN EN ISO/IEC 27001
#
# Ziel:
#   Aktivierung von S3 Object Lock (WORM - Write Once, Read Many) im COMPLIANCE Mode
#   mit 10 Jahren gesetzlicher Aufbewahrungsfrist (3.650 Tage) für Rechnungsbelege,
#   Stornobelege, Buchungsjournale und AVV-Vereinbarungen.
#
# Usage:
#   ./scripts/setup_gobd_s3_object_lock.sh [--bucket <bucket-name>] [--days <days>]
# ==============================================================================

set -euo pipefail

BUCKET_NAME="${1:-campus-groovelab-invoices}"
RETENTION_DAYS="${2:-3650}" # 10 Jahre gesetzliche Aufbewahrungsfrist gem. § 147 Abs. 3 AO

# Load environment
for env_candidate in "/etc/campus-groovelab/s3.env" ".env" ".env.production"; do
  if [ -f "$env_candidate" ]; then
    # shellcheck disable=SC1090
    source "$env_candidate"
  fi
done

S3_ENDPOINT="${STORAGE_S3_ENDPOINT:-}"
S3_ACCESS_KEY="${STORAGE_S3_ACCESS_KEY:-}"
S3_SECRET_KEY="${STORAGE_S3_SECRET_KEY:-}"
S3_REGION="${STORAGE_S3_REGION:-eu-central-1}"

echo "════════════════════════════════════════════════════════════════════"
echo "⚖️  CAMPUS-GROOVELAB: GoBD S3 WORM OBJECT LOCK CONFIGURATOR"
echo "    Rechtsgrundlage: § 147 AO, GoBD, BSI TR-03138 RESISCAN"
echo "════════════════════════════════════════════════════════════════════"

if [ -z "$S3_ENDPOINT" ] || [ -z "$S3_ACCESS_KEY" ] || [ -z "$S3_SECRET_KEY" ]; then
  echo "❌ FEHLER: Fehlende S3-Konfiguration!"
  echo "   Bitte STORAGE_S3_ENDPOINT, STORAGE_S3_ACCESS_KEY und STORAGE_S3_SECRET_KEY setzen."
  exit 1
fi

echo "ℹ️ Ziel-Bucket:       $BUCKET_NAME"
echo "ℹ️ Aufbewahrungsfrist: $RETENTION_DAYS Tage (ca. $(( RETENTION_DAYS / 365 )) Jahre)"
echo "ℹ️ Modus:             COMPLIANCE (Unwiderruflich, kein Löschen vor Fristablauf)"

export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
export AWS_DEFAULT_REGION="$S3_REGION"

if ! command -v aws >/dev/null 2>&1; then
  echo "⚠️ 'aws' CLI nicht installiert. Generiere XML-Payload zur manuellen Konfiguration..."
  cat <<EOF

Zur manuellen Aktivierung via S3 REST-API (PUT /?object-lock):

Payload (object-lock.json):
{
  "ObjectLockConfiguration": {
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Days": $RETENTION_DAYS
      }
    }
  }
}

Befehl:
aws --endpoint-url $S3_ENDPOINT s3api put-object-lock-configuration \\
  --bucket $BUCKET_NAME \\
  --object-lock-configuration file://object-lock.json
EOF
  exit 0
fi

echo "🔐 Wende GoBD WORM Compliance Lock auf Bucket '$BUCKET_NAME' an..."
aws --endpoint-url "$S3_ENDPOINT" s3api put-object-lock-configuration \
  --bucket "$BUCKET_NAME" \
  --object-lock-configuration "{
    \"ObjectLockEnabled\": \"Enabled\",
    \"Rule\": {
      \"DefaultRetention\": {
        \"Mode\": \"COMPLIANCE\",
        \"Days\": $RETENTION_DAYS
      }
    }
  }"

echo "✅ GoBD S3 Object Lock erfolgreich aktiviert!"
echo "🏆 Rechnungen und Buchungsjournale in '$BUCKET_NAME' sind nun für $RETENTION_DAYS Tage unlöschbar und unveränderbar geschützt."
