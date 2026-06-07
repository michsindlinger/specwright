#!/usr/bin/env bash
# =============================================================================
# Specwright Web UI — Cloud Setup (Droplet-Side)
#
# Installs Specwright UI as a systemd service on the Kompass DigitalOcean
# droplet. Designed to coexist with Kompass on the same host.
#
# Architecture (CLOUD-004 / Phase 3):
#   - Repo cloned/updated under ${SPECWRIGHT_UI_HOME}    (default /opt/specwright-ui)
#   - Backend runs as service ${SERVICE_NAME}            (default specwright-ui)
#   - Bound to loopback ${SPECWRIGHT_UI_PORT}            (default 3001)
#   - Reads projects from ${SPECWRIGHT_PROJECTS_ROOT}    (default /mnt/shared_projects)
#   - Cloudflare Tunnel (CLOUD-005) fronts loopback port — no public inbound
#   - User-level Claude skills (cloud-deploy/claude-user-skills/) installed to
#     /var/lib/${SPECWRIGHT_UI_USER}/.claude/skills/
#
# Idempotent: re-running updates the repo, rebuilds frontend, reinstalls unit.
#
# Usage (on droplet, as root or via sudo):
#   curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-ui-cloud.sh | sudo bash
#   sudo bash setup-ui-cloud.sh [--home /opt/specwright-ui] [--user specwright] \
#                               [--port 3001] [--projects-root /mnt/shared_projects] \
#                               [--no-start]
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Defaults
# -----------------------------------------------------------------------------
REPO_URL="${SPECWRIGHT_REPO_URL:-https://github.com/michsindlinger/specwright.git}"
REPO_BRANCH="${SPECWRIGHT_REPO_BRANCH:-main}"
SPECWRIGHT_UI_HOME="${SPECWRIGHT_UI_HOME:-/opt/specwright-ui}"
SPECWRIGHT_UI_USER="${SPECWRIGHT_UI_USER:-specwright}"
SPECWRIGHT_UI_PORT="${SPECWRIGHT_UI_PORT:-3001}"
SPECWRIGHT_PROJECTS_ROOT="${SPECWRIGHT_PROJECTS_ROOT:-/mnt/shared_projects}"
SERVICE_NAME="${SERVICE_NAME:-specwright-ui}"
START_SERVICE=true

# -----------------------------------------------------------------------------
# Args
# -----------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case $1 in
        --home)            SPECWRIGHT_UI_HOME="$2"; shift 2 ;;
        --user)            SPECWRIGHT_UI_USER="$2"; shift 2 ;;
        --port)            SPECWRIGHT_UI_PORT="$2"; shift 2 ;;
        --projects-root)   SPECWRIGHT_PROJECTS_ROOT="$2"; shift 2 ;;
        --service-name)    SERVICE_NAME="$2"; shift 2 ;;
        --branch)          REPO_BRANCH="$2"; shift 2 ;;
        --no-start)        START_SERVICE=false; shift ;;
        -h|--help)
            sed -n '2,/^# ===/p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# -----------------------------------------------------------------------------
# Pre-flight
# -----------------------------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
    echo "Error: this script must be run as root (or via sudo)." >&2
    exit 1
fi

if ! command -v systemctl &>/dev/null; then
    echo "Error: systemctl not found. This script requires a systemd-based Linux." >&2
    exit 1
fi

for cmd in git node npm; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "Error: '$cmd' not installed on PATH. Install Node 20+, git, and rerun." >&2
        exit 1
    fi
done

NODE_MAJOR=$(node -v | sed 's/^v//' | cut -d. -f1)
if [[ "$NODE_MAJOR" -lt 20 ]]; then
    echo "Error: Node.js 20+ required (found $(node -v))." >&2
    exit 1
fi

if [[ ! -d "$SPECWRIGHT_PROJECTS_ROOT" ]]; then
    echo "Warning: $SPECWRIGHT_PROJECTS_ROOT does not exist yet. Service will start," >&2
    echo "         but project listing will be empty until the volume is mounted." >&2
fi

echo "==> Specwright UI Cloud Setup"
echo "    Repo:           $REPO_URL ($REPO_BRANCH)"
echo "    Install dir:    $SPECWRIGHT_UI_HOME"
echo "    Service user:   $SPECWRIGHT_UI_USER"
echo "    Loopback port:  $SPECWRIGHT_UI_PORT"
echo "    Projects root:  $SPECWRIGHT_PROJECTS_ROOT"
echo "    Service name:   $SERVICE_NAME"
echo

