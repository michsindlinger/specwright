/**
 * Shared workspace protocol.
 *
 * One backend = one workspace: which projects are open, which were opened
 * recently, and what the user named their terminal tabs. Every connected
 * browser (desktop, phone over Tailscale) mirrors this state, so the phone
 * shows the same projects and tabs as the Mac.
 *
 * Device-local state deliberately NOT in here: the active project, split-pane
 * layout, zoom, sidebar width.
 *
 * Server always answers mutations with a full `workspace:state` broadcast to
 * every client — clients never apply partial updates.
 */

export interface WorkspaceProject {
  /** Stable id = normalised path (realpath, trailing slash stripped). */
  id: string;
  /** First-seen raw path string — sessions are matched against exactly this. */
  path: string;
  name: string;
  /** ISO timestamp. */
  openedAt: string;
}

export interface WorkspaceRecent {
  path: string;
  name: string;
  /** ISO timestamp. */
  lastOpened: string;
}

export interface WorkspaceState {
  openProjects: WorkspaceProject[];
  /** Newest first, capped at WORKSPACE_MAX_RECENTS. */
  recentProjects: WorkspaceRecent[];
  /** backend cloud-terminal sessionId → user-given tab name. */
  sessionNames: Record<string, string>;
  /** ISO timestamp of the last mutation. */
  updatedAt: string;
}

export const WORKSPACE_MAX_RECENTS = 20;

// ---- Client → Server ----

export interface WorkspaceGetMessage {
  type: 'workspace:get';
  timestamp: string;
}

export interface WorkspaceOpenProjectMessage {
  type: 'workspace:open-project';
  /** Echoed on `workspace:ack` so the requester learns the server-side project id. */
  requestId: string;
  path: string;
  name: string;
  timestamp: string;
}

export interface WorkspaceCloseProjectMessage {
  type: 'workspace:close-project';
  id: string;
  timestamp: string;
}

export interface WorkspaceRemoveRecentMessage {
  type: 'workspace:remove-recent';
  path: string;
  timestamp: string;
}

export interface WorkspaceSetSessionNameMessage {
  type: 'workspace:set-session-name';
  sessionId: string;
  /** null clears the name (back to the auto-generated one). */
  name: string | null;
  timestamp: string;
}

/**
 * One-time migration of a browser's localStorage workspace. The server merges
 * each field only if it is still empty server-side, so a late-connecting
 * browser can never overwrite a workspace others already use.
 */
export interface WorkspaceImportMessage {
  type: 'workspace:import';
  openProjects?: Array<{ path: string; name: string }>;
  recentProjects?: Array<{ path: string; name: string; lastOpened: number }>;
  sessionNames?: Record<string, string>;
  timestamp: string;
}

export type WorkspaceClientMessage =
  | WorkspaceGetMessage
  | WorkspaceOpenProjectMessage
  | WorkspaceCloseProjectMessage
  | WorkspaceRemoveRecentMessage
  | WorkspaceSetSessionNameMessage
  | WorkspaceImportMessage;

// ---- Server → Client ----

export interface WorkspaceStateMessage {
  type: 'workspace:state';
  state: WorkspaceState;
  timestamp: string;
}

export interface WorkspaceAckMessage {
  type: 'workspace:ack';
  requestId: string;
  projectId: string;
  timestamp: string;
}

export type WorkspaceErrorCode = 'INVALID_PATH' | 'INVALID_MESSAGE';

export interface WorkspaceErrorMessage {
  type: 'workspace:error';
  requestId?: string;
  code: WorkspaceErrorCode;
  message: string;
  timestamp: string;
}

export type WorkspaceServerMessage = WorkspaceStateMessage | WorkspaceAckMessage | WorkspaceErrorMessage;
