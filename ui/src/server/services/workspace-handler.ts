/**
 * WorkspaceHandler — WebSocket-facing logic for the shared workspace, kept out
 * of websocket.ts so it is testable with a fake broadcast and a fake reply.
 *
 * Contract: every successful mutation broadcasts the full `workspace:state`
 * to all clients; `open-project` additionally acks the requester with the
 * server-side project id (after the broadcast, so the requester already holds
 * the state the id refers to). Errors go to the requester only.
 */

import type {
  WorkspaceAckMessage,
  WorkspaceErrorCode,
  WorkspaceErrorMessage,
  WorkspaceStateMessage,
} from '../../shared/types/workspace.protocol.js';
import { WorkspaceInvalidPathError, type WorkspaceStateStore } from './workspace-state.js';

/** Any protocol message object; websocket.ts serialises it. */
export type OutboundMessage = { type: string };
export type Reply = (message: OutboundMessage) => void;

export const WORKSPACE_MESSAGE_TYPES = new Set([
  'workspace:get',
  'workspace:open-project',
  'workspace:close-project',
  'workspace:remove-recent',
  'workspace:set-session-name',
  'workspace:import',
]);

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

export class WorkspaceHandler {
  constructor(
    private readonly store: WorkspaceStateStore,
    private readonly broadcast: (message: OutboundMessage) => void
  ) {}

  public stateMessage(): WorkspaceStateMessage {
    return { type: 'workspace:state', state: this.store.getState(), timestamp: new Date().toISOString() };
  }

  /** Returns false when the message type is not a workspace message. */
  public handle(message: Record<string, unknown>, reply: Reply): boolean {
    const type = message.type;
    if (typeof type !== 'string' || !WORKSPACE_MESSAGE_TYPES.has(type)) return false;

    switch (type) {
      case 'workspace:get':
        reply(this.stateMessage());
        return true;

      case 'workspace:open-project': {
        const requestId = str(message.requestId);
        const path = str(message.path)?.trim();
        const name = str(message.name)?.trim();
        if (!path) {
          reply(this.error('INVALID_MESSAGE', 'path is required', requestId));
          return true;
        }
        try {
          const project = this.store.openProject(path, name || basename(path));
          this.broadcast(this.stateMessage());
          if (requestId) {
            const ack: WorkspaceAckMessage = {
              type: 'workspace:ack',
              requestId,
              projectId: project.id,
              timestamp: new Date().toISOString(),
            };
            reply(ack);
          }
        } catch (err) {
          const code: WorkspaceErrorCode = err instanceof WorkspaceInvalidPathError ? 'INVALID_PATH' : 'INVALID_MESSAGE';
          reply(this.error(code, (err as Error).message, requestId));
        }
        return true;
      }

      case 'workspace:close-project': {
        const id = str(message.id);
        if (!id) {
          reply(this.error('INVALID_MESSAGE', 'id is required'));
          return true;
        }
        if (this.store.closeProject(id)) this.broadcast(this.stateMessage());
        return true;
      }

      case 'workspace:remove-recent': {
        const path = str(message.path);
        if (!path) {
          reply(this.error('INVALID_MESSAGE', 'path is required'));
          return true;
        }
        if (this.store.removeRecent(path)) this.broadcast(this.stateMessage());
        return true;
      }

      case 'workspace:set-session-name': {
        const sessionId = str(message.sessionId);
        const name = message.name === null ? null : str(message.name);
        if (!sessionId || name === undefined) {
          reply(this.error('INVALID_MESSAGE', 'sessionId and name (string|null) are required'));
          return true;
        }
        if (this.store.setSessionName(sessionId, name)) this.broadcast(this.stateMessage());
        return true;
      }

      case 'workspace:import': {
        const changed = this.store.importIfEmpty({
          openProjects: Array.isArray(message.openProjects) ? (message.openProjects as never) : undefined,
          recentProjects: Array.isArray(message.recentProjects) ? (message.recentProjects as never) : undefined,
          sessionNames:
            message.sessionNames && typeof message.sessionNames === 'object'
              ? (message.sessionNames as Record<string, string>)
              : undefined,
        });
        // The importer always gets the (possibly unchanged) state back; others only on change.
        if (changed) this.broadcast(this.stateMessage());
        else reply(this.stateMessage());
        return true;
      }

      default:
        return false;
    }
  }

  /** A session is gone for good: drop its name. Broadcasts only when something changed. */
  public onSessionClosed(sessionId: string): boolean {
    const changed = this.store.setSessionName(sessionId, null);
    if (changed) this.broadcast(this.stateMessage());
    return changed;
  }

  private error(code: WorkspaceErrorCode, message: string, requestId?: string): WorkspaceErrorMessage {
    return {
      type: 'workspace:error',
      ...(requestId ? { requestId } : {}),
      code,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}

function basename(p: string): string {
  const trimmed = p.replace(/[\\/]+$/, '');
  const idx = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
}
