#!/usr/bin/env bash
set -euo pipefail

# Toggle or set DB_RESET_MODE in .env (macOS-compatible)
# Usage:
#   scripts/toggle-db-reset.sh on
#   scripts/toggle-db-reset.sh off
#   scripts/toggle-db-reset.sh toggle   # default

ENV_FILE=".env"
ACTION="${1:-toggle}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ $ENV_FILE not found in current directory. Run from repo backend root."
  exit 1
fi

# Read current value (strip surrounding quotes if present)
CURRENT_VALUE=$(grep -E '^DB_RESET_MODE=' "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d '"' || true)

case "$ACTION" in
  on|true|enable)
    TARGET_VALUE="true"
    ;;
  off|false|disable)
    TARGET_VALUE="false"
    ;;
  toggle)
    if [[ "$CURRENT_VALUE" == "true" ]]; then
      TARGET_VALUE="false"
    else
      TARGET_VALUE="true"
    fi
    ;;
  *)
    echo "Usage: $0 [on|off|toggle]"
    exit 1
    ;;
esac

# If key exists, replace while preserving quoting style; else append
if grep -qE '^DB_RESET_MODE=' "$ENV_FILE"; then
  if grep -qE '^DB_RESET_MODE=".*"' "$ENV_FILE"; then
    sed -i '' -E "s/^DB_RESET_MODE=\".*\"/DB_RESET_MODE=\"$TARGET_VALUE\"/" "$ENV_FILE"
  else
    sed -i '' -E "s/^DB_RESET_MODE=.*/DB_RESET_MODE=$TARGET_VALUE/" "$ENV_FILE"
  fi
else
  printf "\nDB_RESET_MODE=\"%s\"\n" "$TARGET_VALUE" >> "$ENV_FILE"
fi

echo "✅ DB_RESET_MODE is now: $TARGET_VALUE"
echo "ℹ️  Restart backend to apply: docker compose up -d --force-recreate backend"


