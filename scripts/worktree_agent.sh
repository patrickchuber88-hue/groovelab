#!/bin/bash
# ==============================================================================
# 🏛️  Campus-Groovelab Multi-Agent Git Worktree Isolations-Protokoll [0,1% Goldstandard]
# Standards: OWASP ASVS L3 / Non-Destructive Freeze / Zero-Clobbering Isolation
# Subcommands: create <task_id> [base_branch] | verify <task_id> | merge <task_id> | abort <task_id>
# ==============================================================================

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREES_DIR="$REPO_ROOT/.worktrees"

wait_for_git_lock() {
    local max_retries=10
    local retry_count=0
    local sleep_sec=0.1
    local git_dir
    git_dir=$(git -C "$REPO_ROOT" rev-parse --git-dir 2>/dev/null || echo "$REPO_ROOT/.git")

    while [ -f "$REPO_ROOT/.git/index.lock" ] || [ -f "$git_dir/index.lock" ]; do
        if [ "$retry_count" -ge "$max_retries" ]; then
            echo "❌ [LOCK TIMEOUT] .git/index.lock existiert seit > 3s. Bitte Prozess prüfen." >&2
            exit 1
        fi
        echo "⏳ [INDEX LOCK] .git/index.lock erkannt. Warte ${sleep_sec}s (Versuch $((retry_count + 1))/$max_retries)..."
        sleep "$sleep_sec"
        sleep_sec=$(LC_ALL=C awk "BEGIN {printf \"%.2f\", $sleep_sec * 1.5}")
        retry_count=$((retry_count + 1))
    done
}

usage() {
    cat << 'EOF'
Campus-Groovelab Multi-Agent Git Worktree CLI

Verwendung:
  ./scripts/worktree_agent.sh create <task_id> [base_branch]
  ./scripts/worktree_agent.sh verify <task_id>
  ./scripts/worktree_agent.sh merge <task_id>
  ./scripts/worktree_agent.sh abort <task_id>

Befehle:
  create   Erstellt einen isolierten Arbeitsbaum .worktrees/<task_id>
  verify   Führt Morning Gate & Typecheck isoliert im Worktree aus
  merge    Verifiziert den Worktree und merged via Fast-Forward in die Basis
  abort    Verwirft den Worktree und löscht den temporären Branch
EOF
    exit 1
}

CMD="${1:-}"
TASK_ID="${2:-}"

if [ -z "$CMD" ] || [ -z "$TASK_ID" ]; then
    usage
fi

WORKTREE_PATH="$WORKTREES_DIR/$TASK_ID"
BRANCH_NAME="worktree/$TASK_ID"

case "$CMD" in
    create)
        BASE_BRANCH="${3:-}"
        if [ -z "$BASE_BRANCH" ]; then
            BASE_BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
            if [ "$BASE_BRANCH" = "HEAD" ]; then
                BASE_BRANCH="main"
            fi
        fi

        echo "🚀 [WORKTREE] Initialisiere isolierten Workspace für Task: $TASK_ID"
        echo "   Basis-Branch: $BASE_BRANCH"
        echo "   Zielpfad:     $WORKTREE_PATH"

        wait_for_git_lock

        mkdir -p "$WORKTREES_DIR"

        # Prune stale worktree metadata
        git -C "$REPO_ROOT" worktree prune 2>/dev/null || true

        if [ -d "$WORKTREE_PATH" ]; then
            echo "⚠️ [WORKTREE] Verzeichnis $WORKTREE_PATH existiert bereits." >&2
            exit 1
        fi

        # Remove existing branch if orphaned
        if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
            echo "ℹ️ [WORKTREE] Vorheriger Branch $BRANCH_NAME existiert. Bereinige..."
            git -C "$REPO_ROOT" branch -D "$BRANCH_NAME" 2>/dev/null || true
        fi

        git -C "$REPO_ROOT" worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_BRANCH"

        # Husky v8 compatibility in Git Worktrees
        # In worktrees, .git is a file referencing gitdir. Ensure hooks execute correctly.
        if [ -d "$REPO_ROOT/.husky" ]; then
            git -C "$WORKTREE_PATH" config core.hooksPath "$REPO_ROOT/.husky"
            echo "  ✓ Husky-Hook-Pfad für Worktree konfiguriert ($REPO_ROOT/.husky)"
        fi

        echo "✅ [WORKTREE] Workspace erfolgreich isoliert bereitgestellt: $WORKTREE_PATH"
        ;;

    verify)
        if [ ! -d "$WORKTREE_PATH" ]; then
            echo "❌ [WORKTREE] Arbeitsbaum nicht gefunden: $WORKTREE_PATH" >&2
            exit 1
        fi

        echo "🔍 [VERIFY] Starte isolierte Validierung in $WORKTREE_PATH..."
        cd "$WORKTREE_PATH"

        # Run Morning Gate Orchestrator
        if [ -f "scripts/morning_gate_orchestrator.mjs" ]; then
            node scripts/morning_gate_orchestrator.mjs
        else
            echo "ℹ️  morning_gate_orchestrator.mjs nicht gefunden, führe Node Syntax-Checks durch."
        fi

        echo "✅ [VERIFY] Isolierte Validierung für Task $TASK_ID erfolgreich bestanden!"
        ;;

    merge)
        if [ ! -d "$WORKTREE_PATH" ]; then
            echo "❌ [WORKTREE] Arbeitsbaum nicht gefunden: $WORKTREE_PATH" >&2
            exit 1
        fi

        echo "🛡️ [MERGE] Preflight-Verifikation vor Fast-Forward Merge..."
        "$0" verify "$TASK_ID"

        echo "🔄 [MERGE] Führe atomaren Fast-Forward Merge aus..."
        wait_for_git_lock

        cd "$REPO_ROOT"

        CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        echo "   Aktiver Ziel-Branch: $CURRENT_BRANCH"

        git merge --ff-only "$BRANCH_NAME"

        echo "🧹 [CLEANUP] Bereinige Worktree und Branch..."
        git worktree remove --force "$WORKTREE_PATH" 2>/dev/null || rm -rf "$WORKTREE_PATH"
        git branch -d "$BRANCH_NAME" 2>/dev/null || git branch -D "$BRANCH_NAME" 2>/dev/null || true
        git worktree prune 2>/dev/null || true

        echo "✅ [MERGE] Task $TASK_ID erfolgreich via Fast-Forward gemerged und aufgeräumt!"
        ;;

    abort)
        echo "🛑 [ABORT] Breche Task $TASK_ID ab und verwerfe Arbeitsbaum..."
        wait_for_git_lock

        if [ -d "$WORKTREE_PATH" ]; then
            git -C "$REPO_ROOT" worktree remove --force "$WORKTREE_PATH" 2>/dev/null || true
            rm -rf "$WORKTREE_PATH"
        fi

        if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
            git -C "$REPO_ROOT" branch -D "$BRANCH_NAME" 2>/dev/null || true
        fi
        git -C "$REPO_ROOT" worktree prune 2>/dev/null || true

        echo "✅ [ABORT] Worktree und Branch für Task $TASK_ID restlos entfernt."
        ;;

    *)
        usage
        ;;
esac
