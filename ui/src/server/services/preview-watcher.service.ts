import { watch, existsSync, readFileSync, unlinkSync, readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { webSocketManager } from '../websocket-manager.service.js';

const TMP_DIR = '/tmp';
const PREVIEW_FILE_PATTERN = /^specwright-preview-[a-f0-9]+\.json$/;

interface PreviewRequest {
  action: 'open' | 'close';
  filePath: string | null;
  projectPath: string;
  timestamp: string;
}

/**
 * PreviewWatcher watches /tmp/ for specwright-preview-*.json files
 * created by MCP tools (DPP-001) and broadcasts them to connected
 * WebSocket clients for the matching project.
 */
export class PreviewWatcher {
  private watcher: ReturnType<typeof watch> | null = null;
  private processing: Set<string> = new Set();

  /**
   * Start watching /tmp/ for preview request files.
   * Also performs startup cleanup of stale files.
   */
  public init(): void {
    this.cleanupStaleFiles();
    this.startWatching();
    console.log('[PreviewWatcher] Initialized and watching /tmp/ for preview requests');
  }

  /**
   * Stop watching and clean up.
   */
  public stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    console.log('[PreviewWatcher] Stopped');
  }

  /**
   * Cleanup: Remove any stale preview request files from /tmp/ on startup.
   */
  private cleanupStaleFiles(): void {
    try {
      const files = readdirSync(TMP_DIR);
      let cleaned = 0;
      for (const file of files) {
        if (PREVIEW_FILE_PATTERN.test(file)) {
          try {
            unlinkSync(join(TMP_DIR, file));
            cleaned++;
          } catch {
            // File may have already been removed
          }
        }
      }
      if (cleaned > 0) {
        console.log(`[PreviewWatcher] Cleaned up ${cleaned} stale preview file(s)`);
      }
    } catch {
      // /tmp/ read error - non-critical
    }
  }

  /**
   * Start fs.watch on /tmp/ and filter for preview request files.
   */
  private startWatching(): void {
    this.watcher = watch(TMP_DIR, (_eventType, filename) => {
      if (!filename || !PREVIEW_FILE_PATTERN.test(filename)) {
        return;
      }

      // Debounce: skip if already processing this file
      if (this.processing.has(filename)) {
        return;
      }

      this.processing.add(filename);

      // Small delay to ensure file is fully written
      setTimeout(() => {
        this.processPreviewFile(filename).finally(() => {
          this.processing.delete(filename);
        });
      }, 50);
    });
  }

  /**
   * Process a detected preview request file.
   */
  private async processPreviewFile(filename: string): Promise<void> {
    const filePath = join(TMP_DIR, filename);

    try {
      // Check file still exists (might have been cleaned up already)
      if (!existsSync(filePath)) {
        return;
      }

      // Read and parse the preview request
      const content = await readFile(filePath, 'utf-8');
      const request = JSON.parse(content) as PreviewRequest;

      if (request.action === 'open') {
        await this.handleOpen(request);
      } else if (request.action === 'close') {
        this.handleClose(request);
      }

      // Delete the preview request file
      this.deletePreviewFile(filePath);
    } catch (error) {
      console.error(`[PreviewWatcher] Error processing ${filename}:`, error);

      // Try to extract projectPath for error notification
      try {
        const content = readFileSync(filePath, 'utf-8');
        const request = JSON.parse(content) as PreviewRequest;
        this.sendError(request.projectPath, `Failed to process preview request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } catch {
        // Cannot even read the file - nothing more we can do
      }

      // Clean up the file even on error
      this.deletePreviewFile(filePath);
    }
  }

  /**
   * Handle an 'open' preview request: read the document and broadcast to clients.
   */
  private async handleOpen(request: PreviewRequest): Promise<void> {
    if (!request.filePath) {
      this.sendError(request.projectPath, 'No file path specified in preview request');
      return;
    }

    // Check if the referenced file exists
    if (!existsSync(request.filePath)) {
      this.sendError(request.projectPath, `File not found: ${request.filePath}`);
      return;
    }

    // Read the document content
    const documentContent = await readFile(request.filePath, 'utf-8');

    webSocketManager.sendToProject(request.projectPath, {
      type: 'document-preview.open',
      filePath: request.filePath,
      content: documentContent,
      timestamp: new Date().toISOString()
    });

    console.log(`[PreviewWatcher] Sent document-preview.open for ${request.filePath} to project ${request.projectPath}`);
  }

  /**
   * Handle a 'close' preview request: broadcast close to clients.
   */
  private handleClose(request: PreviewRequest): void {
    webSocketManager.sendToProject(request.projectPath, {
      type: 'document-preview.close',
      timestamp: new Date().toISOString()
    });

    console.log(`[PreviewWatcher] Sent document-preview.close to project ${request.projectPath}`);
  }

  /**
   * Send an error message to the project's clients.
   */
  private sendError(projectPath: string, message: string): void {
    webSocketManager.sendToProject(projectPath, {
      type: 'document-preview.error',
      error: message,
      timestamp: new Date().toISOString()
    });

    console.error(`[PreviewWatcher] Error for project ${projectPath}: ${message}`);
  }

  /**
   * Safely delete a preview file.
   */
  private deletePreviewFile(filePath: string): void {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {
      // Non-critical: file may have already been removed
    }
  }
}