# -----------------------------------------------------------------------------
# Service user
# -----------------------------------------------------------------------------
if ! id -u "$SPECWRIGHT_UI_USER" &>/dev/null; then
    echo "==> Creating system user: $SPECWRIGHT_UI_USER"
    useradd --system --create-home --home-dir "/var/lib/$SPECWRIGHT_UI_USER" \
            --shell /usr/sbin/nologin "$SPECWRIGHT_UI_USER"
else
    echo "==> User $SPECWRIGHT_UI_USER already exists"
fi

# -----------------------------------------------------------------------------
# Clone / update repo
# -----------------------------------------------------------------------------
mkdir -p "$SPECWRIGHT_UI_HOME"

if [[ -d "$SPECWRIGHT_UI_HOME/.git" ]]; then
    echo "==> Updating repo at $SPECWRIGHT_UI_HOME"
    git -C "$SPECWRIGHT_UI_HOME" fetch --quiet origin "$REPO_BRANCH"
    git -C "$SPECWRIGHT_UI_HOME" checkout --quiet "$REPO_BRANCH"
    git -C "$SPECWRIGHT_UI_HOME" reset --hard "origin/$REPO_BRANCH"
else
    echo "==> Cloning repo into $SPECWRIGHT_UI_HOME"
    git clone --quiet --branch "$REPO_BRANCH" "$REPO_URL" "$SPECWRIGHT_UI_HOME"
fi

# -----------------------------------------------------------------------------
# Install dependencies + build frontend
# -----------------------------------------------------------------------------
echo "==> Installing backend dependencies"
( cd "$SPECWRIGHT_UI_HOME/ui" && npm install --silent --no-audit --no-fund )

echo "==> Installing frontend dependencies"
( cd "$SPECWRIGHT_UI_HOME/ui/frontend" && npm install --silent --no-audit --no-fund )

echo "==> Building frontend"
( cd "$SPECWRIGHT_UI_HOME/ui/frontend" && npm run build --silent )

# -----------------------------------------------------------------------------
# Permissions
# -----------------------------------------------------------------------------
echo "==> Fixing ownership: $SPECWRIGHT_UI_HOME -> $SPECWRIGHT_UI_USER"
chown -R "$SPECWRIGHT_UI_USER:$SPECWRIGHT_UI_USER" "$SPECWRIGHT_UI_HOME"

if [[ -d "$SPECWRIGHT_PROJECTS_ROOT" ]]; then
    # Add service user to the volume's group when the volume is group-readable
    PROJECTS_GROUP=$(stat -c '%G' "$SPECWRIGHT_PROJECTS_ROOT" 2>/dev/null || echo "")
    if [[ -n "$PROJECTS_GROUP" && "$PROJECTS_GROUP" != "$SPECWRIGHT_UI_USER" ]]; then
        if id -nG "$SPECWRIGHT_UI_USER" | tr ' ' '\n' | grep -qx "$PROJECTS_GROUP"; then
            echo "==> $SPECWRIGHT_UI_USER already in group $PROJECTS_GROUP"
        else
            echo "==> Adding $SPECWRIGHT_UI_USER to group $PROJECTS_GROUP (volume group)"
            usermod -aG "$PROJECTS_GROUP" "$SPECWRIGHT_UI_USER"
        fi
    fi
fi

# -----------------------------------------------------------------------------
# Master key for secret encryption (used by github-config / secret-crypto)
# -----------------------------------------------------------------------------
SECRET_ENV_DIR="/etc/specwright-ui"
SECRET_ENV_FILE="$SECRET_ENV_DIR/secret.env"

if [[ ! -f "$SECRET_ENV_FILE" ]]; then
    if ! command -v openssl &>/dev/null; then
        echo "Warning: openssl not found; skipping master-key generation." >&2
        echo "         GitHub PAT will be stored unencrypted until SPECWRIGHT_SECRET_KEY is provided." >&2
    else
        echo "==> Generating master key at $SECRET_ENV_FILE"
        mkdir -p "$SECRET_ENV_DIR"
        chmod 0700 "$SECRET_ENV_DIR"
        SPECWRIGHT_KEY="$(openssl rand -hex 32)"
        umask 077
        printf 'SPECWRIGHT_SECRET_KEY=%s\n' "$SPECWRIGHT_KEY" > "$SECRET_ENV_FILE"
        chmod 0600 "$SECRET_ENV_FILE"
        chown "$SPECWRIGHT_UI_USER:$SPECWRIGHT_UI_USER" "$SECRET_ENV_FILE"
        unset SPECWRIGHT_KEY
    fi
