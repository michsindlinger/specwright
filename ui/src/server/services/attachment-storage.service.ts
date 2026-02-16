import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { resolveProjectDir } from '../utils/project-dirs.js';
import {
  AttachmentMetadata,
  AttachmentUploadResult,
  AttachmentListResult,
  AttachmentDeleteResult,
  AttachmentReadResult,
  AttachmentContextType,
  ATTACHMENT_CONFIG,
} from '../../shared/types/attachment.protocol.js';

/**
 * Result of storage operation
 */
interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ATTACHMENTS_DIR = 'attachments';

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/json': 'json',
};

// ============================================================================
// AttachmentStorageService
// ============================================================================

/**
 * AttachmentStorageService handles file storage for Spec stories and Backlog items.
 * Manages upload, listing, and deletion of attachments with automatic
 * duplicate handling and Markdown reference updates.
 */
export class AttachmentStorageService {
  /**
   * Upload an attachment to a spec story or backlog item.
   */
  async upload(
    projectPath: string,
    contextType: AttachmentContextType,
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined,
    data: string,
    filename: string,
    mimeType: string
  ): Promise<StorageResult<AttachmentUploadResult>> {
    try {
      // Validate file size
      const buffer = Buffer.from(data, 'base64');
      if (buffer.length > ATTACHMENT_CONFIG.MAX_FILE_SIZE_BYTES) {
        return {
          success: false,
          error: `Datei überschreitet die maximale Größe von ${ATTACHMENT_CONFIG.MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`,
        };
      }

      // Validate MIME type
      if (!ATTACHMENT_CONFIG.ALLOWED_MIME_TYPES.has(mimeType)) {
        return {
          success: false,
          error: 'Dateityp nicht unterstützt',
        };
      }

      // Determine target path
      const targetPath = this.resolveTargetPath(projectPath, contextType, specId, storyId, itemId);
      if (!targetPath) {
        return {
          success: false,
          error: 'Ungültiger Context - Spec ID oder Item ID erforderlich',
        };
      }

      // Sanitize and resolve path (prevent path traversal)
      const sanitizedFilename = this.sanitizeFilename(filename);
      const normalizedPath = this.normalizePath(targetPath);
      const attachmentDir = join(projectPath, normalizedPath);

      // Ensure directory exists
      await fs.mkdir(attachmentDir, { recursive: true });

      // Handle duplicates
      const ext = MIME_TO_EXT[mimeType] || 'bin';
      const finalFilename = await this.resolveDuplicateFilename(attachmentDir, sanitizedFilename, ext);
      const finalPath = join(attachmentDir, finalFilename);

      // Write file
      await fs.writeFile(finalPath, buffer, { mode: 0o644 });

      // Update Markdown reference
      const relativePath = join(normalizedPath, finalFilename).replace(/\\/g, '/');

      // For the markdown entry, use a short relative path that starts with "attachments/"
      // This matches the pattern used by Quick-To-Do and gets transformed to API URLs by the backend
      const contextId = contextType === 'backlog' ? itemId : storyId;
      const markdownPath = `attachments/${contextId}/${finalFilename}`;

      await this.updateMarkdownReference(projectPath, contextType, specId, storyId, itemId, {
        filename: finalFilename,
        size: buffer.length,
        mimeType,
        path: markdownPath,
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        data: {
          success: true,
          filename: finalFilename,
          path: relativePath,
          size: buffer.length,
          mimeType,
        },
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Hochladen',
      };
    }
  }

  /**
   * Count attachments for a spec story or backlog item.
   * Lightweight alternative to list() - only counts files without reading stats.
   */
  async count(
    projectPath: string,
    contextType: AttachmentContextType,
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined
  ): Promise<number> {
    try {
      const targetPath = this.resolveTargetPath(projectPath, contextType, specId, storyId, itemId);
      if (!targetPath) return 0;

      const normalizedPath = this.normalizePath(targetPath);
      const attachmentDir = join(projectPath, normalizedPath);

      const entries = await fs.readdir(attachmentDir, { withFileTypes: true });
      return entries.filter(e => e.isFile()).length;
    } catch {
      return 0;
    }
  }

  /**
   * List attachments for a spec story or backlog item.
   */
  async list(
    projectPath: string,
    contextType: AttachmentContextType,
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined
  ): Promise<StorageResult<AttachmentListResult>> {
    try {
      const targetPath = this.resolveTargetPath(projectPath, contextType, specId, storyId, itemId);
      if (!targetPath) {
        return {
          success: false,
          error: 'Ungültiger Context - Spec ID oder Item ID erforderlich',
        };
      }

      const normalizedPath = this.normalizePath(targetPath);
      const attachmentDir = join(projectPath, normalizedPath);

      // Check if directory exists
      try {
        await fs.access(attachmentDir);
      } catch {
        // No attachments yet
        return {
          success: true,
          data: {
            attachments: [],
            count: 0,
          },
        };
      }

      // Read directory
      const files = await fs.readdir(attachmentDir);
      const attachments: AttachmentMetadata[] = [];

      for (const file of files) {
        const filePath = join(attachmentDir, file);
        const stat = await fs.stat(filePath);

        if (stat.isFile()) {
          const ext = file.split('.').pop()?.toLowerCase() || '';
          const mimeType = this.extToMimeType(ext);

          attachments.push({
            filename: file,
            size: stat.size,
            mimeType,
            path: join(normalizedPath, file).replace(/\\/g, '/'),
            createdAt: stat.birthtime.toISOString(),
          });
        }
      }

      // Sort by creation date (newest first)
      attachments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        success: true,
        data: {
          attachments,
          count: attachments.length,
        },
      };
    } catch (error) {
      console.error('Error listing attachments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Auflisten',
      };
    }
  }

