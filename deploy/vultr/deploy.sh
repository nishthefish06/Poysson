#!/usr/bin/env bash
# Build the SpacetimeDB module locally and publish it on the Vultr server.
# Publishing runs on the server through SSH, so the publish endpoint never has to be public
# and the database owner identity stays on the server.
#
#   deploy/vultr/deploy.sh                 # uses VULTR_SSH, SPACETIME_DB and SERVICE_SECRET from .env
#   DELETE_DATA=1 deploy/vultr/deploy.sh   # after a breaking schema change: wipes the server's data
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ -f "$ROOT/.env" ]; then set -a && . "$ROOT/.env" && set +a; fi
TARGET="${VULTR_SSH:?set VULTR_SSH (e.g. root@<server-ip>) in .env}"
DB="${SPACETIME_DB:-hackutd2026}"
REMOTE_BUNDLE="/tmp/${DB}-bundle.js"

(cd "$ROOT/spacetimedb" && spacetime build)
scp "$ROOT/spacetimedb/dist/bundle.js" "$TARGET:$REMOTE_BUNDLE"
# SERVICE_SECRET is passed through the environment, which the CLI stores as a module value.
# Publishing keeps the stored value when it's omitted, so it only has to be set once.
ssh "$TARGET" "chmod 644 $REMOTE_BUNDLE && sudo -u spacetimedb env ${SERVICE_SECRET:+SERVICE_SECRET=$(printf '%q' "$SERVICE_SECRET")} /stdb/spacetime --root-dir=/stdb publish -s local --js-path $REMOTE_BUNDLE --yes ${DELETE_DATA:+--delete-data} $DB && rm -f $REMOTE_BUNDLE"
