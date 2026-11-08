#!/usr/bin/env bash
# Build the Nuxt app locally and run it on the Vultr server (served at the site root).
# Writes the server-side secrets to /etc/hackutd/web.env (readable by root and the app only).
#
#   deploy/vultr/deploy-web.sh        # uses VULTR_SSH, PUBLIC_HOST and the app secrets from .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ -f "$ROOT/.env" ]; then set -a && . "$ROOT/.env" && set +a; fi
TARGET="${VULTR_SSH:?set VULTR_SSH (e.g. root@<server-ip>) in .env}"
HOST="${PUBLIC_HOST:?set PUBLIC_HOST (e.g. 203-0-113-10.sslip.io or your domain) in .env}"
WEB_DIR="${WEB_DIR:-app}"

[ -d "$ROOT/$WEB_DIR" ] || { echo "no $WEB_DIR/ workspace yet; nothing to deploy" >&2; exit 1; }
(cd "$ROOT" && npm run build -w "$WEB_DIR")

# Runtime config for the server: the browser connects through Caddy, the server routes connect
# to SpacetimeDB directly on the box.
ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
{
  echo "NUXT_PUBLIC_SPACETIME_URL=wss://$HOST"
  echo "NUXT_PUBLIC_SPACETIME_DB=${SPACETIME_DB:-hackutd2026}"
  echo "NUXT_SPACETIME_INTERNAL_URL=ws://127.0.0.1:3000"
  echo "SERVICE_SECRET=${SERVICE_SECRET:-}"
  # Nuxt only reads runtimeConfig overrides as NUXT_<KEY> at runtime.
  echo "NUXT_GEMINI_API_KEY=${GEMINI_API_KEY:-}"
  echo "NUXT_NVIDIA_API_KEY=${NVIDIA_API_KEY:-}"
  echo "NUXT_NVIDIA_BASE_URL=${NVIDIA_BASE_URL:-https://integrate.api.nvidia.com/v1}"
  echo "NUXT_NEMOTRON_MODEL=${NEMOTRON_MODEL:-}"
  echo "NUXT_PHOTON_PROJECT_ID=${PHOTON_PROJECT_ID:-}"
  echo "NUXT_PHOTON_PROJECT_SECRET=${PHOTON_PROJECT_SECRET:-}"
  echo "NUXT_DEMO_PHONE_MAP=${DEMO_PHONE_MAP:-}"
} >"$ENV_FILE"

rsync -az --delete "$ROOT/$WEB_DIR/.output/" "$TARGET:/srv/web/.output/"
scp "$ENV_FILE" "$TARGET:/etc/hackutd/web.env"
ssh "$TARGET" "chown -R webapp:webapp /srv/web && chown root:webapp /etc/hackutd/web.env && chmod 640 /etc/hackutd/web.env && systemctl restart hackutd-web && systemctl --no-pager --lines=5 status hackutd-web"
