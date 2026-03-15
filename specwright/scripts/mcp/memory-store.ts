/**
 * Memory Store Module for Specwright MCP Server
 *
 * Persistent knowledge storage using SQLite with FTS5 full-text search.
 * Provides CRUD operations for memory entries with tag-based organization,
 * upsert logic (summary replace + details append), full-text search,
 * importance levels, archiving, access tracking, and relations.
 *
 * DB location: ~/.specwright/memory.db
 */

import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export type ImportanceLevel = 'tactical' | 'operational' | 'strategic';

export interface MemoryEntry {
  id: number;
  project_id: string | null;
  topic: string;
  summary: string;
  details: string | null;
  source: string | null;
  importance: ImportanceLevel;
  archived_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryTag {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface MemoryStoreArgs {
  topic: string;
  summary: string;
  details?: string | null;
  tags: string[];
  project_id?: string | null;
  source?: string | null;
  importance?: ImportanceLevel;
}

export interface MemorySearchArgs {
  query: string;
  tags?: string[];
  project_id?: string | null;
  limit?: number;
  include_archived?: boolean;
  importance?: string;
}

export interface MemoryRecallArgs {
  id?: number;
  topic?: string;
  tag?: string;
  project_id?: string | null;
  limit?: number;
  include_archived?: boolean;
  importance?: string;
}

export interface MemoryUpdateArgs {
  id: number;
  topic?: string;
  summary?: string;
  details?: string;
  tags?: string[];
  importance?: ImportanceLevel;
  project_id?: string | null;
  related_to?: number[];
}

export interface MemoryDeleteArgs {
  id: number;
  permanent?: boolean;
}

export interface MemoryStatsResult {
  total_entries: number;
  active_entries: number;
  archived_entries: number;
  by_importance: { tactical: number; operational: number; strategic: number };
  by_tag: Array<{ tag: string; count: number }>;
  most_accessed: Array<{ id: number; topic: string; access_count: number }>;
  stale_entries: number;
}

export interface MemorySearchResult {
  id: number;
  project_id: string | null;
  topic: string;
  summary: string;
  details: string | null;
  source: string | null;
  importance: ImportanceLevel;
  archived_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  rank?: number;
  related_entries?: Array<{ id: number; topic: string; relation_type: string }>;
}

// ============================================================================
// Singleton DB Instance (Lazy Initialization)
// ============================================================================

let db: Database.Database | null = null;

const DB_PATH = join(homedir(), '.specwright', 'memory.db');

function getDb(): Database.Database {
  if (db) return db;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  db.pragma('foreign_keys=ON');

  initSchema(db);

  return db;
}

// ============================================================================
// Schema Initialization
// ============================================================================

function initSchema(database: Database.Database): void {
  database.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_memory_entries_project
      ON memory_entries(project_id);

    CREATE INDEX IF NOT EXISTS idx_memory_entries_topic
      ON memory_entries(topic);

    CREATE INDEX IF NOT EXISTS idx_memory_entries_created
      ON memory_entries(created_at);
  `);

  // v2 schema migration: new columns (idempotent via try/catch)
  const alterStatements = [
    "ALTER TABLE memory_entries ADD COLUMN importance TEXT DEFAULT 'operational'",
    'ALTER TABLE memory_entries ADD COLUMN archived_at TEXT DEFAULT NULL',
    'ALTER TABLE memory_entries ADD COLUMN access_count INTEGER DEFAULT 0',
    'ALTER TABLE memory_entries ADD COLUMN last_accessed_at TEXT DEFAULT NULL',
  ];
  for (const stmt of alterStatements) {
    try { database.exec(stmt); } catch { /* column already exists */ }
  }

  // v2 schema: memory_relations table
  database.exec(`
    CREATE TABLE IF NOT EXISTS memory_relations (
      source_id INTEGER NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
      target_id INTEGER NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
      relation_type TEXT NOT NULL DEFAULT 'related',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (source_id, target_id)
    );
  `);

  // v2 indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_memory_entries_archived ON memory_entries(archived_at);
    CREATE INDEX IF NOT EXISTS idx_memory_entries_importance ON memory_entries(importance);
    CREATE INDEX IF NOT EXISTS idx_memory_relations_target ON memory_relations(target_id);
  `);

  // FTS5 virtual table for full-text search (content-sync with memory_entries)
  // Use IF NOT EXISTS via checking sqlite_master
  const ftsExists = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='memory_fts'"
  ).get();

