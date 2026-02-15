#!/bin/bash
# Specwright UI Setup - Install Web UI dependencies
# Usage: ./setup-ui.sh
set -e

echo "================================="
echo "  Specwright Web UI Setup"
echo "================================="
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Error: Node.js 20+ required (found $(node -v))"
    echo "Please upgrade Node.js from https://nodejs.org"
    exit 1
fi

echo "Node.js version: $(node -v)"
echo ""

# Determine script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$SCRIPT_DIR/ui"

if [ ! -d "$UI_DIR" ]; then
    echo "Error: ui/ directory not found at $UI_DIR"
    echo "Make sure you're running this from the specwright repository root."
    exit 1
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd "$UI_DIR"
npm install

# Fix node-pty spawn-helper permissions (required on macOS)
SPAWN_HELPER="$UI_DIR/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper"
if [ -f "$SPAWN_HELPER" ]; then
    chmod +x "$SPAWN_HELPER"
fi
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd "$UI_DIR/frontend"
npm install
echo ""

echo "================================="
echo "  Setup Complete!"
echo "================================="
echo ""
echo "Start the UI with:"
echo "  Backend:  cd ui && npm run dev:backend"
echo "  Frontend: cd ui && npm run dev:ui"
echo ""
echo "Or start both in separate terminals."
echo "Backend runs on http://localhost:3001"
echo "Frontend runs on http://localhost:5173"
echo ""
