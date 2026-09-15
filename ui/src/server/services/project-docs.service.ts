/**
 * ProjectDocsService — the five project docs (product brief, architecture,
 * security, design, CLAUDE.md) of a registered project (FA-43–FA-46).
 *
 * Deliberately narrower than file.service: fixed keys instead of free paths,
 * a "since opened" check (`expectedMtime`) before writing, atomic writes, no
 * commit. Missing files are reported, never created.
 */

import * as fs from 'fs';
import { dirname, basename } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { PROJECT_DOC_REL_PATHS, projectDocPath } from '../utils/project-dirs.js';
import {
  PROJECT_DOC_KEYS,
  VORHABEN_MAX_DOC_BYTES,
  type ProjectDocEntry,
  type ProjectDocKey,
} from '../../shared/types/vorhaben.protocol.js';

const execFileAsync = promisify(execFile);

export const PROJECT_DOC_LABELS: Record<ProjectDocKey, string> = {
  'product-brief': 'Product Brief',
  architecture: 'Architektur',
  security: 'Sicherheit',
  design: 'Design',
  claude: 'CLAUDE.md',
};

export function isProjectDocKey(v: unknown): v is ProjectDocKey {
  return typeof v === 'string' && (PROJECT_DOC_KEYS as readonly string[]).includes(v);
}

export class ProjectDocNotFoundError extends Error {
  public readonly code = 'NOT_FOUND' as const;
}
export class ProjectDocTooLargeError extends Error {
  public readonly code = 'TOO_LARGE' as const;
}

export interface ProjectDocRead {
  content: string;
  mtimeMs: number;
}

export type ProjectDocWriteResult = { ok: true; mtimeMs: number } | { ok: false; conflict: true; currentMtime: number };

export interface ProjectDocsDeps {
  /** `git status --porcelain -- <rel>` runner; null result = not a git repo. */
  gitDirty?: (projectPath: string, relPath: string) => Promise<boolean | null>;
}

async function defaultGitDirty(projectPath: string, relPath: string): Promise<boolean | null> {
  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain', '--', relPath], {
      cwd: projectPath,
      timeout: 5000,
      encoding: 'utf-8',
    });
    return stdout.trim().length > 0;
  } catch {
    return null;
  }
}

export class ProjectDocsService {
  private readonly gitDirty: NonNullable<ProjectDocsDeps['gitDirty']>;

  constructor(deps: ProjectDocsDeps = {}) {
    this.gitDirty = deps.gitDirty ?? defaultGitDirty;
  }

  public async list(projectPath: string): Promise<ProjectDocEntry[]> {
    const out: ProjectDocEntry[] = [];
    for (const key of PROJECT_DOC_KEYS) {
      const relPath = PROJECT_DOC_REL_PATHS[key];
      const abs = projectDocPath(projectPath, key);
      let mtimeMs: number | null = null;
      try {
        const st = await fs.promises.stat(abs);
        if (st.isFile()) mtimeMs = st.mtimeMs;
      } catch {
        mtimeMs = null;
      }
      const exists = mtimeMs !== null;
      const dirty = exists ? await this.gitDirty(projectPath, relPath) : null;
      out.push({ key, label: PROJECT_DOC_LABELS[key], relPath, exists, mtimeMs, dirty });
    }
    return out;
  }

  public async read(projectPath: string, key: ProjectDocKey): Promise<ProjectDocRead> {
    const abs = projectDocPath(projectPath, key);
    let st: fs.Stats;
    try {
      st = await fs.promises.stat(abs);
    } catch {
      throw new ProjectDocNotFoundError(`${PROJECT_DOC_REL_PATHS[key]} fehlt`);
    }
    if (!st.isFile()) throw new ProjectDocNotFoundError(`${PROJECT_DOC_REL_PATHS[key]} fehlt`);
    if (st.size > VORHABEN_MAX_DOC_BYTES) throw new ProjectDocTooLargeError(`${PROJECT_DOC_REL_PATHS[key]} ist größer als 1 MB`);
    const content = await fs.promises.readFile(abs, 'utf-8');
    return { content, mtimeMs: st.mtimeMs };
  }

  /**
   * Writes exactly this file (FA-45). Refuses with `conflict` when the file's
   * mtime differs from `expectedMtime` and `force` is not set (FA-46). A file
   * that does not exist is not created (FA-43) — unless the caller expected
   * `null` (it did not exist when opened) and it still does not exist.
   */
  public async write(
    projectPath: string,
    key: ProjectDocKey,
    content: string,
    expectedMtime: number | null,
    force = false
  ): Promise<ProjectDocWriteResult> {
    if (Buffer.byteLength(content, 'utf-8') > VORHABEN_MAX_DOC_BYTES) {
      throw new ProjectDocTooLargeError('Inhalt ist größer als 1 MB');
    }
    const abs = projectDocPath(projectPath, key);
    let current: number | null = null;
    try {
      const st = await fs.promises.stat(abs);
      if (!st.isFile()) throw new ProjectDocNotFoundError(`${PROJECT_DOC_REL_PATHS[key]} fehlt`);
      current = st.mtimeMs;
    } catch (err) {
      if (err instanceof ProjectDocNotFoundError) throw err;
      current = null;
    }
    if (current === null) throw new ProjectDocNotFoundError(`${PROJECT_DOC_REL_PATHS[key]} fehlt — wird nicht angelegt`);
    if (!force && !sameMtime(current, expectedMtime)) {
      return { ok: false, conflict: true, currentMtime: current };
    }
    const tmp = `${dirname(abs)}/.${basename(abs)}.tmp.${process.pid}.${Date.now()}`;
    await fs.promises.writeFile(tmp, content, 'utf-8');
    await fs.promises.rename(tmp, abs);
    const st = await fs.promises.stat(abs);
    return { ok: true, mtimeMs: st.mtimeMs };
  }
}

/** mtimes travel through JSON; tolerate sub-millisecond drift. */
export function sameMtime(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < 1;
}
