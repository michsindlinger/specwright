/**
 * Attachment Protocol Types
 *
 * Defines the contract for Attachment WebSocket communication.
 * Enables attachment operations (upload, list, delete) for Spec stories
 * and Backlog items from the Web UI.
 */

// ============================================================================
// Metadata Types
// ============================================================================

/**
 * Attachment metadata stored in story/backlog files
 */
export interface AttachmentMetadata {
  /** Unique filename */
  filename: string;
  /** File size in bytes */
  size: number;
  /** MIME type of the file */
  mimeType: string;
  /** Relative path from project root */
  path: string;
  /** Creation timestamp */
  createdAt: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Upload result data
 */
export interface AttachmentUploadResult {
  /** Whether upload was successful */
  success: boolean;
  /** The saved filename (may differ if duplicate) */
  filename: string;
  /** Relative path to the saved file */
  path: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Error message if failed */
  error?: string;
}

/**
 * List result data
 */
export interface AttachmentListResult {
  /** List of attachments */
  attachments: AttachmentMetadata[];
  /** Total count */
  count: number;
}

/**
 * Delete result data
 */
export interface AttachmentDeleteResult {
  /** Whether deletion was successful */
  success: boolean;
  /** Deleted filename */
  filename: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Read result data - content of the file for preview
 */
export interface AttachmentReadResult {
  /** Whether read was successful */
  success: boolean;
  /** File content - base64 for binary, plain text for text files */
  content: string;
  /** MIME type of the file */
  mimeType: string;
  /** Filename */
  filename: string;
  /** Whether content is base64 encoded */
  isBase64: boolean;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Attachment message types for WebSocket communication
 */
export type AttachmentMessageType =
  // Client -> Server
  | 'attachment:upload'
  | 'attachment:list'
  | 'attachment:delete'
  | 'attachment:read'
  // Server -> Client
  | 'attachment:upload:response'
  | 'attachment:list:response'
  | 'attachment:delete:response'
  | 'attachment:read:response'
  | 'attachment:error';

// ============================================================================
// Client -> Server Messages
// ============================================================================

/**
 * Context type for attachment operations
 */
export type AttachmentContextType = 'spec' | 'backlog';

/**
 * Upload an attachment to a spec story or backlog item
 */
export interface AttachmentUploadMessage {
  type: 'attachment:upload';
  /** Context type - spec story or backlog item */
  contextType: AttachmentContextType;
  /** Spec ID (if contextType is 'spec') */
  specId?: string;
  /** Story ID (if contextType is 'spec') */
  storyId?: string;
  /** Item ID (if contextType is 'backlog') */
  itemId?: string;
  /** Base64-encoded file data */
  data: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  timestamp: string;
}

/**
 * List attachments for a spec story or backlog item
 */
export interface AttachmentListMessage {
  type: 'attachment:list';
  /** Context type - spec story or backlog item */
  contextType: AttachmentContextType;
  /** Spec ID (if contextType is 'spec') */
  specId?: string;
  /** Story ID (if contextType is 'spec') */
  storyId?: string;
  /** Item ID (if contextType is 'backlog') */
  itemId?: string;
  timestamp: string;
}

/**
 * Delete an attachment from a spec story or backlog item
 */
export interface AttachmentDeleteMessage {
  type: 'attachment:delete';
  /** Context type - spec story or backlog item */
  contextType: AttachmentContextType;
  /** Spec ID (if contextType is 'spec') */
  specId?: string;
  /** Story ID (if contextType is 'spec') */
  storyId?: string;
  /** Item ID (if contextType is 'backlog') */
  itemId?: string;
  /** Filename to delete */
  filename: string;
  timestamp: string;
}

/**
 * Read attachment content for preview
 */
export interface AttachmentReadMessage {
  type: 'attachment:read';
  /** Context type - spec story or backlog item */
  contextType: AttachmentContextType;
  /** Spec ID (if contextType is 'spec') */
  specId?: string;
  /** Story ID (if contextType is 'spec') */
  storyId?: string;
  /** Item ID (if contextType is 'backlog') */
  itemId?: string;
  /** Filename to read */
  filename: string;
  timestamp: string;
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

/**
 * Attachment upload response
 */
export interface AttachmentUploadResponseMessage {
  type: 'attachment:upload:response';
  data: AttachmentUploadResult;
  timestamp: string;
}

/**
 * Attachment list response
 */
export interface AttachmentListResponseMessage {
  type: 'attachment:list:response';
  data: AttachmentListResult;
  timestamp: string;
}

/**
 * Attachment delete response
 */
export interface AttachmentDeleteResponseMessage {
  type: 'attachment:delete:response';
  data: AttachmentDeleteResult;
  timestamp: string;
}

/**
 * Attachment read response - content for preview
 */
export interface AttachmentReadResponseMessage {
  type: 'attachment:read:response';
  data: AttachmentReadResult;
  timestamp: string;
}

/**
 * Attachment error response
 */
export interface AttachmentErrorMessage {
  type: 'attachment:error';
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
 * Union type of all Attachment messages (client -> server)
 */
export type AttachmentClientMessage =
  | AttachmentUploadMessage
  | AttachmentListMessage
  | AttachmentDeleteMessage
  | AttachmentReadMessage;

/**
 * Union type of all Attachment messages (server -> client)
 */
export type AttachmentServerMessage =
  | AttachmentUploadResponseMessage
  | AttachmentListResponseMessage
  | AttachmentDeleteResponseMessage
  | AttachmentReadResponseMessage
  | AttachmentErrorMessage;

/**
 * Union type of all Attachment messages
 */
export type AttachmentMessage =
  | AttachmentClientMessage
  | AttachmentServerMessage;

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Error codes for Attachment operations
 */
export const ATTACHMENT_ERROR_CODES = {
  /** File exceeds maximum size */
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  /** File type not allowed */
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  /** Context (spec/story/item) not found */
  CONTEXT_NOT_FOUND: 'CONTEXT_NOT_FOUND',
  /** File not found */
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  /** Storage operation failed */
  STORAGE_ERROR: 'STORAGE_ERROR',
  /** Path traversal attempt detected */
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  /** Markdown update failed */
  MARKDOWN_ERROR: 'MARKDOWN_ERROR',
  /** Generic operation failed */
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const;

// ============================================================================
// Configuration
// ============================================================================

/**
 * Attachment operation configuration
 */
export const ATTACHMENT_CONFIG = {
  /** Maximum file size in bytes (5 MB) */
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
  /** Allowed MIME types */
  ALLOWED_MIME_TYPES: new Set([
    // Images
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/json',
  ]),
} as const;
