import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, statSync, readdirSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

import { ProjectDocsService, ProjectDocNotFoundError, ProjectDocTooLargeError } from '../../src/server/services/project-docs.service.js';

describe('ProjectDocsService (FA-43–FA-46)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'project-docs-'));
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'docs', 'architecture.md'), '# Arch');
    writeFileSync(join(root, 'CLAUDE.md'), '# Claude');
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('lists the five docs in fixed order, missing ones as missing (FA-43)', async () => {
    const svc = new ProjectDocsService({ gitDirty: async () => null });
    const docs = await svc.list(root);
    expect(docs.map((d) => d.key)).toEqual(['product-brief', 'architecture', 'security', 'design', 'claude']);
    expect(docs.map((d) => d.exists)).toEqual([false, true, false, false, true]);
    expect(docs[1]).toMatchObject({ relPath: 'docs/architecture.md', label: 'Architektur', dirty: null });
    expect(docs[0].mtimeMs).toBeNull();
    expect(readdirSync(join(root, 'docs'))).toEqual(['architecture.md']); // nothing created
  });

  it('reports git-dirty in a temp repo', async () => {
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '.'], { cwd: root });
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'init'], { cwd: root });
    const svc = new ProjectDocsService();
    let docs = await svc.list(root);
    expect(docs.find((d) => d.key === 'architecture')?.dirty).toBe(false);
    writeFileSync(join(root, 'docs', 'architecture.md'), '# Arch 2');
    docs = await svc.list(root);
    expect(docs.find((d) => d.key === 'architecture')?.dirty).toBe(true);
    // FA-45: no commit happened
    const log = execFileSync('git', ['log', '--oneline'], { cwd: root, encoding: 'utf-8' });
    expect(log.trim().split('\n')).toHaveLength(1);
  });

  it('read returns content + mtime; missing → NOT_FOUND', async () => {
    const svc = new ProjectDocsService({ gitDirty: async () => null });
    const r = await svc.read(root, 'architecture');
    expect(r.content).toBe('# Arch');
    expect(r.mtimeMs).toBe(statSync(join(root, 'docs', 'architecture.md')).mtimeMs);
    await expect(svc.read(root, 'design')).rejects.toBeInstanceOf(ProjectDocNotFoundError);
  });

  it('write with matching expectedMtime succeeds; only that file changes (FA-45)', async () => {
    const svc = new ProjectDocsService({ gitDirty: async () => null });
    const { mtimeMs } = await svc.read(root, 'architecture');
    const res = await svc.write(root, 'architecture', '# Arch neu', mtimeMs);
    expect(res.ok).toBe(true);
    expect(readFileSync(join(root, 'docs', 'architecture.md'), 'utf-8')).toBe('# Arch neu');
    expect(readFileSync(join(root, 'CLAUDE.md'), 'utf-8')).toBe('# Claude');
    expect(readdirSync(join(root, 'docs'))).toEqual(['architecture.md']); // no tmp left
  });

  it('write is held back on a changed file, force overrides (FA-46)', async () => {
    const svc = new ProjectDocsService({ gitDirty: async () => null });
    const { mtimeMs } = await svc.read(root, 'architecture');
    const later = new Date(Date.now() + 5000);
    utimesSync(join(root, 'docs', 'architecture.md'), later, later);
    const res = await svc.write(root, 'architecture', '# mine', mtimeMs);
    expect(res).toMatchObject({ ok: false, conflict: true });
    expect(readFileSync(join(root, 'docs', 'architecture.md'), 'utf-8')).toBe('# Arch');
    const forced = await svc.write(root, 'architecture', '# mine', mtimeMs, true);
    expect(forced.ok).toBe(true);
    expect(readFileSync(join(root, 'docs', 'architecture.md'), 'utf-8')).toBe('# mine');
  });

  it('never creates a missing doc; rejects > 1 MB', async () => {
    const svc = new ProjectDocsService({ gitDirty: async () => null });
    await expect(svc.write(root, 'design', 'x', null)).rejects.toBeInstanceOf(ProjectDocNotFoundError);
    await expect(svc.write(root, 'architecture', 'x'.repeat(1024 * 1024 + 1), null)).rejects.toBeInstanceOf(ProjectDocTooLargeError);
  });
});
