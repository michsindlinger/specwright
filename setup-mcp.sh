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
cp specwright/scripts/mcp/memory-store.ts "$MCP_DIR/"
echo "   ✅ Files copied"
echo ""

# Create package.json for MCP server dependencies
echo "📦 Installing MCP SDK dependencies..."

# Check for native build tools (required by better-sqlite3)
if [[ "$(uname)" == "Darwin" ]]; then
    if ! xcode-select -p &>/dev/null; then
        echo ""
        echo "   ⚠️  Xcode Command Line Tools are required for better-sqlite3."
        echo "   Install with: xcode-select --install"
        echo ""
    fi
fi

cat > "$MCP_DIR/package.json" <<EOF
{
  "name": "kanban-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@anthropic-ai/sdk": "^0.32.0",
    "better-sqlite3": "^12.6.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12"
  }
}
EOF

# Install dependencies
cd "$MCP_DIR"
npm install --silent || {
    echo "   ⚠️  npm install failed - better-sqlite3 requires C++ build tools"
}
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

# ============================================================================
# Memory Database Setup
# ============================================================================

echo "🧠 Setting up Memory Database..."

MEMORY_DB="$HOME/.specwright/memory.db"

# Fallback: Create memory DB using sqlite3 CLI when tsx is unavailable
setup_memory_db_fallback() {
    local db_path="$1"
    if command -v sqlite3 &>/dev/null; then
        sqlite3 "$db_path" <<'MEMSQL'
CREATE TABLE IF NOT EXISTS memory_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT,
  topic TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_entry_tags (
  entry_id INTEGER NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES memory_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_project ON memory_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_topic ON memory_entries(topic);
CREATE INDEX IF NOT EXISTS idx_memory_entries_created ON memory_entries(created_at);

CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
  topic, summary, details,
  content='memory_entries', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS memory_fts_ai AFTER INSERT ON memory_entries BEGIN
  INSERT INTO memory_fts(rowid, topic, summary, details)
    VALUES (new.id, new.topic, new.summary, new.details);
END;

CREATE TRIGGER IF NOT EXISTS memory_fts_ad AFTER DELETE ON memory_entries BEGIN
  INSERT INTO memory_fts(memory_fts, rowid, topic, summary, details)
    VALUES ('delete', old.id, old.topic, old.summary, old.details);
END;

CREATE TRIGGER IF NOT EXISTS memory_fts_au AFTER UPDATE ON memory_entries BEGIN
  INSERT INTO memory_fts(memory_fts, rowid, topic, summary, details)
    VALUES ('delete', old.id, old.topic, old.summary, old.details);
  INSERT INTO memory_fts(rowid, topic, summary, details)
    VALUES (new.id, new.topic, new.summary, new.details);
END;

INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('architecture', 'Architectural decisions and patterns');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('decision', 'Key decisions made during development');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('feature', 'Feature descriptions and behavior');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('backend', 'Backend-specific knowledge');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('frontend', 'Frontend-specific knowledge');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('database', 'Database schema, queries, and patterns');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('api', 'API design and contracts');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('testing', 'Testing strategies and patterns');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('deployment', 'Deployment and infrastructure');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('security', 'Security considerations and practices');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('performance', 'Performance optimizations and benchmarks');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('convention', 'Coding conventions and style guidelines');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('dependency', 'External dependencies and libraries');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('workflow', 'Development workflows and processes');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('domain', 'Domain-specific business logic');
MEMSQL

        # v2 schema migration (each ALTER TABLE separately to suppress duplicate column errors)
        sqlite3 "$db_path" "ALTER TABLE memory_entries ADD COLUMN importance TEXT DEFAULT 'operational';" 2>/dev/null || true
        sqlite3 "$db_path" "ALTER TABLE memory_entries ADD COLUMN archived_at TEXT DEFAULT NULL;" 2>/dev/null || true
        sqlite3 "$db_path" "ALTER TABLE memory_entries ADD COLUMN access_count INTEGER DEFAULT 0;" 2>/dev/null || true
        sqlite3 "$db_path" "ALTER TABLE memory_entries ADD COLUMN last_accessed_at TEXT DEFAULT NULL;" 2>/dev/null || true

        sqlite3 "$db_path" <<'MEMSQLV2'
CREATE TABLE IF NOT EXISTS memory_relations (
  source_id INTEGER NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  target_id INTEGER NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'related',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (source_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_archived ON memory_entries(archived_at);
CREATE INDEX IF NOT EXISTS idx_memory_entries_importance ON memory_entries(importance);
CREATE INDEX IF NOT EXISTS idx_memory_relations_target ON memory_relations(target_id);
MEMSQLV2

        echo "   ✅ Memory DB created via sqlite3 CLI"
    else
        echo "   ⚠️  sqlite3 not found, memory DB will be created on first use"
    fi
}

# Try tsx setup first, fallback to sqlite3 CLI
SETUP_SCRIPT="$MCP_DIR/_setup-memory.ts"
cat > "$SETUP_SCRIPT" <<'TSEOF'
import { initMemoryDb, seedInitialTags } from './memory-store.js';

const dbResult = initMemoryDb();
console.log(`Memory DB initialized: ${dbResult.path}`);
const tagResult = seedInitialTags();
console.log(`Tags seeded: ${tagResult.seeded} new, ${tagResult.total} total`);
TSEOF

(cd "$MCP_DIR" && npx tsx _setup-memory.ts 2>/dev/null) || {
    echo "   ⚠️  memory DB setup via tsx failed, trying sqlite3 fallback..."
    rm -f "$SETUP_SCRIPT"
    setup_memory_db_fallback "$MEMORY_DB"
}
rm -f "$SETUP_SCRIPT"

echo ""
echo "✅ Kanban MCP Server installation complete!"
echo ""
echo "📖 What was installed:"
echo "   • MCP server: $MCP_DIR/kanban-mcp-server.ts"
echo "   • Memory store: $MCP_DIR/memory-store.ts"
echo "   • Lock utility: $MCP_DIR/kanban-lock.ts"
echo "   • Memory DB: $MEMORY_DB"
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
echo "   • memory_store - Store knowledge with upsert logic"
echo "   • memory_search - Full-text search across memories"
echo "   • memory_recall - Recall by ID, topic, or tag"
echo "   • memory_list_tags - List available tags"
echo "   • memory_update - Update existing memory entries"
echo "   • memory_delete - Archive or permanently delete entries"
echo "   • memory_stats - Memory system statistics"
echo ""
echo "🎯 Purpose: Prevents JSON corruption from race conditions when"
echo "   multiple Claude sessions or the web UI access kanban.json simultaneously."
echo ""