else
    echo "==> Master key already present at $SECRET_ENV_FILE"
    chmod 0600 "$SECRET_ENV_FILE"
    chown "$SPECWRIGHT_UI_USER:$SPECWRIGHT_UI_USER" "$SECRET_ENV_FILE"
fi

# -----------------------------------------------------------------------------
# Git credential helper (host-scoped to github.com) for the service user.
# Reads the PAT from $GITHUB_TOKEN — which the UI injects into PTY sessions
# only when a PAT is configured. Other hosts (e.g. SSH remotes, non-GitHub
# HTTPS remotes) are not affected.
# -----------------------------------------------------------------------------
GITHUB_HELPER_VALUE='!f() { test "$1" = "get" && printf "username=x-access-token\npassword=%s\n" "$GITHUB_TOKEN"; }; f'

# Cleanup: remove any un-scoped global credential helper a prior install may
# have set (we now use only the host-scoped variant).
OLD_HELPER=$(sudo -u "$SPECWRIGHT_UI_USER" HOME="/var/lib/$SPECWRIGHT_UI_USER" \
    git config --global --get credential.helper 2>/dev/null || true)
if [[ -n "$OLD_HELPER" && "$OLD_HELPER" == *GITHUB_TOKEN* ]]; then
    echo "==> Removing legacy un-scoped credential.helper"
    sudo -u "$SPECWRIGHT_UI_USER" HOME="/var/lib/$SPECWRIGHT_UI_USER" \
        git config --global --unset credential.helper || true
fi

echo "==> Configuring host-scoped credential helper for github.com"
sudo -u "$SPECWRIGHT_UI_USER" HOME="/var/lib/$SPECWRIGHT_UI_USER" \
    git config --global "credential.https://github.com.helper" "$GITHUB_HELPER_VALUE"

# Rewrite SSH-style GitHub remotes (`git@github.com:owner/repo.git` and
# `ssh://git@github.com/owner/repo.git`) to HTTPS so the credential helper above
# applies to them. Without this, projects cloned via SSH bypass the helper and
# fail with "Permission denied (publickey)" because the cloud droplet has no
# SSH key. Other Git hosts are unaffected.
echo "==> Configuring insteadOf rewrite for SSH GitHub remotes"
# Reset to a clean state first: a prior run leaves multiple values behind, and
# `git config` without --add fails on multi-valued keys (breaks idempotency).
sudo -u "$SPECWRIGHT_UI_USER" HOME="/var/lib/$SPECWRIGHT_UI_USER" \
    git config --global --unset-all "url.https://github.com/.insteadOf" || true
sudo -u "$SPECWRIGHT_UI_USER" HOME="/var/lib/$SPECWRIGHT_UI_USER" \
    git config --global --add "url.https://github.com/.insteadOf" "git@github.com:"
sudo -u "$SPECWRIGHT_UI_USER" HOME="/var/lib/$SPECWRIGHT_UI_USER" \
    git config --global --add "url.https://github.com/.insteadOf" "ssh://git@github.com/"

# -----------------------------------------------------------------------------
# User-level Claude Code skills for the service user.
# Claude sessions spawned by the UI run as $SPECWRIGHT_UI_USER with
# HOME=/var/lib/$SPECWRIGHT_UI_USER — user-level skills must live in that
# home's ~/.claude/skills/. Skills are versioned in the repo under
# cloud-deploy/claude-user-skills/ and synced here on every install/update.
# -----------------------------------------------------------------------------
SKILLS_SRC="$SPECWRIGHT_UI_HOME/cloud-deploy/claude-user-skills"
SKILLS_DEST="/var/lib/$SPECWRIGHT_UI_USER/.claude/skills"

