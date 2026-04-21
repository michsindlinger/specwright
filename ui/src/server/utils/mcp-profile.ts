/**
 * MCP-Profile-per-Workflow (v3.22.0)
 *
 * Reduces Claude-CLI context overhead by loading only the MCP servers a
 * given workflow actually needs. See specwright/mcp-profiles/README.md for
 * the user-facing contract.
 *
 * Flow (called from each spawn site):
 *   commandName → getMcpProfileForCommand() → profile name or null
 *   profile name + projectPath → loadProfile() → allowlist + allowOptional
 *   <project>/specwright/mcp-always-on.json → full server configs
 *   filter + write /tmp/specwright/mcp-<execId>.json (mode 0o600)
 *   return ['--mcp-config', <tmp>, '--strict-mcp-config']
 *
 * Any failure path (missing profile, missing always-on, missing required
 * server) returns [] so the caller falls back to status-quo spawn behavior.
 */

import { existsSync } from 'fs';
import { mkdir, readFile, writeFile, unlink, chmod } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { projectDir, resolveGlobalDir } from './project-dirs.js';

const TMP_DIR = join(tmpdir(), 'specwright');
const ALWAYS_ON_FILENAME = 'mcp-always-on.json';

/**
 * Hard-coded mapping from normalized command name → profile file basename.
 * Commands not in this map get `null` → no flags appended → status-quo.
 */
const COMMAND_PROFILE_MAP: Record<string, string> = {
  'execute-tasks': 'execute-tasks',
  'create-spec': 'create-spec',
  'validate-market': 'validate-market',
  'validate-market-for-existing': 'validate-market',
};

interface ProfileFile {
  $schema?: string;
  description?: string;
  allowlist?: string[];
  allowOptional?: string[];
}

interface AlwaysOnFile {
  mcpServers?: Record<string, unknown>;
}

interface KanbanJsonLike {
  mcpProfile?: string;
}

/**
 * Normalize a command string and look up the associated profile name.
 * Accepts forms like "/specwright:execute-tasks 2026-04-20-xyz",
 * "specwright:execute-tasks", or "execute-tasks VERY IMPORTANT: ...".
 */
export function getMcpProfileForCommand(commandName: string): string | null {
  const stripped = commandName.replace(/^\/?(specwright|agent-os):/, '');
  const firstToken = stripped.trim().split(/\s+/)[0];
  if (!firstToken) return null;
  return COMMAND_PROFILE_MAP[firstToken] ?? null;
}

/**
 * Look up a per-spec profile override in kanban.json.
 * Non-fatal: any I/O or parse error returns undefined (falls back to command map).
 */
