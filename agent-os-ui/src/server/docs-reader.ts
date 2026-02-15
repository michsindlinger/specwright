import { promises as fs } from 'fs';
import { join, basename, resolve, relative } from 'path';

export interface DocFile {
  filename: string;
  lastModified: string;
}

export interface DocContent {
  filename: string;
  content: string;
}

export interface DocWriteResult {
  success: boolean;
  timestamp: string;
  error?: string;
}

export interface DocListResult {
  files: DocFile[];
  message?: string;
}

export class DocsReader {
  private readonly DOCS_SUBPATH = 'agent-os/product';
  private readonly ALLOWED_EXTENSION = '.md';
  private readonly FILENAME_PATTERN = /^[a-zA-Z0-9_-]+\.md$/;

  /**
   * Validates a filename to prevent path traversal attacks.
   * Only allows alphanumeric characters, hyphens, underscores, and .md extension.
   */
  private isValidFilename(filename: string): boolean {
    if (!filename || typeof filename !== 'string') {
      return false;
    }

    // Check for path traversal patterns
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }

    // Check the filename pattern
    return this.FILENAME_PATTERN.test(filename);
  }

  /**
   * Resolves and validates a document path, ensuring it stays within the allowed directory.
   */
  private getValidatedDocPath(projectPath: string, filename: string): string | null {
    if (!this.isValidFilename(filename)) {
      return null;
    }

    const docsDir = join(projectPath, this.DOCS_SUBPATH);
    const resolvedPath = resolve(docsDir, filename);

    // Verify the resolved path is within the docs directory
    const relativePath = relative(docsDir, resolvedPath);
    if (relativePath.startsWith('..') || relativePath.includes('..')) {
      return null;
    }

    return resolvedPath;
  }

  /**
   * Lists all markdown documents in the project's agent-os/product/ folder.
   */
  async listDocs(projectPath: string): Promise<DocListResult> {
    const docsPath = join(projectPath, this.DOCS_SUBPATH);

    try {
      await fs.access(docsPath);
    } catch {
      return {
        files: [],
        message: 'Keine Projekt-Dokumente gefunden'
      };
    }

    try {
      const entries = await fs.readdir(docsPath, { withFileTypes: true });
      const files: DocFile[] = [];

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(this.ALLOWED_EXTENSION)) {
          const filePath = join(docsPath, entry.name);
          const stats = await fs.stat(filePath);

          files.push({
            filename: entry.name,
            lastModified: stats.mtime.toISOString()
          });
        }
      }

      // Sort by filename
      files.sort((a, b) => a.filename.localeCompare(b.filename));

      return { files };
    } catch {
      return {
        files: [],
        message: 'Fehler beim Lesen der Dokumente'
      };
    }
  }

  /**
   * Reads a single document by filename.
   */
  async readDoc(projectPath: string, filename: string): Promise<DocContent | null> {
    const validPath = this.getValidatedDocPath(projectPath, filename);

    if (!validPath) {
      return null;
    }

    try {
      const content = await fs.readFile(validPath, 'utf-8');
      return {
        filename: basename(validPath),
        content
      };
    } catch {
      return null;
    }
  }

  /**
   * Writes content to a document file.
   */
  async writeDoc(projectPath: string, filename: string, content: string): Promise<DocWriteResult> {
    const validPath = this.getValidatedDocPath(projectPath, filename);

    if (!validPath) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Ungültiger Dateipfad'
      };
    }

    try {
      // Ensure the directory exists
      const docsPath = join(projectPath, this.DOCS_SUBPATH);
      await fs.mkdir(docsPath, { recursive: true });

      await fs.writeFile(validPath, content, 'utf-8');

      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Fehler beim Speichern'
      };
    }
  }
}
