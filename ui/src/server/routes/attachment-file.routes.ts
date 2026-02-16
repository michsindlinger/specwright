import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import { resolve, relative, extname } from 'path';
import { projectDir } from '../utils/project-dirs.js';

const router = Router();

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
};

/**
 * GET /api/attachments/:encodedProjectPath/spec/:specId/*
 *
 * Serves spec story attachment files from specwright/specs/{specId}/attachments/.
 * URL format after transform: /api/attachments/{encodedProjectPath}/spec/{specId}/{storyId}/{filename}
 */
router.get('/:encodedProjectPath/spec/:specId/*', async (req: Request, res: Response) => {
  try {
    const { encodedProjectPath, specId } = req.params;
    const attachmentPath = req.params[0]; // e.g., "SCA-001/cleanshot.png"

    if (!encodedProjectPath || !specId || !attachmentPath) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const projectPath = decodeURIComponent(encodedProjectPath);
    const baseDir = projectDir(projectPath, 'specs', specId, 'attachments');
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
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(fileBuffer);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
