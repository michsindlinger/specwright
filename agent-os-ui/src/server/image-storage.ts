import { promises as fs } from 'fs';
import { join, basename, extname } from 'path';
import { randomUUID } from 'crypto';

/**
 * Image information returned by storage operations
 */
export interface ImageInfo {
  /** Relative path from the project root */
  path: string;
  /** Filename only */
  filename: string;
  /** MIME type (image/png, image/jpeg, etc.) */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** ISO timestamp of creation */
  createdAt: string;
}

/**
 * Result of image save operation
 */
export interface SaveImageResult {
  success: boolean;
  imageInfo?: ImageInfo;
  error?: string;
}

/**
 * Allowed MIME types for image uploads
 */
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/pdf', // PDF support for document scans
  'image/svg+xml'
]);

/**
 * Map MIME types to file extensions
 */
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'image/svg+xml': 'svg'
};

/**
 * Maximum file size (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Directory name for storing chat images within a project
 */
const CHAT_IMAGES_DIR = '.agent-os/chat-images';

/**
 * ImageStorageService provides persistent image storage for chat images.
 * Images are stored in the project's .agent-os/chat-images directory.
 */
export class ImageStorageService {
  /**
   * Saves an image to the project's chat-images directory.
   *
   * @param projectPath - Root path of the project
   * @param imageData - Image data as Buffer or base64 string
   * @param originalName - Original filename from upload
   * @param mimeType - MIME type of the image
   * @returns Promise<SaveImageResult> with image info or error
   */
  async saveImage(
    projectPath: string,
    imageData: Buffer | string,
    originalName: string,
    mimeType: string
  ): Promise<SaveImageResult> {
    try {
      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return {
          success: false,
          error: `Ungültiges Dateiformat: ${mimeType}. Erlaubt sind: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}`
        };
      }

      // Convert base64 to Buffer if needed
      let buffer: Buffer;
      if (typeof imageData === 'string') {
        // Remove data URL prefix if present (e.g., "data:image/png;base64,")
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/i, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = imageData;
      }

      // Validate file size
      if (buffer.length > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `Datei zu groß: ${(buffer.length / 1024 / 1024).toFixed(2)}MB. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        };
      }

      // Ensure the chat-images directory exists
      const imagesDir = join(projectPath, CHAT_IMAGES_DIR);
      await fs.mkdir(imagesDir, { recursive: true });

      // Sanitize the original filename
      const sanitizedName = this.sanitizeFilename(originalName);

      // Generate unique filename with timestamp and UUID
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
      const ext = MIME_TO_EXT[mimeType] || 'png';
      const uuid = randomUUID().split('-')[0]; // Short UUID (8 chars)
      const filename = `${timestamp}-${uuid}-${sanitizedName}.${ext}`;

      // Write the file
      const filePath = join(imagesDir, filename);
      await fs.writeFile(filePath, buffer, { mode: 0o644 });

      // Create ImageInfo
      const imageInfo: ImageInfo = {
        path: join(CHAT_IMAGES_DIR, filename),
        filename,
        mimeType,
        size: buffer.length,
        createdAt: now.toISOString()
      };

      return {
        success: true,
        imageInfo
      };
    } catch (error) {
      console.error('Error saving image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving image'
      };
    }
  }

  /**
   * Retrieves an image from the project's chat-images directory.
   *
   * @param projectPath - Root path of the project
   * @param imagePath - Relative path to the image (e.g., ".agent-os/chat-images/20260202-143000-abc-screenshot.png")
   * @returns Promise<Buffer | null> with image data or null if not found
   */
  async getImage(projectPath: string, imagePath: string): Promise<Buffer | null> {
    try {
      // Prevent path traversal attacks
      const normalizedPath = this.normalizePath(imagePath);
      if (!normalizedPath.startsWith(CHAT_IMAGES_DIR)) {
        console.error('Path traversal attempt detected:', imagePath);
        return null;
      }

      const fullPath = join(projectPath, normalizedPath);
      const buffer = await fs.readFile(fullPath);
      return buffer;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.error('Error reading image:', error);
      return null;
    }
  }

  /**
   * Gets metadata about an image without reading the full file.
   *
   * @param projectPath - Root path of the project
   * @param imagePath - Relative path to the image
   * @returns Promise<ImageInfo | null> with image metadata or null if not found
   */
  async getImageInfo(projectPath: string, imagePath: string): Promise<ImageInfo | null> {
    try {
      // Prevent path traversal attacks
      const normalizedPath = this.normalizePath(imagePath);
      if (!normalizedPath.startsWith(CHAT_IMAGES_DIR)) {
        console.error('Path traversal attempt detected:', imagePath);
        return null;
      }

      const fullPath = join(projectPath, normalizedPath);
      const stats = await fs.stat(fullPath);

      // Extract MIME type from file extension
      const ext = extname(fullPath).toLowerCase().substring(1);
      const mimeType = this.getExtensionMimeType(ext);

      return {
        path: normalizedPath,
        filename: basename(fullPath),
        mimeType,
        size: stats.size,
        createdAt: stats.mtime.toISOString()
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.error('Error getting image info:', error);
      return null;
    }
  }

  /**
   * Deletes an image from the project's chat-images directory.
   *
   * @param projectPath - Root path of the project
   * @param imagePath - Relative path to the image
   * @returns Promise<boolean> true if deleted, false if not found or error
   */
  async deleteImage(projectPath: string, imagePath: string): Promise<boolean> {
    try {
      // Prevent path traversal attacks
      const normalizedPath = this.normalizePath(imagePath);
      if (!normalizedPath.startsWith(CHAT_IMAGES_DIR)) {
        console.error('Path traversal attempt detected:', imagePath);
        return false;
      }

      const fullPath = join(projectPath, normalizedPath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Lists all images in the project's chat-images directory.
   *
   * @param projectPath - Root path of the project
   * @returns Promise<ImageInfo[]> array of image metadata
   */
  async listImages(projectPath: string): Promise<ImageInfo[]> {
    try {
      const imagesDir = join(projectPath, CHAT_IMAGES_DIR);
      const files = await fs.readdir(imagesDir, { withFileTypes: true });

      const images: ImageInfo[] = [];

      for (const file of files) {
        if (file.isFile()) {
          const filePath = join(imagesDir, file.name);
          try {
            const stats = await fs.stat(filePath);
            const ext = extname(file.name).toLowerCase().substring(1);
            const mimeType = this.getExtensionMimeType(ext);

            images.push({
              path: join(CHAT_IMAGES_DIR, file.name),
              filename: file.name,
              mimeType,
              size: stats.size,
              createdAt: stats.mtime.toISOString()
            });
          } catch {
            // Skip files that can't be read
            continue;
          }
        }
      }

      // Sort by creation time, newest first
      images.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return images;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Directory doesn't exist yet
        return [];
      }
      console.error('Error listing images:', error);
      return [];
    }
  }

  /**
   * Sanitizes a filename to prevent path traversal and other issues.
   * Removes dangerous characters and preserves the base name.
   */
  private sanitizeFilename(filename: string): string {
    // Remove directory paths (basename only)
    let name = basename(filename);

    // Remove file extension
    name = name.replace(/\.[^/.]+$/, '');

    // Remove or replace dangerous characters
    name = name
      .replace(/[<>:"/\\|?*]/g, '') // Remove dangerous chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .toLowerCase();

    // Ensure non-empty result
    if (!name) {
      name = 'image';
    }

    // Limit length
    if (name.length > 50) {
      name = name.substring(0, 50);
    }

    return name;
  }

  /**
   * Normalizes a path to prevent path traversal attacks.
   * Resolves any '..' or '.' segments and ensures the path is safe.
   */
  private normalizePath(inputPath: string): string {
    // Remove leading slash if present
    let normalized = inputPath.replace(/^\/+/, '');

    // Convert backslashes to forward slashes
    normalized = normalized.replace(/\\/g, '/');

    // Split and resolve path segments
    const segments = normalized.split('/');
    const resolved: string[] = [];

    for (const segment of segments) {
      if (segment === '..' || segment === '.') {
        // Skip parent/current directory references
        continue;
      }
      if (segment === '') {
        // Skip empty segments
        continue;
      }
      resolved.push(segment);
    }

    return resolved.join('/');
  }

  /**
   * Gets MIME type from file extension.
   */
  private getExtensionMimeType(ext: string): string {
    const extToMime: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'svg': 'image/svg+xml'
    };
    return extToMime[ext] || 'application/octet-stream';
  }

  /**
   * Validates if a file is an allowed image type.
   */
  static isValidMimeType(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.has(mimeType);
  }

  /**
   * Gets the maximum allowed file size in bytes.
   */
  static getMaxFileSize(): number {
    return MAX_FILE_SIZE;
  }

  /**
   * Gets the chat-images storage directory path.
   */
  static getStorageDir(): string {
    return CHAT_IMAGES_DIR;
  }
}
