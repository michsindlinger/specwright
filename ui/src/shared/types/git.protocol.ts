/**
 * Git Protocol Types
 *
 * Defines the contract for Git WebSocket communication.
 * Enables git operations (status, branches, commit, pull, push, checkout)
 * from the Web UI without switching to terminal.
 */

// ============================================================================
// Response Types
// ============================================================================

/**
 * Changed file entry in git status
 */
export interface GitChangedFile {
  /** File path relative to repo root */
  path: string;
  /** Git status code (M=modified, A=added, D=deleted, ?=untracked, R=renamed) */
  status: string;
  /** Whether the file is staged for commit */
  staged: boolean;
}

/**
 * Git status response data
 */
export interface GitStatusData {
  /** Current branch name */
  branch: string;
  /** Number of commits ahead of remote */
  ahead: number;
  /** Number of commits behind remote */
  behind: number;
  /** List of changed files */
  files: GitChangedFile[];
  /** Whether directory is a git repository */
  isGitRepo: boolean;
}

/**
 * Branch entry in branch list
 */
export interface GitBranchEntry {
  /** Branch name */
  name: string;
  /** Whether this is the currently checked out branch */
  current: boolean;
  /** Last commit hash (short) */
  lastCommit: string;
  /** Last commit message */
  lastMessage: string;
}

/**
 * Commit result data
 */
export interface GitCommitResult {
  /** Commit hash */
  hash: string;
  /** Commit message used */
  message: string;
  /** Number of files committed */
  filesChanged: number;
}

/**
 * Pull result data
 */
export interface GitPullResult {
  /** Whether pull was successful */
  success: boolean;
  /** Summary message */
  summary: string;
  /** Number of commits pulled */
  commitsReceived: number;
  /** Whether there were merge conflicts */
  hasConflicts: boolean;
}

/**
 * Push result data
 */
export interface GitPushResult {
  /** Whether push was successful */
  success: boolean;
  /** Summary message */
  summary: string;
  /** Number of commits pushed */
  commitsPushed: number;
}

/**
 * Checkout result data
 */
export interface GitCheckoutResult {
  /** Whether checkout was successful */
  success: boolean;
  /** Branch switched to */
  branch: string;
}

/**
 * Revert result data
 */
export interface GitRevertResult {
  /** Files that were successfully reverted */
  revertedFiles: string[];
  /** Files that failed to revert */
  failedFiles: Array<{ path: string; error: string }>;
}

/**
 * PR info data (from gh CLI)
 */
export interface GitPrInfo {
  /** PR number */
  number: number;
  /** PR state (OPEN, CLOSED, MERGED) */
  state: string;
  /** PR URL */
  url: string;
  /** PR title */
  title: string;
}

/**
 * Branch creation result data
 */
export interface GitCreateBranchResult {
  /** Whether operation was successful */
  success: boolean;
  /** Branch name */
  branch: string;
  /** Whether a new branch was created (false if branch already existed) */
  created: boolean;
}

/**
 * Push branch result data
 */
export interface GitPushBranchResult {
  /** Whether operation was successful */
  success: boolean;
  /** Branch name that was pushed */
  branch: string;
  /** Number of commits pushed */
  commitsPushed: number;
}

/**
 * Pull Request creation result data
 */
