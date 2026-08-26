/**
 * CloudSessionRegistry — on-disk metadata for tmux-backed cloud-terminal
 * sessions, so the backend can rebuild its in-memory session map after a
 * restart and reattach to the surviving tmux sessions.
 *
 * Only written when the tmux backend is enabled: a direct-spawn session cannot
 * survive a restart, so persisting it would promise something we can't keep.
 *
 * Failure policy is deliberately non-destructive: a corrupt or
 * unknown-version file is renamed to a `.unrecognized-<ts>` backup (never
 * silently discarded) and reported as unhealthy, which makes the restore skip
 * orphan-killing — live tmux sessions are never killed just because their
 * metadata became unreadable.
 */

import * as fs from 'fs';
import { dirname } from 'path';
import type {
  CloudTerminalSessionId,
  CloudTerminalType,
  CloudTerminalModelConfig,
} from '../../shared/types/cloud-terminal.protocol.js';

export interface PersistedWorktreeV1 {
  worktreePath: string;
  branchName: string;
  mainProjectPath: string;
  seededClaudeConfig: string[];
}

export interface PersistedCloudSessionV1 {
  sessionId: CloudTerminalSessionId;
  projectPath: string;
  /** Directory the PTY runs in — restored verbatim, doubles as the occupancy key. */
  effectiveCwd: string;
  terminalType: CloudTerminalType;
  modelConfig?: CloudTerminalModelConfig;
  /** ISO timestamp. */
  createdAt: string;
  tmuxSessionName: string;
  runScriptPath: string;
  /** Ownership record of a per-session worktree this session created (if any). */
  worktree?: PersistedWorktreeV1;
  /** True when the session was driven by an auto-mode orchestrator. */
  autoMode: boolean;
  /** Display only. */
  workflowName?: string;
}

interface CloudSessionRegistryFileV1 {
  version: 1;
  port: number;
  updatedAt: string;
  sessions: PersistedCloudSessionV1[];
}

export interface RegistryLoadResult {
  entries: PersistedCloudSessionV1[];
  /**
   * False when the file existed but was unreadable/unknown-version. The
   * restore must then skip orphan-killing (metadata loss must never destroy
   * live sessions).
   */
  healthy: boolean;
}

export class CloudSessionRegistry {
  /** Serializes writes so concurrent upserts can't interleave tmp/rename pairs. */
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  public async load(): Promise<RegistryLoadResult> {
    let raw: string;
    try {
      raw = await fs.promises.readFile(this.filePath, 'utf-8');
    } catch {
      // Missing file is the normal first-boot case.
      return { entries: [], healthy: true };
    }

    try {
      const parsed = JSON.parse(raw) as CloudSessionRegistryFileV1;
      if (parsed.version !== 1 || !Array.isArray(parsed.sessions)) {
        throw new Error(`unrecognized registry format (version: ${String(parsed.version)})`);
      }
      return { entries: parsed.sessions, healthy: true };
    } catch (err) {
      const backup = `${this.filePath}.unrecognized-${Date.now()}`;
      console.error(
        `[CloudSessionRegistry] unreadable registry at ${this.filePath} (${(err as Error).message}) — backing up to ${backup}`
      );
      await fs.promises.rename(this.filePath, backup).catch(() => {});
      return { entries: [], healthy: false };
    }
  }

  public upsert(entry: PersistedCloudSessionV1): Promise<void> {
    return this.mutate((sessions) => {
      const idx = sessions.findIndex((s) => s.sessionId === entry.sessionId);
      if (idx >= 0) sessions[idx] = entry;
      else sessions.push(entry);
      return sessions;
    });
  }

  public remove(sessionId: CloudTerminalSessionId): Promise<void> {
    return this.mutate((sessions) => sessions.filter((s) => s.sessionId !== sessionId));
  }

  public replaceAll(entries: PersistedCloudSessionV1[]): Promise<void> {
    return this.mutate(() => entries);
  }

  private mutate(
    fn: (sessions: PersistedCloudSessionV1[]) => PersistedCloudSessionV1[]
  ): Promise<void> {
    const next = this.writeChain.then(async () => {
      const { entries } = await this.load();
      await this.writeFile(fn(entries));
    }).catch((err) => {
      console.error('[CloudSessionRegistry] write failed:', err);
    });
    this.writeChain = next;
    return next;
  }

  private async writeFile(sessions: PersistedCloudSessionV1[]): Promise<void> {
    const file: CloudSessionRegistryFileV1 = {
      version: 1,
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
      updatedAt: new Date().toISOString(),
      sessions,
    };
    await fs.promises.mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    // Atomic tmp+rename (same pattern as specs-reader.ts) so a crash mid-write
    // can never leave a truncated registry behind.
    const tmpPath = `${this.filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: 0o600 });
    await fs.promises.rename(tmpPath, this.filePath);
  }
}