  /**
   * Delete an attachment from a spec story or backlog item.
   */
  async delete(
    projectPath: string,
    contextType: AttachmentContextType,
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined,
    filename: string
  ): Promise<StorageResult<AttachmentDeleteResult>> {
    try {
      const targetPath = this.resolveTargetPath(projectPath, contextType, specId, storyId, itemId);
      if (!targetPath) {
        return {
          success: false,
          error: 'Ungültiger Context - Spec ID oder Item ID erforderlich',
        };
      }

      const normalizedPath = this.normalizePath(targetPath);
      const safeFilename = basename(filename);
      const filePath = join(projectPath, normalizedPath, safeFilename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return {
          success: false,
          error: 'Datei nicht gefunden',
        };
      }

      // Delete file
      await fs.unlink(filePath);

      // Remove Markdown reference
      await this.removeMarkdownReference(projectPath, contextType, specId, storyId, itemId, safeFilename);

      return {
        success: true,
        data: {
          success: true,
          filename: safeFilename,
        },
      };
    } catch (error) {
      console.error('Error deleting attachment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Löschen',
      };
    }
  }

  /**
   * Read attachment content for preview.
   * Returns text content directly or base64 for binary files.
   */
  async read(
    projectPath: string,
    contextType: AttachmentContextType,
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined,
    filename: string
  ): Promise<StorageResult<AttachmentReadResult>> {
    try {
      const targetPath = this.resolveTargetPath(projectPath, contextType, specId, storyId, itemId);
      if (!targetPath) {
        return {
          success: false,
          error: 'Ungültiger Context - Spec ID oder Item ID erforderlich',
        };
      }

      const normalizedPath = this.normalizePath(targetPath);
      const safeFilename = basename(filename);
      const filePath = join(projectPath, normalizedPath, safeFilename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return {
          success: false,
          error: 'Datei nicht gefunden',
        };
      }

      // Determine MIME type from extension
      const ext = safeFilename.split('.').pop()?.toLowerCase() || '';
      const mimeType = this.extToMimeType(ext);

      // Check if it's a text-based file
      const textMimeTypes = ['text/plain', 'text/markdown', 'application/json'];
      const isTextFile = textMimeTypes.includes(mimeType);

      if (isTextFile) {
        // Read as text
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          success: true,
          data: {
            success: true,
            content,
            mimeType,
            filename,
            isBase64: false,
          },
        };
      } else {
        // Read as binary and convert to base64
        const buffer = await fs.readFile(filePath);
        const base64Content = buffer.toString('base64');
        return {
          success: true,
          data: {
            success: true,
            content: base64Content,
            mimeType,
            filename,
            isBase64: true,
          },
        };
      }
    } catch (error) {
      console.error('Error reading attachment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Lesen',
      };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Resolve the target path for attachments based on context.
   * Uses projectDir utility for backward-compatible directory resolution.
   */
  private resolveTargetPath(
    projectPath: string,
    contextType: AttachmentContextType,
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined
  ): string | null {
    const projDir = resolveProjectDir(projectPath);

    if (contextType === 'spec') {
      if (!specId || !storyId) {
        return null;
      }
      return join(projDir, 'specs', specId, ATTACHMENTS_DIR, storyId);
    } else if (contextType === 'backlog') {
      if (!itemId) {
        return null;
      }
      return join(projDir, 'backlog', 'items', ATTACHMENTS_DIR, itemId);
    }
    return null;
  }

  /**
   * Normalize path to prevent path traversal attacks.
   */
  private normalizePath(path: string): string {
    // Remove any leading/trailing slashes and normalize
    const normalized = path.replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');

    // Verify no path traversal attempts
    if (normalized.includes('..')) {
      throw new Error('Path traversal attempt detected');
    }

    return normalized;
  }

  /**
   * Sanitize filename to prevent path traversal.
   */
  private sanitizeFilename(filename: string): string {
    let name = basename(filename);

    // Remove extension for now
    name = name.replace(/\.[^/.]+$/, '');

    // Remove dangerous characters
    name = name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();

    if (!name) {
      name = 'file';
    }

    if (name.length > 50) {
      name = name.substring(0, 50);
    }

    return name;
  }

  /**
   * Resolve duplicate filename by adding suffix.
   */
  private async resolveDuplicateFilename(
    dir: string,
    baseName: string,
    ext: string
  ): Promise<string> {
    let filename = `${baseName}.${ext}`;
    let counter = 0;

    while (true) {
      try {
        await fs.access(join(dir, filename));
        // File exists, increment counter
        counter++;
        filename = `${baseName}-${counter}.${ext}`;
      } catch {
        // File doesn't exist, we can use this name
        break;
      }
    }

    return filename;
  }

  /**
   * Update Markdown file to add attachment reference.
   */
  private async updateMarkdownReference(
    projectPath: string,
    contextType: AttachmentContextType,
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined,
    metadata: AttachmentMetadata
  ): Promise<void> {
    const mdPath = await this.resolveMarkdownPath(projectPath, contextType, specId, storyId, itemId);
    if (!mdPath) {
      return;
    }

    // Check if markdown file exists
    try {
      await fs.access(mdPath);
    } catch {
      // Markdown file doesn't exist, skip
      return;
    }

    // Read existing content
    let content = await fs.readFile(mdPath, 'utf-8');

    // Check if Attachments section exists
    const attachmentsSectionRegex = /^##\s+Attachments\s*$/m;
    const hasAttachmentsSection = attachmentsSectionRegex.test(content);

    if (!hasAttachmentsSection) {
      // Add Attachments section at the end
      content += '\n\n## Attachments\n';
    }

    // Format the attachment entry
    const isImage = metadata.mimeType.startsWith('image/');
    const sizeKB = (metadata.size / 1024).toFixed(1);
    const entry = isImage
      ? `- ![${metadata.filename}](${metadata.path}) (${sizeKB} KB)`
      : `- [${metadata.filename}](${metadata.path}) (${sizeKB} KB)`;

    // Add to Attachments section (append after the section header or end)
    const lines = content.split('\n');
    let insertIndex = lines.length;
    let foundAttachmentsHeader = false;

    for (let i = 0; i < lines.length; i++) {
      if (attachmentsSectionRegex.test(lines[i])) {
        foundAttachmentsHeader = true;
        // Find the end of the attachments section (next ## or end)
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].startsWith('## ')) {
            insertIndex = j;
            break;
          }
          if (j === lines.length - 1) {
            insertIndex = j + 1;
          }
        }
        break;
      }
    }

    if (foundAttachmentsHeader) {
      lines.splice(insertIndex, 0, entry);
      content = lines.join('\n');
      await fs.writeFile(mdPath, content, 'utf-8');
    }
  }

  /**
   * Remove Markdown reference for deleted attachment.
   */
  private async removeMarkdownReference(
    projectPath: string,
    contextType: AttachmentContextType,
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined,
    filename: string
  ): Promise<void> {
    const mdPath = await this.resolveMarkdownPath(projectPath, contextType, specId, storyId, itemId);
    if (!mdPath) {
      return;
    }

    try {
      await fs.access(mdPath);
    } catch {
      return;
    }

    let content = await fs.readFile(mdPath, 'utf-8');

    // Remove lines containing the filename
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => !line.includes(filename));

    content = filteredLines.join('\n');
    await fs.writeFile(mdPath, content, 'utf-8');
  }

  /**
   * Resolve the correct markdown file path for a spec story or backlog item.
   * Uses kanban.json (specs) or backlog-index.json (backlog) to look up the actual filename.
   */
  private async resolveMarkdownPath(
    projectPath: string,
    contextType: AttachmentContextType,
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined
  ): Promise<string | null> {
    const projDir = resolveProjectDir(projectPath);

    if (contextType === 'spec' && specId && storyId) {
      const specPath = join(projectPath, projDir, 'specs', specId);

      // Try kanban.json first for storyFile lookup
      try {
        const kanbanJsonPath = join(specPath, 'kanban.json');
        const kanbanContent = await fs.readFile(kanbanJsonPath, 'utf-8');
        const kanban = JSON.parse(kanbanContent);

        if (Array.isArray(kanban.stories)) {
          const story = kanban.stories.find(
            (s: { id?: string }) => s.id === storyId
          );
          if (story?.storyFile) {
            const mdPath = join(specPath, story.storyFile);
            try {
              await fs.access(mdPath);
              return mdPath;
            } catch {
              // storyFile from kanban.json doesn't exist, fall through
            }
          }
        }
      } catch {
        // No kanban.json or parse error, fall through to directory scan
      }

      // Fallback: scan stories directory for matching file
      const storiesDir = join(specPath, 'stories');
      try {
        const numericMatch = storyId.match(/(\d+)$/);
        if (numericMatch) {
          const numericId = numericMatch[1];
          const files = await fs.readdir(storiesDir);
          const match = files.find(f => f.startsWith(`story-${numericId}`) && f.endsWith('.md'));
          if (match) {
            return join(storiesDir, match);
          }
        }
      } catch {
        // No stories directory
      }

      return null;
    }

    if (contextType === 'backlog' && itemId) {
      const backlogPath = join(projectPath, projDir, 'backlog');

      // Read backlog-index.json to find the correct file path
      try {
        const indexPath = join(backlogPath, 'backlog-index.json');
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(indexContent);

        if (Array.isArray(index.items)) {
          const item = index.items.find(
            (i: { id?: string }) => i.id === itemId
          );
          if (item?.file) {
            const mdPath = join(backlogPath, item.file);
            try {
              await fs.access(mdPath);
              return mdPath;
            } catch {
              // File from index doesn't exist
            }
          }
        }
      } catch {
        // No backlog-index.json or parse error
      }

      return null;
    }

    return null;
  }

  /**
   * Convert file extension to MIME type.
   */
  private extToMimeType(ext: string): string {
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      pdf: 'application/pdf',
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
    };
    return mimeMap[ext.toLowerCase()] || 'application/octet-stream';
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const attachmentStorageService = new AttachmentStorageService();
