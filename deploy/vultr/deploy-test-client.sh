#!/usr/bin/env bash
# Build the bare-bones test client against the Vultr server and serve it at https://<host>/test/.
#
#   deploy/vultr/deploy-test-client.sh   # uses VULTR_SSH and PUBLIC_HOST from .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ -f "$ROOT/.env" ]; then set -a && . "$ROOT/.env" && set +a; fi
TARGET="${VULTR_SSH:?set VULTR_SSH (e.g. root@<server-ip>) in .env}"
HOST="${PUBLIC_HOST:?set PUBLIC_HOST (e.g. 203-0-113-10.sslip.io or your domain) in .env}"

(cd "$ROOT" && NUXT_PUBLIC_SPACETIME_URL="wss://$HOST" npm run build -w test-client -- --base /test/)
rsync -az --delete "$ROOT/test-client/dist/" "$TARGET:/srv/test-client/"
echo "Test client: https://$HOST/test/"
