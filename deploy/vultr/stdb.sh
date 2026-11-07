#!/usr/bin/env bash
# Run any spacetime CLI command on the Vultr server as the database owner.
# Uses VULTR_SSH from .env.
#
#   deploy/vultr/stdb.sh logs hackutd2026
#   deploy/vultr/stdb.sh sql hackutd2026 "SELECT * FROM my_account"
#   deploy/vultr/stdb.sh call hackutd2026 bootstrap_admin '"you@example.com"' '"Your Name"' '"+15555550123"' '"a-long-password"'
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ -f "$ROOT/.env" ]; then set -a && . "$ROOT/.env" && set +a; fi
TARGET="${VULTR_SSH:?set VULTR_SSH (e.g. root@<server-ip>) in .env}"

ssh "$TARGET" "sudo -u spacetimedb /stdb/spacetime --root-dir=/stdb $(printf '%q ' "$@")"
