#!/bin/bash

# =============================================================================
# NOTE: Consider using the unified installer instead:
#   curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/install.sh | bash
# This script remains available as standalone fallback for power users.
# =============================================================================

# ============================================================================
# Kanban MCP Server Setup for Specwright
# ============================================================================
#
# Installs the Kanban MCP Server globally to ~/.specwright/scripts/mcp/
# and configures it in the project's .mcp.json file.
#
# The MCP server provides safe, atomic operations for kanban.json management,
# preventing race conditions and JSON corruption.
#
# Usage:
#   bash setup-mcp.sh
#
# ============================================================================

set -e  # Exit on error

echo "🔧 Installing Kanban MCP Server for Specwright..."
echo ""

# Legacy detection
if [[ -d "$HOME/.agent-os/scripts/mcp" && ! -d "$HOME/.specwright" ]]; then
    echo "⚠️  Detected existing ~/.agent-os/ MCP installation."
    echo "   Run migrate-to-specwright.sh --global-only first, or continue for fresh install."
    echo ""
fi

# Create global MCP scripts directory
MCP_DIR="$HOME/.specwright/scripts/mcp"
mkdir -p "$MCP_DIR"

# Copy MCP server files to global location
echo "📦 Copying MCP server files to $MCP_DIR..."
cp specwright/scripts/mcp/kanban-mcp-server.ts "$MCP_DIR/"
cp specwright/scripts/mcp/kanban-lock.ts "$MCP_DIR/"
cp specwright/scripts/mcp/story-parser.ts "$MCP_DIR/"
cp specwright/scripts/mcp/item-templates.ts "$MCP_DIR/"
echo "   ✅ Files copied"
echo ""

# Create package.json for MCP server dependencies
echo "📦 Installing MCP SDK dependencies..."
cat > "$MCP_DIR/package.json" <<EOF
{
  "name": "kanban-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@anthropic-ai/sdk": "^0.32.0"
  }
}
EOF

# Install dependencies
cd "$MCP_DIR"
npm install --silent
cd - > /dev/null
echo "   ✅ Dependencies installed"
echo ""

# Configure .mcp.json
MCP_CONFIG=".mcp.json"

if [ -f "$MCP_CONFIG" ]; then
  echo "📝 Adding kanban MCP server to existing $MCP_CONFIG..."

  # Check if kanban server already exists
  if grep -q '"kanban"' "$MCP_CONFIG"; then
    echo "   ⚠️  Kanban MCP server already configured in $MCP_CONFIG"
    echo "   Skipping configuration update"
  else
    # Backup existing config
    cp "$MCP_CONFIG" "${MCP_CONFIG}.backup.$(date +%s)"

    # Use Python to properly merge JSON (available on macOS/Linux)
    python3 <<PYTHON
import json
import sys

try:
    with open('$MCP_CONFIG', 'r') as f:
        config = json.load(f)

    # Add kanban server
    if 'mcpServers' not in config:
        config['mcpServers'] = {}

    config['mcpServers']['kanban'] = {
        'command': 'npx',
        'args': ['tsx', '$MCP_DIR/kanban-mcp-server.ts']
    }

    # Write updated config
    with open('$MCP_CONFIG', 'w') as f:
        json.dump(config, f, indent=2)

    print('   ✅ Kanban MCP server added to .mcp.json')
except Exception as e:
    print(f'   ⚠️  Auto-merge failed: {e}')
    print('   Please add manually:')
    print('   "kanban": {')
    print('     "command": "npx",')
    print('     "args": ["tsx", "$MCP_DIR/kanban-mcp-server.ts"]')
    print('   }')
    sys.exit(0)  # Don't fail the script
PYTHON

  fi
else
  echo "📝 Creating new $MCP_CONFIG..."
  cat > "$MCP_CONFIG" <<EOF
{
  "mcpServers": {
    "kanban": {
      "command": "npx",
      "args": ["tsx", "$MCP_DIR/kanban-mcp-server.ts"]
    }
  }
}
EOF
  echo "   ✅ $MCP_CONFIG created"
fi

echo ""
echo "✅ Kanban MCP Server installation complete!"
echo ""
echo "📖 What was installed:"
echo "   • MCP server: $MCP_DIR/kanban-mcp-server.ts"
echo "   • Lock utility: $MCP_DIR/kanban-lock.ts"
echo "   • Configuration: .mcp.json (or needs manual merge)"
echo ""
echo "🧪 Test the installation:"
echo "   echo '{\"jsonrpc\":\"2.0\",\"method\":\"tools/list\",\"id\":1}' | npx tsx $MCP_DIR/kanban-mcp-server.ts"
echo ""
echo "📚 The MCP server provides these tools for Claude CLI:"
echo "   • kanban_read - Read kanban state"
echo "   • kanban_create - Initialize kanban from story files"
echo "   • kanban_start_story - Mark story as in_progress"
echo "   • kanban_complete_story - Mark story as done"
echo "   • kanban_update_phase - Update execution phase"
echo "   • kanban_set_git_strategy - Set git strategy info"
echo ""
echo "🎯 Purpose: Prevents JSON corruption from race conditions when"
echo "   multiple Claude sessions or the web UI access kanban.json simultaneously."
echo ""