if [[ -d "$SKILLS_SRC" ]]; then
    echo "==> Installing user-level Claude skills to $SKILLS_DEST"
    mkdir -p "$SKILLS_DEST"
    for skill_dir in "$SKILLS_SRC"/*/; do
        [[ -d "$skill_dir" ]] || continue
        skill_name=$(basename "$skill_dir")
        echo "    - $skill_name"
        rm -rf "${SKILLS_DEST:?}/$skill_name"
        cp -R "$skill_dir" "$SKILLS_DEST/$skill_name"
    done
    chown -R "$SPECWRIGHT_UI_USER:$SPECWRIGHT_UI_USER" "/var/lib/$SPECWRIGHT_UI_USER/.claude"
else
    echo "==> No claude-user-skills directory in repo; skipping skill install"
fi

# -----------------------------------------------------------------------------
# SSH access for Claude cloud sessions (service user -> root@localhost).
# Cloud sessions run as $SPECWRIGHT_UI_USER on this droplet and need the same
# SSH-based prod access (Compass DB, docker logs, systemd) as local dev
# sessions. Key is generated once; the root authorized_keys entry is
# restricted to connections originating from this droplet itself.
# -----------------------------------------------------------------------------
SSH_DIR="/var/lib/$SPECWRIGHT_UI_USER/.ssh"
SSH_KEY="$SSH_DIR/id_ed25519"
DROPLET_IP=$(hostname -I | awk '{print $1}')

echo "==> Ensuring SSH access for $SPECWRIGHT_UI_USER -> root@localhost"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"
chown "$SPECWRIGHT_UI_USER:$SPECWRIGHT_UI_USER" "$SSH_DIR"

if [[ ! -f "$SSH_KEY" ]]; then
    sudo -u "$SPECWRIGHT_UI_USER" ssh-keygen -t ed25519 -N "" -f "$SSH_KEY" \
        -C "specwright-cloud@$(hostname)"
fi

SSH_PUB=$(cat "$SSH_KEY.pub")
mkdir -p /root/.ssh
chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
if ! grep -qF "$SSH_PUB" /root/.ssh/authorized_keys; then
    echo "from=\"$DROPLET_IP,127.0.0.1,::1\" $SSH_PUB" >> /root/.ssh/authorized_keys
fi

# Pre-trust the droplet's own host key so BatchMode SSH works immediately.
touch "$SSH_DIR/known_hosts"
if ! sudo -u "$SPECWRIGHT_UI_USER" ssh-keygen -F "$DROPLET_IP" -f "$SSH_DIR/known_hosts" &>/dev/null; then
    ssh-keyscan -t ed25519 "$DROPLET_IP" >> "$SSH_DIR/known_hosts" 2>/dev/null
fi
chown -R "$SPECWRIGHT_UI_USER:$SPECWRIGHT_UI_USER" "$SSH_DIR"

# -----------------------------------------------------------------------------
# systemd unit
# -----------------------------------------------------------------------------
UNIT_TEMPLATE="$SPECWRIGHT_UI_HOME/cloud-deploy/specwright-ui.service"
UNIT_INSTALLED="/etc/systemd/system/${SERVICE_NAME}.service"

if [[ ! -f "$UNIT_TEMPLATE" ]]; then
    echo "Error: unit template not found at $UNIT_TEMPLATE" >&2
    exit 1
fi

echo "==> Installing systemd unit: $UNIT_INSTALLED"
sed \
    -e "s|__SPECWRIGHT_UI_USER__|${SPECWRIGHT_UI_USER}|g" \
    -e "s|__SPECWRIGHT_UI_HOME__|${SPECWRIGHT_UI_HOME}|g" \
    -e "s|__SPECWRIGHT_UI_PORT__|${SPECWRIGHT_UI_PORT}|g" \
    -e "s|__SPECWRIGHT_PROJECTS_ROOT__|${SPECWRIGHT_PROJECTS_ROOT}|g" \
    "$UNIT_TEMPLATE" > "$UNIT_INSTALLED"

chmod 0644 "$UNIT_INSTALLED"

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service" >/dev/null

if [[ "$START_SERVICE" == "true" ]]; then
    echo "==> (Re)starting service: $SERVICE_NAME"
    systemctl restart "${SERVICE_NAME}.service"
    sleep 1
    systemctl --no-pager --lines=0 status "${SERVICE_NAME}.service" || true
else
    echo "==> --no-start specified; service enabled but not started"
fi

# -----------------------------------------------------------------------------
# Smoke
# -----------------------------------------------------------------------------
if [[ "$START_SERVICE" == "true" ]]; then
    echo
    echo "==> Health probe"
    if command -v curl &>/dev/null; then
        sleep 2
        if curl -fsS "http://127.0.0.1:${SPECWRIGHT_UI_PORT}/health" >/dev/null; then
            echo "    OK — http://127.0.0.1:${SPECWRIGHT_UI_PORT}/health responds"
        else
            echo "    Warning — /health did not respond. Check: journalctl -u ${SERVICE_NAME} -n 50"
        fi
    fi
fi

echo
echo "Done."
echo "  Logs:    journalctl -u ${SERVICE_NAME} -f"
echo "  Status:  systemctl status ${SERVICE_NAME}"
echo "  Next:    CLOUD-005 (Cloudflare Tunnel) routes specwright.<host> -> 127.0.0.1:${SPECWRIGHT_UI_PORT}"