  if (!ftsExists) {
    database.exec(`
      CREATE VIRTUAL TABLE memory_fts USING fts5(
        topic,
        summary,
        details,
        content='memory_entries',
        content_rowid='id'
      );
    `);
  }

  // Content-sync triggers for FTS5
  database.exec(`
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
  `);
}

// ============================================================================
// Importance Validation
// ============================================================================

const VALID_IMPORTANCE: ImportanceLevel[] = ['tactical', 'operational', 'strategic'];

function validateImportance(value: string | undefined): ImportanceLevel {
  if (!value) return 'operational';
  if (VALID_IMPORTANCE.includes(value as ImportanceLevel)) return value as ImportanceLevel;
  throw new Error(`Invalid importance level: "${value}". Must be one of: ${VALID_IMPORTANCE.join(', ')}`);
}

// ============================================================================
// Exported Functions
// ============================================================================

/**
 * Initialize the memory database. Called lazily on first access,
 * but can be called explicitly to ensure DB is ready.
 */
export function initMemoryDb(): { success: boolean; path: string } {
  getDb();
  return { success: true, path: DB_PATH };
}

/**
 * Store a memory entry with upsert logic.
 *
 * Upsert rules (same topic + tag + date):
 * - Summary: REPLACED with new version
 * - Details: APPENDED with timestamp separator
 */
