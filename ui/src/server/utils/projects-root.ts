import { isAbsolute, join, relative } from 'path';

export function getProjectsRoot(): string | null {
  const raw = process.env.SPECWRIGHT_PROJECTS_ROOT;
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveStoredPath(storedPath: string): string {
  const root = getProjectsRoot();
  if (root && !isAbsolute(storedPath)) {
    return join(root, storedPath);
  }
  return storedPath;
}

export function toStorablePath(absolutePath: string): string {
  const root = getProjectsRoot();
  if (!root) return absolutePath;
  if (!isAbsolute(absolutePath)) return absolutePath;
  const rel = relative(root, absolutePath);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    return absolutePath;
  }
  return rel;
}
