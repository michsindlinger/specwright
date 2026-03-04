/**
 * Memory Store Module for Specwright MCP Server
 *
 * Persistent knowledge storage using SQLite with FTS5 full-text search.
 * Provides CRUD operations for memory entries with tag-based organization,
 * upsert logic (summary replace + details append), and full-text search.
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

export interface MemoryEntry {
  id: number;
  project_id: string | null;
  topic: string;
  summary: string;
  details: string | null;
  source: string | null;
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
}

export interface MemorySearchArgs {
  query: string;
  tags?: string[];
  project_id?: string | null;
  limit?: number;
}

export interface MemoryRecallArgs {
  id?: number;
  topic?: string;
  tag?: string;
  project_id?: string | null;
  limit?: number;
}

export interface MemorySearchResult {
  id: number;
  project_id: string | null;
  topic: string;
  summary: string;
  details: string | null;
  source: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  rank?: number;
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
  const { topic, summary, details, tags, project_id = null, source = null } = args;

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
      SET summary = ?, details = ?, source = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(summary, newDetails, source, existingEntry.id);

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
      INSERT INTO memory_entries (project_id, topic, summary, details, source)
      VALUES (?, ?, ?, ?, ?)
    `).run(project_id, topic, summary, details ?? null, source);

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
  const { query, tags, project_id, limit = 20 } = args;

  let sql: string;
  const params: unknown[] = [];

  if (tags && tags.length > 0) {
    // Search with tag filter
    sql = `
      SELECT DISTINCT e.id, e.project_id, e.topic, e.summary, e.details,
             e.source, e.created_at, e.updated_at, f.rank
      FROM memory_fts f
      JOIN memory_entries e ON e.id = f.rowid
      JOIN memory_entry_tags et ON et.entry_id = e.id
      JOIN memory_tags t ON t.id = et.tag_id
      WHERE memory_fts MATCH ?
        AND t.name IN (${tags.map(() => '?').join(',')})
    `;
    params.push(query, ...tags);

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
             e.source, e.created_at, e.updated_at, f.rank
      FROM memory_fts f
      JOIN memory_entries e ON e.id = f.rowid
      WHERE memory_fts MATCH ?
    `;
    params.push(query);

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

    return rows.map((row) => ({
      ...row,
      tags: getTagsForEntry(database, row.id),
    }));
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
  const { id, topic, tag, project_id, limit = 20 } = args;

  if (id) {
    const entry = getEntryWithTags(database, id);
    return entry ? [entry] : [];
  }

  let sql: string;
  const params: unknown[] = [];

  if (topic && tag) {
    sql = `
      SELECT DISTINCT e.id, e.project_id, e.topic, e.summary, e.details,
             e.source, e.created_at, e.updated_at
      FROM memory_entries e
      JOIN memory_entry_tags et ON et.entry_id = e.id
      JOIN memory_tags t ON t.id = et.tag_id
      WHERE e.topic LIKE ? AND t.name = ?
    `;
    params.push(`%${topic}%`, tag);
  } else if (topic) {
    sql = `
      SELECT e.id, e.project_id, e.topic, e.summary, e.details,
             e.source, e.created_at, e.updated_at
      FROM memory_entries e
      WHERE e.topic LIKE ?
    `;
    params.push(`%${topic}%`);
  } else if (tag) {
    sql = `
      SELECT DISTINCT e.id, e.project_id, e.topic, e.summary, e.details,
             e.source, e.created_at, e.updated_at
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
             e.source, e.created_at, e.updated_at
      FROM memory_entries e
    `;
  }

  if (project_id !== undefined) {
    sql += params.length > 0 ? ' AND' : ' WHERE';
    sql += ' (e.project_id IS ? OR e.project_id IS NULL)';
    params.push(project_id);
  }

  sql += ' ORDER BY e.updated_at DESC LIMIT ?';
  params.push(limit);

  const rows = database.prepare(sql).all(...params) as MemoryEntry[];

  return rows.map((row) => ({
    ...row,
    tags: getTagsForEntry(database, row.id),
  }));
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
 * Get a single entry with its tags. Returns null if entry doesn't exist.
 */
function getEntryWithTags(database: Database.Database, entryId: number): MemorySearchResult | null {
  const entry = database.prepare(
    'SELECT * FROM memory_entries WHERE id = ?'
  ).get(entryId) as MemoryEntry | undefined;

  if (!entry) return null;

  return {
    ...entry,
    tags: getTagsForEntry(database, entryId),
  };
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
