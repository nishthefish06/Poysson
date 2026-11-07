#!/usr/bin/env bash
# Build the module locally and publish it on the Vultr server.
# Publishing runs on the server through SSH, so the publish endpoint never has to be public
# and the database owner identity stays on the server.
#
#   deploy/vultr/deploy.sh            # uses VULTR_SSH and SPACETIME_DB from .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ -f "$ROOT/.env" ]; then set -a && . "$ROOT/.env" && set +a; fi
TARGET="${VULTR_SSH:?set VULTR_SSH (e.g. root@<server-ip>) in .env}"
DB="${SPACETIME_DB:-hackutd2026}"
REMOTE_BUNDLE="/tmp/${DB}-bundle.js"

(cd "$ROOT/spacetimedb" && spacetime build)
scp "$ROOT/spacetimedb/dist/bundle.js" "$TARGET:$REMOTE_BUNDLE"
ssh "$TARGET" "chmod 644 $REMOTE_BUNDLE && sudo -u spacetimedb /stdb/spacetime --root-dir=/stdb publish -s local --js-path $REMOTE_BUNDLE --yes $DB && rm -f $REMOTE_BUNDLE"
