#!/bin/bash
# ============================================================================
# Migration Runner for WiserWits Partners Portal
# Usage: ./migrations/migrate.sh [up|status]
#
# Environment variables (reads from .env.local if present):
#   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env.local if it exists
if [ -f "$PROJECT_DIR/.env.local" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env.local" | grep -E '^DB_' | xargs)
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-dev_db}"

MYSQL_CMD="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME"

run_sql() {
  $MYSQL_CMD -N -e "$1" 2>/dev/null
}

run_file() {
  $MYSQL_CMD < "$1" 2>/dev/null
}

# Ensure schema_migrations table exists
run_file "$SCRIPT_DIR/000_create_schema_migrations.sql" 2>/dev/null || true

get_applied_versions() {
  run_sql "SELECT version FROM schema_migrations ORDER BY version" 2>/dev/null || echo ""
}

case "${1:-up}" in
  up)
    echo "==> Running pending migrations on $DB_NAME ($DB_HOST:$DB_PORT)"
    echo ""

    APPLIED=$(get_applied_versions)
    PENDING=0

    for FILE in "$SCRIPT_DIR"/[0-9]*.sql; do
      [ -f "$FILE" ] || continue
      FILENAME=$(basename "$FILE")
      VERSION=$(echo "$FILENAME" | grep -oE '^[0-9]+')

      if echo "$APPLIED" | grep -qw "$VERSION"; then
        continue
      fi

      echo "  Applying: $FILENAME"
      if run_file "$FILE"; then
        echo "  ✓ Done"
        PENDING=$((PENDING + 1))
      else
        echo "  ✗ FAILED: $FILENAME"
        echo "    Fix the issue and re-run the migration."
        exit 1
      fi
      echo ""
    done

    if [ "$PENDING" -eq 0 ]; then
      echo "  Nothing to migrate. All migrations are up to date."
    else
      echo "==> Applied $PENDING migration(s) successfully."
    fi
    ;;

  status)
    echo "==> Migration status for $DB_NAME ($DB_HOST:$DB_PORT)"
    echo ""
    printf "  %-10s %-40s %s\n" "VERSION" "NAME" "STATUS"
    printf "  %-10s %-40s %s\n" "-------" "----" "------"

    APPLIED=$(get_applied_versions)

    for FILE in "$SCRIPT_DIR"/[0-9]*.sql; do
      [ -f "$FILE" ] || continue
      FILENAME=$(basename "$FILE")
      VERSION=$(echo "$FILENAME" | grep -oE '^[0-9]+')
      NAME=$(echo "$FILENAME" | sed 's/^[0-9]*_//' | sed 's/\.sql$//')

      if echo "$APPLIED" | grep -qw "$VERSION"; then
        STATUS="applied"
      else
        STATUS="PENDING"
      fi

      printf "  %-10s %-40s %s\n" "$VERSION" "$NAME" "$STATUS"
    done
    ;;

  *)
    echo "Usage: $0 [up|status]"
    echo ""
    echo "Commands:"
    echo "  up      Apply all pending migrations (default)"
    echo "  status  Show which migrations have been applied"
    exit 1
    ;;
esac
