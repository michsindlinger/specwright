import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { resolveProjectDir } from '../utils/project-dirs.js';

const router = Router();

const REPO_URL = 'https://raw.githubusercontent.com/michsindlinger/specwright/main';

// In-memory cache (1 hour TTL)
let cachedLatestVersion: string | null = null;
let cachedChangelog: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface VersionResponse {
  installedVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  changelog: string | null;
}

function readInstalledVersion(projectPath?: string): string | null {
  // Try per-project version first
  if (projectPath) {
    try {
      const dirName = resolveProjectDir(projectPath);
      const versionFile = join(projectPath, dirName, '.installed-version');
      return readFileSync(versionFile, 'utf-8').trim();
    } catch {
      // Fall through to global
    }
  }

  // Try global version
  try {
    const globalVersionFile = join(homedir(), '.specwright', '.version');
    return readFileSync(globalVersionFile, 'utf-8').trim();
  } catch {
    return null;
  }
}

async function fetchFromGitHub(path: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${REPO_URL}/${path}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return (await response.text()).trim();
  } catch {
    return null;
  }
}

async function getLatestVersionAndChangelog(): Promise<{ version: string | null; changelog: string | null }> {
  const now = Date.now();
  if (cachedLatestVersion && now - cacheTimestamp < CACHE_TTL_MS) {
    return { version: cachedLatestVersion, changelog: cachedChangelog };
  }

  const [version, changelog] = await Promise.all([
    fetchFromGitHub('VERSION'),
    fetchFromGitHub('CHANGELOG.md'),
  ]);

  if (version) {
    cachedLatestVersion = version;
    cachedChangelog = changelog;
    cacheTimestamp = now;
  }

  return { version, changelog };
}

function extractChangelogSection(changelog: string, version: string): string | null {
  const lines = changelog.split('\n');
  const startPattern = `## ${version}`;
  let capturing = false;
  const result: string[] = [];

  for (const line of lines) {
    if (line.startsWith(startPattern)) {
      capturing = true;
      result.push(line);
      continue;
    }
    if (capturing && line.match(/^## \d/)) {
      break;
    }
    if (capturing) {
      result.push(line);
    }
  }

  return result.length > 0 ? result.join('\n').trim() : null;
}

/**
 * GET /api/version?projectPath=<path>
 *
 * Returns installed version, latest version, update availability, and changelog.
 */
router.get('/', async (req: Request, res: Response) => {
  const projectPath = req.query.projectPath as string | undefined;

  const installedVersion = readInstalledVersion(projectPath);
  const { version: latestVersion, changelog: rawChangelog } = await getLatestVersionAndChangelog();

  const updateAvailable = !!(
    installedVersion &&
    latestVersion &&
    installedVersion !== latestVersion
  );

  let changelog: string | null = null;
  if (updateAvailable && rawChangelog && latestVersion) {
    changelog = extractChangelogSection(rawChangelog, latestVersion);
  }

  return res.json({
    installedVersion,
    latestVersion,
    updateAvailable,
    changelog,
  } as VersionResponse);
});

export default router;