export function memoryStore(args: MemoryStoreArgs): MemorySearchResult {
  const database = getDb();
  const {
    topic, summary, details, tags,
    project_id = null, source = null,
    importance: rawImportance
  } = args;
  const importance = validateImportance(rawImportance);

  // Resolve tag IDs (create if not existing)
  const tagIds = resolveTagIds(database, tags);

  if (tagIds.length === 0) {
    throw new Error('At least one valid tag is required');
  }

  // Check for existing entry with same topic + any of the tags + same date
  // Use local date (not UTC) to match user's timezone for day-boundary upsert logic
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const existingEntry = database.prepare(`
    SELECT DISTINCT e.id, e.summary, e.details
    FROM memory_entries e
    JOIN memory_entry_tags et ON et.entry_id = e.id
    WHERE e.topic = ?
      AND et.tag_id IN (${tagIds.map(() => '?').join(',')})
      AND date(e.created_at) = ?
      AND (e.project_id IS ? OR (e.project_id IS NULL AND ? IS NULL))
    LIMIT 1
  `).get(topic, ...tagIds, today, project_id, project_id) as
    { id: number; summary: string; details: string | null } | undefined;

  let entryId: number;

  if (existingEntry) {
    // Upsert: Update existing entry
    const newDetails = mergeDetails(existingEntry.details, details);

    database.prepare(`
      UPDATE memory_entries
      SET summary = ?, details = ?, source = ?, importance = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(summary, newDetails, source, importance, existingEntry.id);

    entryId = existingEntry.id;

    // Sync tag associations (add any new ones)
    for (const tagId of tagIds) {
      database.prepare(`
        INSERT OR IGNORE INTO memory_entry_tags (entry_id, tag_id)
        VALUES (?, ?)
      `).run(entryId, tagId);
    }
  } else {
    // Insert new entry
    const result = database.prepare(`
      INSERT INTO memory_entries (project_id, topic, summary, details, source, importance)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(project_id, topic, summary, details ?? null, source, importance);

    entryId = Number(result.lastInsertRowid);

    // Link tags
    for (const tagId of tagIds) {
      database.prepare(`
        INSERT INTO memory_entry_tags (entry_id, tag_id)
        VALUES (?, ?)
      `).run(entryId, tagId);
    }
  }

  const result = getEntryWithTags(database, entryId);
  if (!result) {
    throw new Error(`Failed to retrieve entry after store: id=${entryId}`);
  }
  return result;
}

/**
 * Full-text search across memory entries using FTS5.
 */
export function memorySearch(args: MemorySearchArgs): MemorySearchResult[] {
  const database = getDb();
  const {
    query, tags, project_id, limit = 20,
    include_archived = false, importance
  } = args;

  let sql: string;
  const params: unknown[] = [];

  if (tags && tags.length > 0) {
    // Search with tag filter
    sql = `
      SELECT DISTINCT e.id, e.project_id, e.topic, e.summary, e.details,
             e.source, e.importance, e.archived_at, e.access_count,
             e.last_accessed_at, e.created_at, e.updated_at, f.rank
      FROM memory_fts f
      JOIN memory_entries e ON e.id = f.rowid
      JOIN memory_entry_tags et ON et.entry_id = e.id
      JOIN memory_tags t ON t.id = et.tag_id
      WHERE memory_fts MATCH ?
        AND t.name IN (${tags.map(() => '?').join(',')})
    `;
    params.push(query, ...tags);

    if (!include_archived) {
      sql += ' AND e.archived_at IS NULL';
    }

    if (importance) {
      sql += ' AND e.importance = ?';
      params.push(importance);
    }

    if (project_id !== undefined) {
      sql += ' AND (e.project_id IS ? OR e.project_id IS NULL)';
      params.push(project_id);
    }

    sql += ' ORDER BY f.rank LIMIT ?';
    params.push(limit);
  } else {
    // Search without tag filter
    sql = `
      SELECT e.id, e.project_id, e.topic, e.summary, e.details,
             e.source, e.importance, e.archived_at, e.access_count,
             e.last_accessed_at, e.created_at, e.updated_at, f.rank
      FROM memory_fts f
      JOIN memory_entries e ON e.id = f.rowid
      WHERE memory_fts MATCH ?
    `;
    params.push(query);

    if (!include_archived) {
      sql += ' AND e.archived_at IS NULL';
    }

    if (importance) {
      sql += ' AND e.importance = ?';
      params.push(importance);
    }

    if (project_id !== undefined) {
      sql += ' AND (e.project_id IS ? OR e.project_id IS NULL)';
      params.push(project_id);
    }

    sql += ' ORDER BY f.rank LIMIT ?';
    params.push(limit);
  }

  try {
    const rows = database.prepare(sql).all(...params) as Array<
      MemoryEntry & { rank: number }
    >;

    const results = rows.map((row) => ({
      ...row,
      tags: getTagsForEntry(database, row.id),
    }));

    // Track access for returned entries
    trackAccess(database, results.map((r) => r.id));

    return results;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('fts5')) {
      throw new Error(
        `Invalid search query: "${query}". FTS5 supports: plain words, "quoted phrases", AND, OR, NOT. Error: ${msg}`
      );
    }
    throw err;
  }
}

/**
 * Recall memory entries by ID, topic, or tag.
 */
