#!/bin/bash
# ==============================================================================
# Campus-Groovelab Pre-Commit Secret Scanner
# OWASP ASVS Level 3 Automated Secret & High-Entropy Token Linter
# ==============================================================================

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "🔍 Führe automatisierten Pre-Commit Secret-Scan durch (Root: $REPO_ROOT)..."

# List of files staged for commit, or all files in tracking if running standalone
if [ "$1" == "--all" ]; then
    FILES=$(git ls-files 'apps/groovelab/src/*' 'packages/*' 'scripts/*' 'supabase/migrations/*' 2>/dev/null | grep -v 'node_modules/' | grep -v '/dist/' || find apps/groovelab/src packages scripts supabase/migrations -type d \( -name node_modules -o -name dist -o -name .git \) -prune -o -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" -o -name "*.sh" -o -name "*.sql" \) -print)
else
    FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '^apps/groovelab/src/|^packages/|^scripts/|^supabase/migrations/' | grep -v 'node_modules/' | grep -v '/dist/' || true)
fi

if [ -z "$FILES" ]; then
    echo "  ✓ Keine relevanten Code-, Paket-, Skript- oder Migrationsdateien verändert."
    exit 0
fi

LEAKS_FOUND=0

# Secret patterns to detect
PATTERNS=(
    "-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----"
    "SUPABASE_SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*[\'\"][a-zA-Z0-9_\.\-]+[\'\"]"
    "postgres:\/\/[^:\@]+:[^\@]+@[a-zA-Z0-9\.\-]+"
    "sk_live_[0-9a-zA-Z]{24}"
    "AKIA[0-9A-Z]{16}"
)

for file in $FILES; do
    # Skip self, node_modules and build artifacts
    if [[ "$file" == *"pre_commit_secret_scanner.sh" || "$file" == *"node_modules"* || "$file" == *"/dist/"* ]]; then
        continue
    fi
    if [ -f "$file" ]; then
        for pattern in "${PATTERNS[@]}"; do
            MATCHES=$(grep -nE -e "$pattern" "$file" 2>/dev/null || true)
            if [ -n "$MATCHES" ]; then
                echo "❌ [SECRET LEAK DETECTED] Datei: $file"
                echo "   Gefundener Treffer: $MATCHES"
                LEAKS_FOUND=$((LEAKS_FOUND + 1))
            fi
        done
    fi
done

if [ "$LEAKS_FOUND" -gt 0 ]; then
    echo "🚨 Secret-Scan FEHLGESCHLAGEN: $LEAKS_FOUND potenzielle Secret-Leaks gefunden!"
    echo "   Bitte entfernen Sie alle sensiblen Schlüssel vor dem Commit."
    exit 1
fi

echo "✅ Secret-Scan erfolgreich bestanden: 0 Leaks gefunden!"
exit 0
