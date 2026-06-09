#!/usr/bin/env bash
# Poll origin/main; deploy nur wenn neuer Commit vorliegt.
# Das Auto-Mode-Gate + der Defer-/Cap-State leben im Deployer (deploy-specwright.sh),
# damit auch manuelle Deploys geschuetzt sind. Dieser Poller ruft den Deployer ohne
# --force; ist Auto-Mode aktiv, verschiebt der Deployer (exit 0) und der naechste
# Timer-Tick (alle 2 Min) versucht es erneut.
set -euo pipefail

HOME_DIR="/opt/specwright-ui"
BRANCH="main"
LOG="/var/log/specwright-deploy.log"
DEPLOYER="/opt/specwright-deploy/deploy-specwright.sh"

log(){ echo "[$(date '+%Y-%m-%d %H:%M:%S')] [autocheck] $1" >> "$LOG"; }

GIT="git -c safe.directory=$HOME_DIR -C $HOME_DIR"

$GIT fetch --quiet origin "$BRANCH"
LOCAL="$($GIT rev-parse HEAD)"
REMOTE="$($GIT rev-parse "origin/$BRANCH")"

if [ "$LOCAL" != "$REMOTE" ]; then
  log "Update erkannt: lokal ${LOCAL:0:7} != origin ${REMOTE:0:7} — rufe Deployer (Gate entscheidet)."
  "$DEPLOYER"
fi
