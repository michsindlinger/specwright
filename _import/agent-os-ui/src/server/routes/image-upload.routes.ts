import { Router, Request, Response } from 'express';
import { ImageStorageService } from '../image-storage.js';

const router = Router();
const imageStorage = new ImageStorageService();

/**
 * UploadResponse interface for the upload endpoint
 */
interface UploadResponse {
  success: boolean;
  imagePath?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  error?: string;
}

/**
 * ListImagesResponse interface for listing all images
 */
interface ListImagesResponse {
  success: boolean;
  images?: Array<{
    path: string;
    filename: string;
    mimeType: string;
    size: number;
    createdAt: string;
  }>;
  error?: string;
}

/**
 * GET /api/images/:projectPath
 *
 * Lists all images in the project's chat-images directory.
 *
 * @param projectPath - URL-encoded project path (e.g., "users%2Fjohn%2Fmy-project")
 * @returns JSON array of image metadata
 */
router.get('/:projectPath', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;

    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: 'projectPath parameter is required'
      } as UploadResponse);
    }

    const projectFullPath = decodeURIComponent(projectPath);

    // List all images
    const images = await imageStorage.listImages(projectFullPath);

    return res.status(200).json({
      success: true,
      images
    } as ListImagesResponse);

  } catch (error) {
    console.error('Error listing images:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    } as UploadResponse);
  }
});

/**
 * GET /api/images/:projectPath/*
 *
 * Serves a single image file by path.
 *
 * @param projectPath - URL-encoded project path
 * @param * - Wildcard catches the remaining image path (e.g., ".agent-os/chat-images/20260202-143000-abc-screenshot.png")
 * @returns Image file with appropriate Content-Type header
 */
router.get('/:projectPath/*', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;
    const imagePath = req.params[0]; // Captured by wildcard

    if (!projectPath || !imagePath) {
      return res.status(400).send('Bad Request: Missing projectPath or imagePath');
    }

    const projectFullPath = decodeURIComponent(projectPath);

    // Get the image
    const buffer = await imageStorage.getImage(projectFullPath, imagePath);

    if (!buffer) {
      return res.status(404).send('Not Found: Image does not exist');
    }

    // Get image info for MIME type
    const imageInfo = await imageStorage.getImageInfo(projectFullPath, imagePath);

    if (imageInfo) {
      res.setHeader('Content-Type', imageInfo.mimeType);
      res.setHeader('Content-Length', imageInfo.size);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    }

    return res.send(buffer);

  } catch (error) {
    console.error('Error serving image:', error);

    return res.status(500).send('Internal server error');
  }
});

/**
 * POST /api/images/:projectPath/upload
 *
 * Uploads an image via multipart/form-data (for large files > 1MB).
 * For smaller files via WebSocket, use ImageStorageService.saveImage directly.
 *
 * Request body (multipart/form-data):
 * - file: The image file
 * - filename: Original filename (optional, uses file's name if not provided)
 *
 * @param projectPath - URL-encoded project path
 * @returns JSON with imagePath on success or error message on failure
 */
router.post('/:projectPath/upload', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;

    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: 'projectPath parameter is required'
      } as UploadResponse);
    }

    const projectFullPath = decodeURIComponent(projectPath);

    // For multipart/form-data, we need multer middleware
    // Since we're avoiding multer for now (per story requirements),
    // this endpoint expects the file to be sent as base64 in the request body
    // or the user should use WebSocket uploads for large files

    // Parse request body
    let imageData: Buffer | string;
    let originalName = 'upload';
    let mimeType = 'image/png';

    // Check if it's a base64 upload
    if (req.body && req.body.data) {
      imageData = req.body.data; // base64 string
      originalName = req.body.filename || 'upload';
      mimeType = req.body.mimeType || 'image/png';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Expected request body with { data: base64, filename: string, mimeType: string }'
      } as UploadResponse);
    }

    // Validate MIME type
    if (!ImageStorageService.isValidMimeType(mimeType)) {
      return res.status(400).json({
        success: false,
        error: `Ungültiges Dateiformat: ${mimeType}. Erlaubt sind: image/png, image/jpeg, image/gif, image/webp, application/pdf, image/svg+xml`
      } as UploadResponse);
    }

    // Save the image
    const result = await imageStorage.saveImage(
      projectFullPath,
      imageData,
      originalName,
      mimeType
    );

    if (!result.success || !result.imageInfo) {
      const statusCode = result.error?.includes('zu groß') ? 413 : 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error || 'Failed to save image'
      } as UploadResponse);
    }

    return res.status(200).json({
      success: true,
      imagePath: result.imageInfo.path,
      filename: result.imageInfo.filename,
      mimeType: result.imageInfo.mimeType,
      size: result.imageInfo.size,
      createdAt: result.imageInfo.createdAt
    } as UploadResponse);

  } catch (error) {
    console.error('Error uploading image:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    } as UploadResponse);
  }
});

/**
 * DELETE /api/images/:projectPath/* (optional, not in original story spec)
 *
 * Deletes an image file by path.
 *
 * @param projectPath - URL-encoded project path
 * @param * - Wildcard catches the image path
 * @returns JSON with success status
 */
router.delete('/:projectPath/*', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;
    const imagePath = req.params[0]; // Captured by wildcard

    if (!projectPath || !imagePath) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request: Missing projectPath or imagePath'
      });
    }

    const projectFullPath = decodeURIComponent(projectPath);

    // Delete the image
    const deleted = await imageStorage.deleteImage(projectFullPath, imagePath);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found: Image does not exist'
      });
    }

    return res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error('Error deleting image:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
