import { promises as fs } from 'fs';
import { join, basename } from 'path';

/**
 * backlog-index.json structure
 */
interface BacklogIndex {
  version: string;
  nextId: number;
  items: BacklogIndexEntry[];
}

interface BacklogIndexEntry {
  id: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
  file: string;
}

/**
 * Request body for creating a quick-todo item
 */
export interface CreateQuickTodoRequest {
  title: string;
  description?: string;
  priority: string;
  images?: Array<{
    data: string;
    filename: string;
    mimeType: string;
  }>;
}

/**
 * Result of creating a backlog item
 */
export interface CreateItemResult {
  success: boolean;
  itemId?: string;
  file?: string;
  error?: string;
}

const BACKLOG_DIR = 'agent-os/backlog';
const ITEMS_DIR = 'agent-os/backlog/items';
const ATTACHMENTS_DIR = 'agent-os/backlog/items/attachments';
const INDEX_FILE = 'agent-os/backlog/backlog-index.json';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * BacklogItemStorageService handles atomic creation of backlog items
 * with optional image attachments. Creates and maintains backlog-index.json
 * and individual Markdown files for each item.
 */
export class BacklogItemStorageService {

  /**
   * Creates a quick-todo item in the backlog.
   * Handles directory creation, index initialization, image saving,
   * Markdown file generation, and index update atomically.
   */
  async createItem(
    projectPath: string,
    request: CreateQuickTodoRequest
  ): Promise<CreateItemResult> {
    try {
      // Ensure directory structure exists
      await this.ensureDirectories(projectPath);

      // Read or initialize backlog-index.json
      const index = await this.readOrCreateIndex(projectPath);

      // Generate item ID
      const itemId = `ITEM-${String(index.nextId).padStart(3, '0')}`;

      // Save images if provided
      const savedImages: Array<{ filename: string; path: string }> = [];
      if (request.images && request.images.length > 0) {
        const attachmentDir = join(projectPath, ATTACHMENTS_DIR, itemId);
        await fs.mkdir(attachmentDir, { recursive: true });

        for (const image of request.images) {
          if (!ALLOWED_IMAGE_TYPES.has(image.mimeType)) {
            continue; // Skip invalid image types
          }

          const sanitizedName = this.sanitizeFilename(image.filename);
          const ext = MIME_TO_EXT[image.mimeType] || 'png';
          const filename = `${sanitizedName}.${ext}`;

          // Remove data URL prefix if present
          const base64Data = image.data.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          const filePath = join(attachmentDir, filename);
          await fs.writeFile(filePath, buffer, { mode: 0o644 });

          savedImages.push({
            filename,
            path: `attachments/${itemId}/${filename}`,
          });
        }
      }

      // Generate Markdown content
      const markdown = this.generateMarkdown(itemId, request, savedImages);

      // Write Markdown file
      const mdFilename = `${itemId.toLowerCase()}.md`;
      const mdPath = join(projectPath, ITEMS_DIR, mdFilename);
      await fs.writeFile(mdPath, markdown, 'utf-8');

      // Update index
      const now = new Date().toISOString();
      index.items.push({
        id: itemId,
        title: request.title,
        priority: request.priority,
        status: 'ready',
        createdAt: now,
        file: `items/${mdFilename}`,
      });
      index.nextId += 1;

      // Write index atomically (write to temp then rename)
      const indexPath = join(projectPath, INDEX_FILE);
      const tmpPath = `${indexPath}.tmp`;
      await fs.writeFile(tmpPath, JSON.stringify(index, null, 2), 'utf-8');
      await fs.rename(tmpPath, indexPath);

      return {
        success: true,
        itemId,
        file: `items/${mdFilename}`,
      };
    } catch (error) {
      console.error('Error creating backlog item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating backlog item',
      };
    }
  }

  /**
   * Ensures the backlog directory structure exists.
   */
  private async ensureDirectories(projectPath: string): Promise<void> {
    await fs.mkdir(join(projectPath, BACKLOG_DIR), { recursive: true });
    await fs.mkdir(join(projectPath, ITEMS_DIR), { recursive: true });
  }

  /**
   * Reads backlog-index.json or creates an empty one if it doesn't exist.
   */
  private async readOrCreateIndex(projectPath: string): Promise<BacklogIndex> {
    const indexPath = join(projectPath, INDEX_FILE);

    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(content) as BacklogIndex;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Create empty index
        const emptyIndex: BacklogIndex = {
          version: '1.0',
          nextId: 1,
          items: [],
        };
        await fs.writeFile(indexPath, JSON.stringify(emptyIndex, null, 2), 'utf-8');
        return emptyIndex;
      }
      throw error;
    }
  }

  /**
   * Generates Markdown content for a backlog item.
   */
  private generateMarkdown(
    itemId: string,
    request: CreateQuickTodoRequest,
    images: Array<{ filename: string; path: string }>
  ): string {
    const now = new Date().toISOString().split('T')[0];
    const lines: string[] = [
      `# ${request.title}`,
      '',
      `> Item ID: ${itemId}`,
      `> Priority: ${request.priority}`,
      `> Status: ready`,
      `> Created: ${now}`,
      `> Source: quick-todo`,
      '',
    ];

    if (request.description) {
      lines.push('## Description', '', request.description, '');
    }

    if (images.length > 0) {
      lines.push('## Attachments', '');
      for (const img of images) {
        const isImage = !img.filename.endsWith('.pdf');
        lines.push(isImage
          ? `![${img.filename}](${img.path})`
          : `[${img.filename}](${img.path})`
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Sanitizes a filename to prevent path traversal.
   */
  private sanitizeFilename(filename: string): string {
    let name = basename(filename);

    // Remove extension
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
}
