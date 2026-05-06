import { Router, Request, Response } from 'express';
import { SpecsReader } from '../specs-reader.js';
import { readLatestArchivedLog } from '../utils/auto-mode-logs.js';

const router = Router();

interface InitializeBoardResponse {
  success: boolean;
  boardPath?: string;
  error?: string;
  alreadyExists?: boolean;
  blockedCount?: number;
}

/**
 * POST /api/specs/:specId/initialize-board
 *
 * Initializes a kanban board for the specified spec.
 * - Parses story files from the spec's stories directory
 * - Creates kanban-board.md with parsed stories
 * - Returns success with board path or error details
 *
 * @param specId - The spec identifier (e.g., "2026-01-30-kanban-ui-initialization")
 * @returns { success: boolean, boardPath?: string, error?: string, alreadyExists?: boolean, blockedCount?: number }
 */
router.post('/initialize-board', async (req: Request, res: Response) => {
  try {
    const { specId } = req.params;

    if (!specId) {
      return res.status(400).json({
        success: false,
        error: 'specId parameter is required'
      } as InitializeBoardResponse);
    }

    // Get project root from environment or use current working directory
    const projectPath = process.env.PROJECT_ROOT || process.cwd();

    // Initialize SpecsReader
    const specsReader = new SpecsReader();

    // Initialize kanban board
    const result = await specsReader.initializeKanbanBoard(projectPath, specId);

    // Handle case where board already exists
    if (result.exists && !result.created) {
      return res.status(200).json({
        success: true,
        boardPath: result.path,
        alreadyExists: true,
        blockedCount: result.blockedCount
      } as InitializeBoardResponse);
    }

    // Handle case where initialization failed (no stories found)
    if (!result.created && result.reason) {
      return res.status(400).json({
        success: false,
        error: result.reason
      } as InitializeBoardResponse);
    }

    // Success - board was created
    return res.status(200).json({
      success: true,
      boardPath: result.path,
      blockedCount: result.blockedCount
    } as InitializeBoardResponse);

  } catch (error) {
    console.error('Error initializing kanban board:', error);

    // Check if it's a file not found error (spec doesn't exist)
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Spec not found'
      } as InitializeBoardResponse);
    }

    // Generic server error
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    } as InitializeBoardResponse);
  }
});

/**
 * GET /api/specs/:specId/stories/:storyId/logs?projectPath=<encoded-path>
 *
 * D12 / v3.28.1: Returns the most recent archived log for a story. Used by the
 * halted-state UI when the live cloud-terminal session has ended.
 *
 * 200: { content: string, path: string }
 * 404: { error: 'No archived log found' } when nothing has been persisted.
 */
router.get('/stories/:storyId/logs', async (req: Request, res: Response) => {
  try {
    const { specId, storyId } = req.params;
    const projectPath = (req.query.projectPath as string | undefined) ?? process.env.PROJECT_ROOT ?? process.cwd();

    if (!specId || !storyId) {
      return res.status(400).json({ error: 'specId and storyId required' });
    }

    const result = await readLatestArchivedLog(projectPath, specId, storyId);
    if (!result) {
      return res.status(404).json({ error: 'No archived log found' });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error reading archived log:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
