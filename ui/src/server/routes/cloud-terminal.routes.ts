/**
 * REST callbacks for cloud-terminal sessions.
 *
 * POST /api/cloud-terminal/:sessionId/agent-event
 *   Target of the Claude Code hooks (see services/claude-hooks.ts).
 *   Body = Claude's hook stdin payload (optional). Authenticated solely by
 *   the shared hook secret: a loopback check would be worthless on the
 *   droplet, where the Cloudflare tunnel delivers every external request
 *   from 127.0.0.1.
 *
 * Every rejection is logged — the hook discards its own output, so this log
 * line is the only place a systematic failure would ever show up.
 */

import { Router, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import type { CloudTerminalManager } from '../services/cloud-terminal-manager.js';
import {
  CLOUD_SESSION_ID_RE,
  HOOK_TOKEN_HEADER,
  mapHookPayload,
} from '../services/claude-hooks.js';
import type { CloudTerminalSessionId } from '../../shared/types/cloud-terminal.protocol.js';

/** Constant-time comparison that also hides length differences. */
export function tokenMatches(presented: unknown, expected: string): boolean {
  if (typeof presented !== 'string') return false;
  const a = Buffer.from(presented, 'utf-8');
  const b = Buffer.from(expected, 'utf-8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Factory: the manager lives inside the WebSocket handler, which is created
 * after `server.listen`, so routes resolve it lazily per request.
 */
export function createCloudTerminalRouter(
  getManager: () => CloudTerminalManager | undefined
): Router {
  const router = Router();

  router.post('/:sessionId/agent-event', (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;
    const reject = (status: number, reason: string): void => {
      console.warn('[cloud-terminal] agent-event rejected', { sessionId, status, reason });
      res.status(status).json({ error: reason });
    };

    const manager = getManager();
    const secret = manager?.getHookSecret();
    if (!manager || !secret) {
      reject(503, 'hooks not ready');
      return;
    }
    if (!tokenMatches(req.get(HOOK_TOKEN_HEADER), secret)) {
      reject(403, 'invalid hook token');
      return;
    }
    if (!CLOUD_SESSION_ID_RE.test(sessionId)) {
      reject(400, 'invalid session id');
      return;
    }

    const body: Record<string, unknown> =
      req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const mapped = mapHookPayload(body);
    if (mapped.kind === 'reject') {
      reject(400, mapped.reason);
      return;
    }
    if (mapped.kind === 'ignore') {
      // Known but irrelevant (SessionStart compact, untracked notification
      // types): acknowledge quietly so an older CLI cannot spam the log.
      res.status(204).end();
      return;
    }

    const accepted = manager.reportAgentEvent(sessionId as CloudTerminalSessionId, mapped.event, mapped.detail);
    if (!accepted) {
      reject(404, 'session not active');
      return;
    }
    res.status(204).end();
  });

  return router;
}