export function memoryRecall(args: MemoryRecallArgs): MemorySearchResult[] {
  const database = getDb();
  const {
    id, topic, tag, project_id, limit = 20,
    include_archived = false, importance
  } = args;

  if (id) {
    const entry = getEntryWithTags(database, id);
    if (entry) trackAccess(database, [entry.id]);
    return entry ? [entry] : [];
  }

  let sql: string;
  const params: unknown[] = [];

  if (topic && tag) {
    sql = `
      SELECT DISTINCT e.id, e.project_id, e.topic, e.summary, e.details,
             e.source, e.importance, e.archived_at, e.access_count,
             e.last_accessed_at, e.created_at, e.updated_at
      FROM memory_entries e
      JOIN memory_entry_tags et ON et.entry_id = e.id
      JOIN memory_tags t ON t.id = et.tag_id
      WHERE e.topic LIKE ? AND t.name = ?
    `;
    params.push(`%${topic}%`, tag);
  } else if (topic) {
    sql = `
      SELECT e.id, e.project_id, e.topic, e.summary, e.details,
             e.source, e.importance, e.archived_at, e.access_count,
             e.last_accessed_at, e.created_at, e.updated_at
      FROM memory_entries e
      WHERE e.topic LIKE ?
    `;
    params.push(`%${topic}%`);
  } else if (tag) {
    sql = `
      SELECT DISTINCT e.id, e.project_id, e.topic, e.summary, e.details,
             e.source, e.importance, e.archived_at, e.access_count,
             e.last_accessed_at, e.created_at, e.updated_at
      FROM memory_entries e
      JOIN memory_entry_tags et ON et.entry_id = e.id
      JOIN memory_tags t ON t.id = et.tag_id
      WHERE t.name = ?
    `;
    params.push(tag);
  } else {
    // No filters - return recent entries
    sql = `
      SELECT e.id, e.project_id, e.topic, e.summary, e.details,
             e.source, e.importance, e.archived_at, e.access_count,
             e.last_accessed_at, e.created_at, e.updated_at
      FROM memory_entries e
    `;
  }

  if (!include_archived) {
    sql += params.length > 0 ? ' AND' : ' WHERE';
    sql += ' e.archived_at IS NULL';
  }

  if (importance) {
    sql += (params.length > 0 || !include_archived) ? ' AND' : ' WHERE';
    sql += ' e.importance = ?';
    params.push(importance);
  }

  if (project_id !== undefined) {
    sql += (params.length > 0 || !include_archived || importance) ? ' AND' : ' WHERE';
    sql += ' (e.project_id IS ? OR e.project_id IS NULL)';
    params.push(project_id);
  }

  sql += ' ORDER BY e.updated_at DESC LIMIT ?';
  params.push(limit);

  const rows = database.prepare(sql).all(...params) as MemoryEntry[];

  const results = rows.map((row) => ({
    ...row,
    tags: getTagsForEntry(database, row.id),
  }));

  // Track access for returned entries
  trackAccess(database, results.map((r) => r.id));

  return results;
}

/**
 * Update an existing memory entry. Only provided fields are modified.
 */
export function memoryUpdate(args: MemoryUpdateArgs): MemorySearchResult {
  const database = getDb();
  const { id, topic, summary, details, tags, importance: rawImportance, project_id, related_to } = args;

  // Verify entry exists
  const existing = database.prepare('SELECT id FROM memory_entries WHERE id = ?').get(id) as { id: number } | undefined;
  if (!existing) {
    throw new Error(`Memory entry not found: id=${id}`);
  }

  // Build dynamic UPDATE
  const setClauses: string[] = [];
  const updateParams: unknown[] = [];

  if (topic !== undefined) {
    setClauses.push('topic = ?');
    updateParams.push(topic);
  }
  if (summary !== undefined) {
    setClauses.push('summary = ?');
    updateParams.push(summary);
  }
  if (details !== undefined) {
    setClauses.push('details = ?');
    updateParams.push(details);
  }
  if (rawImportance !== undefined) {
    const importance = validateImportance(rawImportance);
    setClauses.push('importance = ?');
    updateParams.push(importance);
  }
  if (project_id !== undefined) {
    setClauses.push('project_id = ?');
    updateParams.push(project_id);
  }

  if (setClauses.length > 0) {
    setClauses.push("updated_at = datetime('now')");
    updateParams.push(id);
    database.prepare(
      `UPDATE memory_entries SET ${setClauses.join(', ')} WHERE id = ?`
    ).run(...updateParams);
  }

  // Replace tags if provided
  if (tags !== undefined) {
    const tagIds = resolveTagIds(database, tags);
    database.prepare('DELETE FROM memory_entry_tags WHERE entry_id = ?').run(id);
    for (const tagId of tagIds) {
      database.prepare(
        'INSERT INTO memory_entry_tags (entry_id, tag_id) VALUES (?, ?)'
      ).run(id, tagId);
    }
  }

  // Create relations if provided
  if (related_to && related_to.length > 0) {
    for (const targetId of related_to) {
      // Verify target exists
      const target = database.prepare('SELECT id FROM memory_entries WHERE id = ?').get(targetId);
      if (target) {
        database.prepare(
          "INSERT OR IGNORE INTO memory_relations (source_id, target_id, relation_type) VALUES (?, ?, 'related')"
        ).run(id, targetId);
      }
    }
  }

  const result = getEntryWithTags(database, id);
  if (!result) {
    throw new Error(`Failed to retrieve entry after update: id=${id}`);
  }
  return result;
}

