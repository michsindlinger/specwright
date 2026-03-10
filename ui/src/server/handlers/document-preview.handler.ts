import { WebSocket } from 'ws';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { webSocketManager } from '../websocket-manager.service.js';

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface WebSocketClient extends WebSocket {
  clientId: string;
  projectId?: string;
}

/**
 * DocumentPreviewHandler processes WebSocket messages for document preview operations.
 * Handles save requests from the frontend preview panel.
 * Follows the existing handler pattern (FileHandler, AttachmentHandler).
 */
export class DocumentPreviewHandler {
  /**
   * Handle document-preview.save message.
   * Writes the updated content to the file on disk and broadcasts confirmation.
   */
  public async handleSave(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const filePath = message.filePath as string;
    const content = message.content as string;

    if (!filePath) {
      this.sendError(client, 'filePath is required');
      return;
    }

    if (content === undefined || content === null) {
      this.sendError(client, 'content is required');
      return;
    }

    try {
      // Verify the file exists before writing
      if (!existsSync(filePath)) {
        this.sendError(client, `File not found: ${filePath}`);
        return;
      }

      // Write the updated content
      await fs.writeFile(filePath, content, 'utf-8');

      // Send confirmation back to the requesting client
      const response: WebSocketMessage = {
        type: 'document-preview.save.response',
        filePath,
        success: true,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));

      // Broadcast to all project clients that the document was saved
      webSocketManager.sendToProject(projectPath, {
        type: 'document-preview.saved',
        filePath,
        timestamp: new Date().toISOString(),
      });

      console.log(`[DocumentPreviewHandler] Saved ${filePath}`);
    } catch (error) {
      console.error(`[DocumentPreviewHandler] Save error for ${filePath}:`, error);
      this.sendError(client, `Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private sendError(client: WebSocketClient, message: string): void {
    const response: WebSocketMessage = {
      type: 'document-preview.save.error',
      message,
      timestamp: new Date().toISOString(),
    };
    client.send(JSON.stringify(response));
  }
}

// Singleton export
export const documentPreviewHandler = new DocumentPreviewHandler();
