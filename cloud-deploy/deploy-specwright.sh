#!/usr/bin/env bash
# specwright robuster Deployer — mirrors setup-ui-cloud.sh ohne den buggy insteadOf-Schritt.
# Aufruf: sudo /opt/specwright-deploy/deploy-specwright.sh [--force]
#
# Auto-Mode-Gate: Per Default wird der Deploy VERSCHOBEN solange ein Auto-Mode-Lauf
# aktiv ist (der Restart wuerde laufende Stories + Cloud-Terminals killen). Der Poller
# (auto-deploy-check.sh) ruft alle 2 Min erneut -> sobald Auto-Mode fertig, deployt es.
# `--force` umgeht das Gate fuer bewusste manuelle Deploys.
# Safety-Cap (DEPLOY_MAX_DEFER_SEC, Default 60 Min): danach wird trotz Auto-Mode
# deployt, damit eine auf User-Action wartende (gestockte) Session Updates nicht
# unbegrenzt blockt.
set -euo pipefail

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

HOME_DIR="/opt/specwright-ui"
BRANCH="main"
SERVICE="specwright-ui"
USER_OWN="specwright"
PORT="${SPECWRIGHT_UI_PORT:-3001}"
LOG="/var/log/specwright-deploy.log"
LOCK="/run/specwright-deploy.lock"
STATE_DIR="${DEPLOY_STATE_DIR:-/run}"
DEFER_STATE="$STATE_DIR/specwright-deploy-deferred-since"
MAX_DEFER_SEC="${DEPLOY_MAX_DEFER_SEC:-3600}"   # 60 Min

log(){ echo "[$(date '+%Y-%m-%d %H:%M:%S')] [deploy] $1" | tee -a "$LOG"; }

# Single-flight lock — verhindert ueberlappende Timer-Laeufe.
exec 9>"$LOCK"
if ! flock -n 9; then
  log "Anderer Deploy laeuft bereits — Abbruch."
  exit 0
fi

# Auto-Mode-Gate. Return 0 = deploy, 1 = verschoben.
check_gate(){
  if [ "$FORCE" = "1" ]; then
    rm -f "$DEFER_STATE"
    return 0
  fi
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' \
      "http://127.0.0.1:$PORT/api/status/deploy-readiness" || echo 000)"
  if [ "$code" = "423" ]; then
    local now since waited
    now="$(date +%s)"
    since="$(cat "$DEFER_STATE" 2>/dev/null || true)"
    # Leer/korrupt -> jetzt als Start der Defer-Phase setzen (atomar).
    case "$since" in
      ''|*[!0-9]*)
        since="$now"
        printf '%s' "$now" > "$DEFER_STATE.tmp" && mv -f "$DEFER_STATE.tmp" "$DEFER_STATE"
        ;;
    esac
    waited=$(( now - since ))
    if [ "$waited" -lt "$MAX_DEFER_SEC" ]; then
      log "DEFERRED: Auto-Mode aktiv — Deploy verschoben (${waited}s/${MAX_DEFER_SEC}s)."
      return 1
    fi
    log "Max-Defer ${MAX_DEFER_SEC}s erreicht — deploye trotz Auto-Mode."
  fi
  # code=200 -> deploy; code=000/5xx -> fail-open deploy (Server-Recovery nicht blocken).
  rm -f "$DEFER_STATE"
  return 0
}

if ! check_gate; then
  exit 0
fi

GIT="git -c safe.directory=$HOME_DIR -C $HOME_DIR"

log "=== Deploy start ==="
OLD_SHA="$($GIT rev-parse --short HEAD 2>/dev/null || echo unknown)"
log "Fetch origin/$BRANCH (war: $OLD_SHA)"
$GIT fetch --quiet origin "$BRANCH"
$GIT checkout --quiet "$BRANCH"
$GIT reset --hard "origin/$BRANCH" >/dev/null
NEW_SHA="$($GIT rev-parse --short HEAD)"
log "Jetzt auf: $NEW_SHA"

log "npm install (backend)"
( cd "$HOME_DIR/ui" && npm install --silent --no-audit --no-fund )
log "npm install (frontend)"
( cd "$HOME_DIR/ui/frontend" && npm install --silent --no-audit --no-fund )
log "Build frontend"
( cd "$HOME_DIR/ui/frontend" && npm run build --silent )

log "Ownership -> $USER_OWN"
chown -R "$USER_OWN:$USER_OWN" "$HOME_DIR"

log "Restart $SERVICE"
systemctl restart "$SERVICE.service"

# Health check
for i in $(seq 1 20); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)"
  if [ "$code" = "200" ]; then
    log "Health OK (HTTP 200) — $NEW_SHA ist live."
    log "=== Deploy ende ==="
    exit 0
  fi
  sleep 2
done
log "WARNUNG: kein HTTP 200 nach Restart (Service-Logs pruefen)."
exit 1
