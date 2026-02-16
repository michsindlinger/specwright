import { promises as fs } from 'fs';
import { join, resolve, relative, extname, posix } from 'path';
import {
  FileEntry,
  FileListResult,
  FileReadResult,
  FileWriteResult,
  FileCreateResult,
  FileMkdirResult,
  FileRenameResult,
  FileDeleteResult,
  FILE_CONFIG,
} from '../../shared/types/file.protocol.js';

// ============================================================================
// Language Detection
// ============================================================================

const EXT_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.json': 'json',
  '.md': 'markdown',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.svg': 'xml',
  '.py': 'python',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.toml': 'toml',
  '.ini': 'ini',
  '.env': 'plaintext',
  '.txt': 'plaintext',
  '.log': 'plaintext',
  '.dockerfile': 'dockerfile',
};

// ============================================================================
// FileService
// ============================================================================

/**
 * FileService handles filesystem operations for the File Editor.
 * All paths are validated against the project root to prevent path traversal.
 */
export class FileService {

  /**
   * Validate that a resolved path stays within the project root.
   * Throws on path traversal attempts.
   */
  private validatePath(projectPath: string, requestedPath: string): string {
    const resolved = resolve(projectPath, requestedPath);
    const rel = relative(projectPath, resolved);

    if (rel.startsWith('..') || resolve(projectPath, rel) !== resolved) {
      throw new Error('Path traversal attempt detected');
    }

    return resolved;
  }

  /**
   * Detect language from file extension.
   */
  private detectLanguage(filename: string): string {
    const ext = extname(filename).toLowerCase();
    return EXT_TO_LANGUAGE[ext] || 'plaintext';
  }

  /**
   * Check if file content is binary by attempting UTF-8 decode.
   */
  private isBinaryContent(buffer: Buffer): boolean {
    // Check for null bytes (common in binary files)
    for (let i = 0; i < Math.min(buffer.length, 8192); i++) {
      if (buffer[i] === 0) return true;
    }
    return false;
  }

  /**
   * List directory contents (non-recursive, direct children only).
   */
  async list(projectPath: string, dirPath: string): Promise<FileListResult> {
    const resolved = this.validatePath(projectPath, dirPath);

    const dirents = await fs.readdir(resolved, { withFileTypes: true });
    const entries: FileEntry[] = [];

    for (const dirent of dirents) {
      // Skip hidden files/folders starting with .
      if (dirent.name.startsWith('.')) continue;
      // Skip node_modules
      if (dirent.name === 'node_modules') continue;

      const entryPath = dirPath === '.' ? dirent.name : posix.join(dirPath, dirent.name);

      if (dirent.isDirectory()) {
        entries.push({ name: dirent.name, path: entryPath, type: 'directory', size: 0 });
      } else if (dirent.isFile()) {
        try {
          const stat = await fs.stat(join(resolved, dirent.name));
          entries.push({ name: dirent.name, path: entryPath, type: 'file', size: stat.size });
        } catch {
          entries.push({ name: dirent.name, path: entryPath, type: 'file', size: 0 });
        }
      }
    }

    // Sort: directories first, then files, alphabetically
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return { path: dirPath, entries };
  }

  /**
   * Read file content as text.
   * Returns binary indicator if file is not text.
   */
  async read(projectPath: string, filePath: string): Promise<FileReadResult> {
    const resolved = this.validatePath(projectPath, filePath);

    const stat = await fs.stat(resolved);
    if (stat.size > FILE_CONFIG.MAX_FILE_SIZE_BYTES) {
      throw new Error(`File too large (max ${FILE_CONFIG.MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)`);
    }

    const buffer = await fs.readFile(resolved);

    if (this.isBinaryContent(buffer)) {
      return {
        path: filePath,
        content: '',
        language: 'binary',
        isBinary: true,
      };
    }

    const content = buffer.toString('utf-8');
    const language = this.detectLanguage(filePath);

    return { path: filePath, content, language, isBinary: false };
  }

  /**
   * Write content to a file.
   */
  async write(projectPath: string, filePath: string, content: string): Promise<FileWriteResult> {
    const resolved = this.validatePath(projectPath, filePath);
    await fs.writeFile(resolved, content, 'utf-8');
    return { path: filePath, success: true };
  }

  /**
   * Create a new empty file.
   */
  async create(projectPath: string, filePath: string): Promise<FileCreateResult> {
    const resolved = this.validatePath(projectPath, filePath);
    await fs.writeFile(resolved, '', 'utf-8');
    return { path: filePath, success: true };
  }

  /**
   * Create a new directory.
   */
  async mkdir(projectPath: string, dirPath: string): Promise<FileMkdirResult> {
    const resolved = this.validatePath(projectPath, dirPath);
    await fs.mkdir(resolved, { recursive: true });
    return { path: dirPath, success: true };
  }

  /**
   * Rename/move a file or directory.
   */
  async rename(projectPath: string, oldPath: string, newPath: string): Promise<FileRenameResult> {
    const resolvedOld = this.validatePath(projectPath, oldPath);
    const resolvedNew = this.validatePath(projectPath, newPath);
    await fs.rename(resolvedOld, resolvedNew);
    return { oldPath, newPath, success: true };
  }

  /**
   * Delete a file or empty directory.
   */
  async delete(projectPath: string, filePath: string): Promise<FileDeleteResult> {
    const resolved = this.validatePath(projectPath, filePath);

    const stat = await fs.stat(resolved);
    if (stat.isDirectory()) {
      await fs.rmdir(resolved);
    } else {
      await fs.unlink(resolved);
    }

    return { path: filePath, success: true };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const fileService = new FileService();
