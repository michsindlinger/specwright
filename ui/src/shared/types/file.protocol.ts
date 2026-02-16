/**
 * File Protocol Types
 *
 * Defines the contract for File Editor WebSocket communication.
 * Enables file operations (list, read, write, create, delete, rename, mkdir)
 * for project files from the Web UI.
 */

// ============================================================================
// Data Types
// ============================================================================

/**
 * A single file or directory entry returned by files:list
 */
export interface FileEntry {
  /** File or folder name */
  name: string;
  /** 'file' or 'directory' */
  type: 'file' | 'directory';
  /** File size in bytes (0 for directories) */
  size: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface FileListResult {
  path: string;
  entries: FileEntry[];
}

export interface FileReadResult {
  path: string;
  content: string;
  language: string;
  isBinary: boolean;
}

export interface FileWriteResult {
  path: string;
  success: boolean;
}

export interface FileCreateResult {
  path: string;
  success: boolean;
}

export interface FileMkdirResult {
  path: string;
  success: boolean;
}

export interface FileRenameResult {
  oldPath: string;
  newPath: string;
  success: boolean;
}

export interface FileDeleteResult {
  path: string;
  success: boolean;
}

// ============================================================================
// Message Types
// ============================================================================

export type FileMessageType =
  // Client -> Server
  | 'files:list'
  | 'files:read'
  | 'files:write'
  | 'files:create'
  | 'files:mkdir'
  | 'files:rename'
  | 'files:delete'
  // Server -> Client
  | 'files:list:response'
  | 'files:read:response'
  | 'files:write:response'
  | 'files:create:response'
  | 'files:mkdir:response'
  | 'files:rename:response'
  | 'files:delete:response'
  | 'files:list:error'
  | 'files:read:error'
  | 'files:write:error'
  | 'files:create:error'
  | 'files:mkdir:error'
  | 'files:rename:error'
  | 'files:delete:error';

// ============================================================================
// Error Codes
// ============================================================================

export const FILE_ERROR_CODES = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  BINARY_FILE: 'BINARY_FILE',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const;

// ============================================================================
// Configuration
// ============================================================================

export const FILE_CONFIG = {
  /** Maximum file size in bytes (5 MB) */
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
} as const;
