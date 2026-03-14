/**
 * Comment Protocol Types
 *
 * Defines the contract for Comment WebSocket communication.
 * Enables comment operations (create, list, update, delete, upload-image) for Backlog items.
 */

// ============================================================================
// Data Types
// ============================================================================

/**
 * Comment data stored in comments.json
 */
export interface Comment {
  /** Unique ID in format cmt-{timestamp} */
  id: string;
  /** Author identifier */
  author: string;
  /** Comment text (supports Markdown) */
  text: string;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Edit timestamp (ISO 8601) - set when comment is updated */
  editedAt?: string;
  /** Optional image filename attached to this comment */
  imageFilename?: string;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Comment message types for WebSocket communication
 */
export type CommentMessageType =
  // Client -> Server
  | 'comment:create'
  | 'comment:list'
  | 'comment:update'
  | 'comment:delete'
  | 'comment:upload-image'
  // Server -> Client
  | 'comment:create:response'
  | 'comment:list:response'
  | 'comment:update:response'
  | 'comment:delete:response'
  | 'comment:upload-image:response'
  | 'comment:error';

// ============================================================================
// Client -> Server Messages
// ============================================================================

/**
 * Create a new comment on a backlog item
 */
export interface CommentCreateMessage {
  type: 'comment:create';
  /** Backlog item ID */
  itemId: string;
  /** Comment text (supports Markdown) */
  text: string;
  timestamp: string;
}

/**
 * List all comments for a backlog item
 */
export interface CommentListMessage {
  type: 'comment:list';
  /** Backlog item ID */
  itemId: string;
  timestamp: string;
}

/**
 * Update an existing comment
 */
export interface CommentUpdateMessage {
  type: 'comment:update';
  /** Backlog item ID */
  itemId: string;
  /** Comment ID to update */
  commentId: string;
  /** New comment text */
  text: string;
  timestamp: string;
}

/**
 * Delete a comment
 */
export interface CommentDeleteMessage {
  type: 'comment:delete';
  /** Backlog item ID */
  itemId: string;
  /** Comment ID to delete */
  commentId: string;
  timestamp: string;
}

/**
 * Upload an image to attach to a comment
 */
export interface CommentUploadImageMessage {
  type: 'comment:upload-image';
  /** Backlog item ID */
  itemId: string;
  /** Base64-encoded image data */
  data: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  timestamp: string;
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

/**
 * Comment create response
 */
export interface CommentCreateResponseMessage {
  type: 'comment:create:response';
  data: {
    comment: Comment;
    count: number;
  };
  timestamp: string;
}

/**
 * Comment list response
 */
export interface CommentListResponseMessage {
  type: 'comment:list:response';
  data: {
    comments: Comment[];
    count: number;
  };
  timestamp: string;
}

/**
 * Comment update response
 */
export interface CommentUpdateResponseMessage {
  type: 'comment:update:response';
  data: {
    comment: Comment;
  };
  timestamp: string;
}

/**
 * Comment delete response
 */
export interface CommentDeleteResponseMessage {
  type: 'comment:delete:response';
  data: {
    commentId: string;
    count: number;
  };
  timestamp: string;
}

/**
 * Comment image upload response
 */
export interface CommentUploadImageResponseMessage {
  type: 'comment:upload-image:response';
  data: {
    filename: string;
    path: string;
    size: number;
    mimeType: string;
  };
  timestamp: string;
}

/**
 * Comment error response
 */
export interface CommentErrorMessage {
  type: 'comment:error';
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
 * Union type of all Comment messages (client -> server)
 */
export type CommentClientMessage =
  | CommentCreateMessage
  | CommentListMessage
  | CommentUpdateMessage
  | CommentDeleteMessage
  | CommentUploadImageMessage;

/**
 * Union type of all Comment messages (server -> client)
 */
export type CommentServerMessage =
  | CommentCreateResponseMessage
  | CommentListResponseMessage
  | CommentUpdateResponseMessage
  | CommentDeleteResponseMessage
  | CommentUploadImageResponseMessage
  | CommentErrorMessage;

/**
 * Union type of all Comment messages
 */
export type CommentMessage = CommentClientMessage | CommentServerMessage;

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Error codes for Comment operations
 */
export const COMMENT_ERROR_CODES = {
  /** Backlog item not found */
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  /** Comment not found */
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',
  /** Path traversal attempt detected */
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  /** Storage operation failed */
  STORAGE_ERROR: 'STORAGE_ERROR',
  /** File size too large */
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  /** Invalid file type */
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  /** Generic operation failed */
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const;

// ============================================================================
// Configuration
// ============================================================================

/**
 * Comment operation configuration
 */
export const COMMENT_CONFIG = {
  /** Maximum image size in bytes (5 MB) */
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
  /** Allowed image MIME types */
  ALLOWED_IMAGE_TYPES: new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
  ]),
} as const;