async function readPerSpecOverride(projectPath: string, specId: string): Promise<string | undefined> {
  try {
    const kanbanPath = join(projectDir(projectPath, 'specs', specId), 'kanban.json');
    if (!existsSync(kanbanPath)) return undefined;
    const data = JSON.parse(await readFile(kanbanPath, 'utf-8')) as KanbanJsonLike;
    return typeof data.mcpProfile === 'string' ? data.mcpProfile : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract a spec ID from a command argument string, if present.
 * Matches the YYYY-MM-DD-slug convention used by Specwright specs.
 */
function extractSpecId(commandName: string): string | null {
  const match = commandName.match(/\b(\d{4}-\d{2}-\d{2}-[a-z0-9-]+)/);
  return match ? match[1] : null;
}

/**
 * Load a framework profile file via hybrid lookup:
 *   1. <project>/specwright/mcp-profiles/<name>.json
 *   2. ~/.specwright/mcp-profiles/<name>.json
 */
async function loadProfile(profileName: string, projectPath: string): Promise<ProfileFile | null> {
  const candidates = [
    join(projectDir(projectPath, 'mcp-profiles'), `${profileName}.json`),
    join(resolveGlobalDir(), 'mcp-profiles', `${profileName}.json`),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      return JSON.parse(await readFile(path, 'utf-8')) as ProfileFile;
    } catch (err) {
      console.warn(`[McpProfile] Failed to parse profile ${path}:`, err);
      return null;
    }
  }
  return null;
}

/**
 * Build CLI flags to inject into a Claude spawn. Returns [] (status-quo) on
 * any failure path or when the feature is disabled.
 */
export async function buildMcpFlags(
  commandName: string,
  projectPath: string,
  executionId: string
): Promise<string[]> {
  // Kill-switch: env-level opt-out for quick rollback
  if (process.env.SPECWRIGHT_MCP_PROFILES === 'off') {
    return [];
  }

  // Determine profile name: per-spec override beats command map
  let profileName: string | null = null;
  const specId = extractSpecId(commandName);
  if (specId) {
    const override = await readPerSpecOverride(projectPath, specId);
    if (override) profileName = override;
  }
  if (!profileName) profileName = getMcpProfileForCommand(commandName);
  if (!profileName) return [];

  // Load framework profile
  const profile = await loadProfile(profileName, projectPath);
  if (!profile) {
    console.warn(`[McpProfile] Profile "${profileName}" not found — falling back to full MCP set`);
    return [];
  }
  const required = profile.allowlist ?? [];
  const optional = profile.allowOptional ?? [];

  // Load user's project-scoped always-on config (full server configs)
  const alwaysOnPath = join(projectDir(projectPath, ''), ALWAYS_ON_FILENAME);
  if (!existsSync(alwaysOnPath)) {
    console.warn(
      `[McpProfile] ${ALWAYS_ON_FILENAME} not found at ${alwaysOnPath} — ` +
      `falling back to full MCP set. See specwright/mcp-profiles/README.md for setup.`
    );
    return [];
  }
  let alwaysOn: AlwaysOnFile;
  try {
    alwaysOn = JSON.parse(await readFile(alwaysOnPath, 'utf-8')) as AlwaysOnFile;
  } catch (err) {
    console.warn(`[McpProfile] Failed to parse ${alwaysOnPath}:`, err);
    return [];
  }
  const availableServers = alwaysOn.mcpServers ?? {};

  // Validate required servers are all present
  const missingRequired = required.filter(name => !(name in availableServers));
  if (missingRequired.length > 0) {
    console.warn(
      `[McpProfile] Profile "${profileName}" requires servers missing from ` +
      `${ALWAYS_ON_FILENAME}: ${missingRequired.join(', ')} — falling back to full MCP set`
    );
    return [];
  }

  // Filter: include all required + any optional that happen to be present
  const filteredServers: Record<string, unknown> = {};
  for (const name of required) {
    filteredServers[name] = availableServers[name];
  }
  for (const name of optional) {
    if (name in availableServers) {
      filteredServers[name] = availableServers[name];
    }
  }

  // Write temp .mcp.json with restrictive permissions
  await mkdir(TMP_DIR, { recursive: true, mode: 0o700 });
  const tmpPath = join(TMP_DIR, `mcp-${sanitizeId(executionId)}.json`);
  const payload = JSON.stringify({ mcpServers: filteredServers }, null, 2);
  await writeFile(tmpPath, payload, { encoding: 'utf-8', mode: 0o600 });
  // Explicit chmod in case writeFile mode was masked by umask
  await chmod(tmpPath, 0o600);

  const serverCount = Object.keys(filteredServers).length;
  console.log(
    `[McpProfile] Applied profile "${profileName}" with ${serverCount} server(s): ` +
    `${Object.keys(filteredServers).join(', ') || '(none)'} → ${tmpPath}`
  );

  return ['--mcp-config', tmpPath, '--strict-mcp-config'];
}

/**
 * Best-effort cleanup of a temp file. Called from spawn-site exit handlers.
 * Silently swallows errors — the OS will eventually clean /tmp anyway.
 */
export async function cleanupMcpTempFile(flags: string[]): Promise<void> {
  // Flags arrive as ['--mcp-config', <path>, '--strict-mcp-config'] or []
  if (flags.length < 2 || flags[0] !== '--mcp-config') return;
  const tmpPath = flags[1];
  if (!tmpPath.startsWith(TMP_DIR)) return; // defensive: only clean our own files
  try {
    await unlink(tmpPath);
  } catch {
    // file may already be gone; no-op
  }
}

/**
 * Replace anything non-alphanumeric with "_" so the execution id is safe as a filename.
 */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 96);
}
