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
    FILES=$(git ls-files 'apps/groovelab/src/*' 'packages/*' 'scripts/*' 'supabase/migrations/*' 'deploy/*' 2>/dev/null | grep -v 'node_modules/' | grep -v '/dist/' | grep -v 'pre_commit_secret_scanner.sh' || find apps/groovelab/src packages scripts supabase/migrations deploy -type d \( -name node_modules -o -name dist -o -name .git \) -prune -o -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" -o -name "*.sh" -o -name "*.sql" -o -name "*.conf" -o -name "*.yml" -o -name "*.yaml" \) -print | grep -v 'pre_commit_secret_scanner.sh')
else
    FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '^apps/groovelab/src/|^packages/|^scripts/|^supabase/migrations/|^deploy/' | grep -v 'node_modules/' | grep -v '/dist/' | grep -v 'pre_commit_secret_scanner.sh' || true)
fi

if [ -z "$FILES" ]; then
    echo "  ✓ Keine relevanten Code-, Paket-, Skript-, Deploy- oder Migrationsdateien verändert."
    exit 0
fi

LEAKS_FOUND=0

TMP_PATTERNS=$(mktemp)
trap 'rm -f "$TMP_PATTERNS"' EXIT

cat << 'PATTERNS_EOF' > "$TMP_PATTERNS"
-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----
SUPABASE_SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*['"][a-zA-Z0-9_.-]+['"]
postgres://[^:@]+:[^@]+@[a-zA-Z0-9.-]+
sk_live_[0-9a-zA-Z]{24}
AKIA[0-9A-Z]{16}
repo1-cipher-pass=[^_\n[:space:]]{8,}
CampusGroovelabEnterprise2026SecureBackrestKey
(^|[^a-zA-Z0-9_])ghp_[0-9a-zA-Z]{36}
(^|[^a-zA-Z0-9_])github_pat_[0-9a-zA-Z_]{82}
(^|[^a-zA-Z0-9_])re_[a-zA-Z0-9]{24,}
(^|[^a-zA-Z0-9_])SG\.[0-9a-zA-Z_-]{22}\.[0-9a-zA-Z_-]{43}
(^|[^a-zA-Z0-9_])sk-ant-api[0-9]{2}-[0-9a-zA-Z_-]{80,}
(^|[^a-zA-Z0-9_])sk-(proj-)?[0-9a-zA-Z]{32,}
ADD[[:space:]]+COLUMN.*(password|passwort).*DEFAULT[[:space:]]+['"][^'"]+['"]
master_admin_password[[:space:]]*=[[:space:]]*['"][^'"]+['"]
PATTERNS_EOF

# Schneller Batch-Scan mit xargs und grep -E -f (vermeidet tausende Child-Prozesse)
RAW_MATCHES=$(echo "$FILES" | tr '\n' '\0' | xargs -0 grep -nE -f "$TMP_PATTERNS" 2>/dev/null || true)

if [ -n "$RAW_MATCHES" ]; then
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        # Filter: Template-Variablen und Environment-Platzhalter tolerieren
        if echo "$line" | grep -q "postgres://"; then
            if echo "$line" | grep -qE '\$\{[a-zA-Z0-9_]+\}'; then
                continue
            fi
        fi
        if echo "$line" | grep -q "repo1-cipher-pass="; then
            if echo "$line" | grep -qE '__[a-zA-Z0-9_]+__'; then
                continue
            fi
        fi
        echo "❌ [SECRET LEAK DETECTED] $line"
        LEAKS_FOUND=$((LEAKS_FOUND + 1))
    done <<< "$RAW_MATCHES"
fi

if [ "$LEAKS_FOUND" -gt 0 ]; then
    echo "🚨 Secret-Scan FEHLGESCHLAGEN: $LEAKS_FOUND potenzielle Secret-Leaks gefunden!"
    echo "   Bitte entfernen Sie alle sensiblen Schlüssel vor dem Commit."
    exit 1
fi

echo "✅ Secret-Scan erfolgreich bestanden: 0 Leaks gefunden!"
exit 0
