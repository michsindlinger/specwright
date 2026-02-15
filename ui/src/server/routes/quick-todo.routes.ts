import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import { join, resolve, relative, extname } from 'path';
import { BacklogItemStorageService, CreateQuickTodoRequest } from '../backlog-item-storage.js';

const router = Router();
const backlogStorage = new BacklogItemStorageService();

interface QuickTodoResponse {
  success: boolean;
  itemId?: string;
  file?: string;
  error?: string;
}

/**
 * POST /api/backlog/:projectPath/quick-todo
 *
 * Creates a quick-todo item in the project's backlog.
 *
 * @param projectPath - URL-encoded project path
 * @body { title: string, description?: string, priority: string, images?: Array<{ data: string, filename: string, mimeType: string }> }
 * @returns QuickTodoResponse with itemId on success
 */
router.post('/:projectPath/quick-todo', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;

    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: 'projectPath parameter is required',
      } as QuickTodoResponse);
    }

    const projectFullPath = decodeURIComponent(projectPath);

    const body = req.body as CreateQuickTodoRequest;

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
      } as QuickTodoResponse);
    }

    if (!body.priority || typeof body.priority !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Priority is required',
      } as QuickTodoResponse);
    }

    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(body.priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
      } as QuickTodoResponse);
    }

    const result = await backlogStorage.createItem(projectFullPath, {
      title: body.title.trim(),
      description: body.description,
      priority: body.priority,
      images: body.images,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to create backlog item',
      } as QuickTodoResponse);
    }

    return res.status(201).json({
      success: true,
      itemId: result.itemId,
      file: result.file,
    } as QuickTodoResponse);

  } catch (error) {
    console.error('Error creating quick-todo:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    } as QuickTodoResponse);
  }
});

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

/**
 * GET /api/backlog/:projectPath/attachments/*
 *
 * Serves backlog attachment images from agent-os/backlog/items/attachments/.
 */
router.get('/:projectPath/attachments/*', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;
    const attachmentPath = req.params[0];

    if (!projectPath || !attachmentPath) {
      return res.status(400).json({ error: 'Missing projectPath or attachment path' });
    }

    const projectFullPath = decodeURIComponent(projectPath);
    const baseDir = join(projectFullPath, 'agent-os', 'backlog', 'items', 'attachments');
    const filePath = resolve(baseDir, attachmentPath);

    // Prevent path traversal
    const rel = relative(baseDir, filePath);
    if (rel.startsWith('..') || rel.includes('..')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const ext = extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext];
    if (!mimeType) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const fileBuffer = await fs.readFile(filePath);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.send(fileBuffer);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