export interface GitCreatePullRequestResult {
  /** Whether operation was successful */
  success: boolean;
  /** PR URL (if created successfully) */
  prUrl?: string;
  /** PR number (if created successfully) */
  prNumber?: number;
  /** Warning message (e.g., if gh CLI not available but operation continued) */
  warning?: string;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Git message types for WebSocket communication
 */
export type GitMessageType =
  // Client -> Server
  | 'git:status'
  | 'git:branches'
  | 'git:commit'
  | 'git:pull'
  | 'git:push'
  | 'git:checkout'
  | 'git:revert'
  | 'git:delete-untracked'
  | 'git:pr-info'
  // Server -> Client
  | 'git:status:response'
  | 'git:branches:response'
  | 'git:commit:response'
  | 'git:pull:response'
  | 'git:push:response'
  | 'git:checkout:response'
  | 'git:revert:response'
  | 'git:delete-untracked:response'
  | 'git:pr-info:response'
  | 'git:error';

// ============================================================================
// Client -> Server Messages
// ============================================================================

/**
 * Request git status for the current project
 */
export interface GitStatusMessage {
  type: 'git:status';
  timestamp: string;
}

/**
 * Request list of local branches
 */
export interface GitBranchesMessage {
  type: 'git:branches';
  timestamp: string;
}

/**
 * Commit selected files with a message
 */
export interface GitCommitMessage {
  type: 'git:commit';
  /** Files to stage and commit */
  files: string[];
  /** Commit message */
  message: string;
  timestamp: string;
}

/**
 * Pull from remote
 */
export interface GitPullMessage {
  type: 'git:pull';
  /** Whether to use --rebase instead of merge */
  rebase?: boolean;
  timestamp: string;
}

/**
 * Push to remote
 */
export interface GitPushMessage {
  type: 'git:push';
  timestamp: string;
}

/**
 * Checkout a branch
 */
export interface GitCheckoutMessage {
  type: 'git:checkout';
  /** Branch name to checkout */
  branch: string;
  timestamp: string;
}

/**
 * Revert files to last commit state
 */
export interface GitRevertMessage {
  type: 'git:revert';
  /** File paths to revert */
  files: string[];
  timestamp: string;
}

/**
 * Delete an untracked file
 */
export interface GitDeleteUntrackedMessage {
  type: 'git:delete-untracked';
  /** File path to delete */
  file: string;
  timestamp: string;
}

/**
 * Request PR info for current branch
 */
export interface GitPrInfoMessage {
  type: 'git:pr-info';
  timestamp: string;
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

/**
 * Git status response
 */
export interface GitStatusResponseMessage {
  type: 'git:status:response';
  data: GitStatusData;
  timestamp: string;
}

/**
 * Git branches response
 */
export interface GitBranchesResponseMessage {
  type: 'git:branches:response';
  branches: GitBranchEntry[];
  timestamp: string;
}

/**
 * Git commit response
 */
export interface GitCommitResponseMessage {
  type: 'git:commit:response';
  data: GitCommitResult;
  timestamp: string;
}

/**
 * Git pull response
 */
export interface GitPullResponseMessage {
  type: 'git:pull:response';
  data: GitPullResult;
  timestamp: string;
}

/**
 * Git push response
 */
export interface GitPushResponseMessage {
  type: 'git:push:response';
  data: GitPushResult;
  timestamp: string;
}

/**
 * Git checkout response
 */
export interface GitCheckoutResponseMessage {
  type: 'git:checkout:response';
  data: GitCheckoutResult;
  timestamp: string;
}

/**
 * Git revert response
 */
export interface GitRevertResponseMessage {
  type: 'git:revert:response';
  data: GitRevertResult;
  timestamp: string;
}

/**
 * Git delete-untracked response
 */
export interface GitDeleteUntrackedResponseMessage {
  type: 'git:delete-untracked:response';
  data: { file: string; success: boolean };
  timestamp: string;
}

/**
 * Git pr-info response
 */
export interface GitPrInfoResponseMessage {
  type: 'git:pr-info:response';
  data: GitPrInfo | null;
  timestamp: string;
}

/**
 * Git error response
 */
export interface GitErrorMessage {
  type: 'git:error';
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Original operation that failed */
  operation: string;
  timestamp: string;
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Union type of all Git messages (client -> server)
 */
export type GitClientMessage =
  | GitStatusMessage
  | GitBranchesMessage
  | GitCommitMessage
  | GitPullMessage
  | GitPushMessage
  | GitCheckoutMessage
  | GitRevertMessage
  | GitDeleteUntrackedMessage
  | GitPrInfoMessage;

/**
 * Union type of all Git messages (server -> client)
 */
export type GitServerMessage =
  | GitStatusResponseMessage
  | GitBranchesResponseMessage
  | GitCommitResponseMessage
  | GitPullResponseMessage
  | GitPushResponseMessage
  | GitCheckoutResponseMessage
  | GitRevertResponseMessage
  | GitDeleteUntrackedResponseMessage
  | GitPrInfoResponseMessage
  | GitErrorMessage;

/**
 * Union type of all Git messages
 */
export type GitMessage =
  | GitClientMessage
  | GitServerMessage;

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Error codes for Git operations
 */
export const GIT_ERROR_CODES = {
  /** Git CLI is not installed */
  GIT_NOT_FOUND: 'GIT_NOT_FOUND',
  /** Directory is not a git repository */
  NOT_A_REPO: 'NOT_A_REPO',
  /** Merge conflict detected */
  MERGE_CONFLICT: 'MERGE_CONFLICT',
  /** Network error (e.g., push/pull failed) */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Operation timeout */
  TIMEOUT: 'TIMEOUT',
  /** Generic git operation failed */
  OPERATION_FAILED: 'OPERATION_FAILED',
  /** No project selected */
  NO_PROJECT: 'NO_PROJECT',
} as const;

// ============================================================================
// Configuration
// ============================================================================

/**
 * Git operation configuration
 */
export const GIT_CONFIG = {
  /** Timeout for git operations in milliseconds (10 seconds) */
  OPERATION_TIMEOUT_MS: 10_000,
} as const;
