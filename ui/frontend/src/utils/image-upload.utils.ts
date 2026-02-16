import type { StagedImage } from '../views/chat-view.js';

// Allowed file types for upload (SCA-002: extended with text types)
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/json',
  'text/markdown',
];

// Max file size: 5MB (consistent with backend limit)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Max number of images
export const MAX_IMAGES = 5;

/**
 * Validate a file for type, size, and count constraints.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateFile(file: File, currentCount: number): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Format nicht unterstützt. Erlaubt: PNG, JPG, GIF, WebP, PDF, TXT, JSON, MD';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'Maximale Dateigröße: 5MB';
  }

  if (currentCount >= MAX_IMAGES) {
    return `Maximal ${MAX_IMAGES} Anhänge erlaubt`;
  }

  return null;
}

/** @deprecated Use validateFile instead */
export const validateImageFile = validateFile;

/**
 * Read a File as a data URL string.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Create a StagedImage from a File.
 */
export async function createStagedImage(file: File): Promise<StagedImage> {
  const dataUrl = await readFileAsDataUrl(file);
  const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  return { file, dataUrl, id };
}

export type { StagedImage };