/**
 * Archive or permanently delete a memory entry.
 */
export function memoryDelete(args: MemoryDeleteArgs): { success: boolean; action: 'archived' | 'deleted' } {
  const database = getDb();
  const { id, permanent = false } = args;

  // Verify entry exists
  const existing = database.prepare('SELECT id FROM memory_entries WHERE id = ?').get(id) as { id: number } | undefined;
  if (!existing) {
    throw new Error(`Memory entry not found: id=${id}`);
  }

  if (permanent) {
    // Hard delete - CASCADE handles entry_tags and relations
    database.prepare('DELETE FROM memory_entries WHERE id = ?').run(id);
    return { success: true, action: 'deleted' };
  } else {
    // Soft delete - set archived_at
    database.prepare(
      "UPDATE memory_entries SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    return { success: true, action: 'archived' };
  }
}

/**
 * Get memory system statistics for housekeeping.
 */
export function memoryStats(): MemoryStatsResult {
  const database = getDb();

  const totalRow = database.prepare(
    'SELECT COUNT(*) AS count FROM memory_entries'
  ).get() as { count: number };

  const activeRow = database.prepare(
    'SELECT COUNT(*) AS count FROM memory_entries WHERE archived_at IS NULL'
  ).get() as { count: number };

  const archivedRow = database.prepare(
    'SELECT COUNT(*) AS count FROM memory_entries WHERE archived_at IS NOT NULL'
  ).get() as { count: number };

  // By importance
  const importanceRows = database.prepare(`
    SELECT COALESCE(importance, 'operational') AS importance, COUNT(*) AS count
    FROM memory_entries WHERE archived_at IS NULL
    GROUP BY importance
  `).all() as Array<{ importance: string; count: number }>;

  const byImportance = { tactical: 0, operational: 0, strategic: 0 };
  for (const row of importanceRows) {
    if (row.importance in byImportance) {
      byImportance[row.importance as ImportanceLevel] = row.count;
    }
  }

  // By tag (active entries only)
  const byTag = database.prepare(`
    SELECT t.name AS tag, COUNT(DISTINCT et.entry_id) AS count
    FROM memory_tags t
    JOIN memory_entry_tags et ON et.tag_id = t.id
    JOIN memory_entries e ON e.id = et.entry_id
    WHERE e.archived_at IS NULL
    GROUP BY t.name
    ORDER BY count DESC
  `).all() as Array<{ tag: string; count: number }>;

  // Most accessed (top 10, active only)
  const mostAccessed = database.prepare(`
    SELECT id, topic, access_count
    FROM memory_entries
    WHERE archived_at IS NULL AND access_count > 0
    ORDER BY access_count DESC
    LIMIT 10
  `).all() as Array<{ id: number; topic: string; access_count: number }>;

  // Stale entries: active, not accessed in 30+ days (or never accessed and created 30+ days ago)
  const staleRow = database.prepare(`
    SELECT COUNT(*) AS count
    FROM memory_entries
    WHERE archived_at IS NULL
      AND (
        (last_accessed_at IS NOT NULL AND last_accessed_at < datetime('now', '-30 days'))
        OR (last_accessed_at IS NULL AND created_at < datetime('now', '-30 days'))
      )
  `).get() as { count: number };

  return {
    total_entries: totalRow.count,
    active_entries: activeRow.count,
    archived_entries: archivedRow.count,
    by_importance: byImportance,
    by_tag: byTag,
    most_accessed: mostAccessed,
    stale_entries: staleRow.count,
  };
}

/**
 * Generate a compact context summary for LLM injection.
 * Groups by importance: Strategic first, then Operational, then Tactical.
 */
export function memoryContextSummary(args: {
  project_id?: string;
  tags?: string[];
  limit?: number;
}): string {
  const database = getDb();
  const { project_id, tags, limit = 50 } = args;

  let sql: string;
  const params: unknown[] = [];

  if (tags && tags.length > 0) {
    sql = `
      SELECT DISTINCT e.id, e.topic, e.summary, e.importance,
             GROUP_CONCAT(t2.name, ', ') AS tag_list
      FROM memory_entries e
      JOIN memory_entry_tags et ON et.entry_id = e.id
      JOIN memory_tags t ON t.id = et.tag_id
      LEFT JOIN memory_entry_tags et2 ON et2.entry_id = e.id
      LEFT JOIN memory_tags t2 ON t2.id = et2.tag_id
      WHERE e.archived_at IS NULL
        AND t.name IN (${tags.map(() => '?').join(',')})
    `;
    params.push(...tags);
  } else {
    sql = `
      SELECT e.id, e.topic, e.summary, e.importance,
             GROUP_CONCAT(t2.name, ', ') AS tag_list
      FROM memory_entries e
      LEFT JOIN memory_entry_tags et2 ON et2.entry_id = e.id
      LEFT JOIN memory_tags t2 ON t2.id = et2.tag_id
      WHERE e.archived_at IS NULL
    `;
  }

  if (project_id !== undefined) {
    sql += ' AND (e.project_id IS ? OR e.project_id IS NULL)';
    params.push(project_id);
  }

  sql += ' GROUP BY e.id ORDER BY CASE e.importance';
  sql += "   WHEN 'strategic' THEN 1";
  sql += "   WHEN 'operational' THEN 2";
  sql += "   WHEN 'tactical' THEN 3";
  sql += '   ELSE 4 END, e.updated_at DESC';
  sql += ' LIMIT ?';
  params.push(limit);

  const rows = database.prepare(sql).all(...params) as Array<{
    id: number;
    topic: string;
    summary: string;
    importance: string;
    tag_list: string | null;
  }>;

  // Track access
  trackAccess(database, rows.map((r) => r.id));

  // Build markdown grouped by importance
  const groups: Record<string, typeof rows> = {
    strategic: [],
    operational: [],
    tactical: [],
  };
  for (const row of rows) {
    const key = row.importance || 'operational';
    if (groups[key]) groups[key].push(row);
    else groups.operational.push(row);
  }

  const lines: string[] = ['# Memory Context'];

  if (groups.strategic.length > 0) {
    lines.push('', '## Strategic');
    for (const r of groups.strategic) {
      lines.push(`- **${r.topic}** (${r.tag_list || 'untagged'}): ${r.summary}`);
    }
  }
  if (groups.operational.length > 0) {
    lines.push('', '## Operational');
    for (const r of groups.operational) {
      lines.push(`- **${r.topic}** (${r.tag_list || 'untagged'}): ${r.summary}`);
    }
  }
  if (groups.tactical.length > 0) {
    lines.push('', '## Tactical');
    for (const r of groups.tactical) {
      lines.push(`- **${r.topic}** (${r.tag_list || 'untagged'}): ${r.summary}`);
    }
  }

  if (rows.length === 0) {
    lines.push('', '_No memory entries found._');
  }

  return lines.join('\n');
}

/**
 * List all available tags with entry counts.
 */
export function memoryListTags(): Array<MemoryTag & { entry_count: number }> {
  const database = getDb();

  return database.prepare(`
    SELECT t.id, t.name, t.description, t.created_at,
           COUNT(et.entry_id) AS entry_count
    FROM memory_tags t
    LEFT JOIN memory_entry_tags et ON et.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.name COLLATE NOCASE
  `).all() as Array<MemoryTag & { entry_count: number }>;
}

/**
 * Seed the initial set of 15 tags. Idempotent - skips existing tags.
 */
export function seedInitialTags(): { seeded: number; total: number } {
  const database = getDb();

  const initialTags: Array<{ name: string; description: string }> = [
    { name: 'architecture', description: 'Architectural decisions and patterns' },
    { name: 'decision', description: 'Key decisions made during development' },
    { name: 'feature', description: 'Feature descriptions and behavior' },
    { name: 'backend', description: 'Backend-specific knowledge' },
    { name: 'frontend', description: 'Frontend-specific knowledge' },
    { name: 'database', description: 'Database schema, queries, and patterns' },
    { name: 'api', description: 'API design and contracts' },
    { name: 'testing', description: 'Testing strategies and patterns' },
    { name: 'deployment', description: 'Deployment and infrastructure' },
    { name: 'security', description: 'Security considerations and practices' },
    { name: 'performance', description: 'Performance optimizations and benchmarks' },
    { name: 'convention', description: 'Coding conventions and style guidelines' },
    { name: 'dependency', description: 'External dependencies and libraries' },
    { name: 'workflow', description: 'Development workflows and processes' },
    { name: 'domain', description: 'Domain-specific business logic' },
  ];

  const insertStmt = database.prepare(`
    INSERT OR IGNORE INTO memory_tags (name, description)
    VALUES (?, ?)
  `);

  let seeded = 0;
  for (const tag of initialTags) {
    const result = insertStmt.run(tag.name, tag.description);
    if (result.changes > 0) seeded++;
  }

  const total = (database.prepare('SELECT COUNT(*) AS count FROM memory_tags').get() as { count: number }).count;

  return { seeded, total };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Resolve tag names to IDs. Creates tags that don't exist yet.
 * Uses COLLATE NOCASE for case-insensitive matching.
 */
function resolveTagIds(database: Database.Database, tagNames: string[]): number[] {
  const ids: number[] = [];

  const findStmt = database.prepare(
    'SELECT id FROM memory_tags WHERE name = ? COLLATE NOCASE'
  );
  const insertStmt = database.prepare(
    'INSERT INTO memory_tags (name) VALUES (?)'
  );

  for (const name of tagNames) {
    const existing = findStmt.get(name) as { id: number } | undefined;
    if (existing) {
      ids.push(existing.id);
    } else {
      const result = insertStmt.run(name);
      ids.push(Number(result.lastInsertRowid));
    }
  }

  return ids;
}

/**
 * Get all tags for a specific entry.
 */
function getTagsForEntry(database: Database.Database, entryId: number): string[] {
  const rows = database.prepare(`
    SELECT t.name
    FROM memory_tags t
    JOIN memory_entry_tags et ON et.tag_id = t.id
    WHERE et.entry_id = ?
    ORDER BY t.name COLLATE NOCASE
  `).all(entryId) as Array<{ name: string }>;

  return rows.map((r) => r.name);
}

/**
 * Get related entries for a specific entry.
 */
function getRelatedEntries(database: Database.Database, entryId: number): Array<{ id: number; topic: string; relation_type: string }> {
  return database.prepare(`
    SELECT e.id, e.topic, r.relation_type
    FROM memory_relations r
    JOIN memory_entries e ON e.id = r.target_id
    WHERE r.source_id = ?
    UNION
    SELECT e.id, e.topic, r.relation_type
    FROM memory_relations r
    JOIN memory_entries e ON e.id = r.source_id
    WHERE r.target_id = ?
  `).all(entryId, entryId) as Array<{ id: number; topic: string; relation_type: string }>;
}

/**
 * Get a single entry with its tags and related entries.
 */
function getEntryWithTags(database: Database.Database, entryId: number): MemorySearchResult | null {
  const entry = database.prepare(
    'SELECT * FROM memory_entries WHERE id = ?'
  ).get(entryId) as MemoryEntry | undefined;

  if (!entry) return null;

  const related = getRelatedEntries(database, entryId);

  return {
    ...entry,
    tags: getTagsForEntry(database, entryId),
    related_entries: related.length > 0 ? related : undefined,
  };
}

/**
 * Track access for a list of entry IDs (increment access_count, update last_accessed_at).
 */
function trackAccess(database: Database.Database, ids: number[]): void {
  if (ids.length === 0) return;
  const stmt = database.prepare(
    "UPDATE memory_entries SET access_count = access_count + 1, last_accessed_at = datetime('now') WHERE id = ?"
  );
  for (const id of ids) {
    stmt.run(id);
  }
}

/**
 * Merge details for upsert: append new details with timestamp separator.
 */
function mergeDetails(existing: string | null, incoming: string | null | undefined): string | null {
  if (!incoming) return existing;
  if (!existing) return incoming;

  const timestamp = new Date().toISOString();
  return `${existing}\n\n---\n[${timestamp}]\n${incoming}`;
}
