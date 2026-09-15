/**
 * VorhabenStateStore — user state of the Vorhaben view, one file per backend
 * (`<runtime>/vorhaben-<port>.json`, ADR-0002). Same durability as the
 * workspace store: versioned JSON, serialized atomic writes (tmp+rename,
 * 0600), unreadable file renamed aside.
 *
 * Stage 1 (INT-2026-004) uses `docDrafts` (FA-47). The other maps are part of
 * the file format already so stage 2 (assignments, review drafts, protocol,
 * last model) is additive.
 */

import * as fs from 'fs';
import { dirname } from 'path';
import type { ProjectDocDraft, ProjectDocKey, VorhabenStep } from '../../shared/types/vorhaben.protocol.js';

export interface VorhabenAssignment {
  sessionId: string;
  step: VorhabenStep;
  model: string;
  cwd: string;
  at: string;
  ended?: boolean;
}

export interface VorhabenStateData {
  /** `${projectId}::${intentId}` → session assignment (stage 2). */
  assignments: Record<string, VorhabenAssignment>;
  /** `${projectId}::${intentId}::${doc}` → review drafts (stage 2). */
  drafts: Record<string, unknown[]>;
  /** Sent answers (stage 2). */
  protocol: unknown[];
  /** `${projectId}::${intentId}::${step}` → last model selection (stage 2). */
  lastModel: Record<string, { providerId: string; modelId: string }>;
  /** `${projectId}::${docKey}` → unsaved project-doc text (FA-47). */
  docDrafts: Record<string, ProjectDocDraft>;
}

interface VorhabenStateFileV1 {
  version: 1;
  port: number;
  updatedAt: string;
  state: VorhabenStateData;
}

export interface VorhabenStoreDeps {
  port?: number;
  now?: () => Date;
}

export interface VorhabenLoadResult {
  existed: boolean;
  healthy: boolean;
}

export function docDraftKey(projectId: string, key: ProjectDocKey): string {
  return `${projectId}::${key}`;
}

function emptyState(): VorhabenStateData {
  return { assignments: {}, drafts: {}, protocol: [], lastModel: {}, docDrafts: {} };
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export class VorhabenStateStore {
  private state: VorhabenStateData = emptyState();
  private writeChain: Promise<void> = Promise.resolve();
  private readonly now: () => Date;
  private readonly port: number;
  private updatedAt: string;

  constructor(private readonly filePath: string, deps: VorhabenStoreDeps = {}) {
    this.now = deps.now ?? ((): Date => new Date());
    this.port = deps.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3001);
    this.updatedAt = this.now().toISOString();
  }

  public async load(): Promise<VorhabenLoadResult> {
    let raw: string;
    try {
      raw = await fs.promises.readFile(this.filePath, 'utf-8');
    } catch {
      return { existed: false, healthy: true };
    }
    try {
      const parsed = JSON.parse(raw) as VorhabenStateFileV1;
      if (parsed.version !== 1 || !isRecord(parsed.state)) {
        throw new Error(`unrecognized vorhaben state format (version: ${String(parsed.version)})`);
      }
      const s = parsed.state as Partial<VorhabenStateData>;
      this.state = {
        assignments: isRecord(s.assignments) ? (s.assignments as VorhabenStateData['assignments']) : {},
        drafts: isRecord(s.drafts) ? (s.drafts as VorhabenStateData['drafts']) : {},
        protocol: Array.isArray(s.protocol) ? s.protocol : [],
        lastModel: isRecord(s.lastModel) ? (s.lastModel as VorhabenStateData['lastModel']) : {},
        docDrafts: isRecord(s.docDrafts) ? (s.docDrafts as VorhabenStateData['docDrafts']) : {},
      };
      this.updatedAt = parsed.updatedAt ?? this.updatedAt;
      return { existed: true, healthy: true };
    } catch (err) {
      const backup = `${this.filePath}.unrecognized-${Date.now()}`;
      console.error(
        `[VorhabenStateStore] unreadable state at ${this.filePath} (${(err as Error).message}) — backing up to ${backup}`
      );
      await fs.promises.rename(this.filePath, backup).catch(() => {});
      this.state = emptyState();
      return { existed: true, healthy: false };
    }
  }

  /** Snapshot for the broadcast (callers must not mutate). */
  public getDocDrafts(): Record<string, ProjectDocDraft> {
    return { ...this.state.docDrafts };
  }

  public getDocDraft(projectId: string, key: ProjectDocKey): ProjectDocDraft | undefined {
    return this.state.docDrafts[docDraftKey(projectId, key)];
  }

  /** Returns true when the stored draft changed. */
  public setDocDraft(projectId: string, key: ProjectDocKey, text: string, openedMtime: number): boolean {
    const k = docDraftKey(projectId, key);
    const prev = this.state.docDrafts[k];
    if (prev && prev.text === text && prev.openedMtime === openedMtime) return false;
    this.state.docDrafts[k] = { text, openedMtime, updatedAt: this.now().toISOString() };
    this.commit();
    return true;
  }

  public clearDocDraft(projectId: string, key: ProjectDocKey): boolean {
    const k = docDraftKey(projectId, key);
    if (!(k in this.state.docDrafts)) return false;
    delete this.state.docDrafts[k];
    this.commit();
    return true;
  }

  public getUpdatedAt(): string {
    return this.updatedAt;
  }

  /** Resolves once every scheduled write has landed (tests, shutdown). */
  public flush(): Promise<void> {
    return this.writeChain;
  }

  // ---- internals ----

  private commit(): void {
    this.updatedAt = this.now().toISOString();
    const snapshot: VorhabenStateFileV1 = {
      version: 1,
      port: this.port,
      updatedAt: this.updatedAt,
      state: JSON.parse(JSON.stringify(this.state)) as VorhabenStateData,
    };
    this.writeChain = this.writeChain
      .then(() => this.writeFile(snapshot))
      .catch((err) => {
        console.error('[VorhabenStateStore] write failed:', err);
      });
  }

  private async writeFile(file: VorhabenStateFileV1): Promise<void> {
    await fs.promises.mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tmpPath = `${this.filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: 0o600 });
    await fs.promises.rename(tmpPath, this.filePath);
  }
}
