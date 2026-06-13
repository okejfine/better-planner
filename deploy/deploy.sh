#!/usr/bin/env bash
# Build locally (Apple Silicon arm64 == Graviton arm64) and ship the standalone
# bundle to the EC2 box. No build happens on the server, so a 512MB t4g.nano is fine.
#
# Usage:
#   EC2_HOST=ec2-user@1.2.3.4 SSH_KEY=~/.ssh/better-planner.pem ./deploy/deploy.sh
set -euo pipefail

EC2_HOST="${EC2_HOST:?Set EC2_HOST, e.g. ec2-user@1.2.3.4}"
SSH_KEY="${SSH_KEY:?Set SSH_KEY, e.g. ~/.ssh/better-planner.pem}"
REMOTE_DIR="${REMOTE_DIR:-/home/ec2-user/better-planner}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building (standalone)…"
bun run build

echo "==> Assembling standalone bundle…"
cp -r public .next/standalone/public
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static

echo "==> Syncing to $EC2_HOST:$REMOTE_DIR …"
rsync -az --delete \
  -e "ssh -i $SSH_KEY" \
  --exclude runtime.env \
  .next/standalone/ "$EC2_HOST:$REMOTE_DIR/"

echo "==> Restarting service…"
ssh -i "$SSH_KEY" "$EC2_HOST" "sudo systemctl restart better-planner && sudo systemctl --no-pager status better-planner | head -n 5"

echo "==> Done."
