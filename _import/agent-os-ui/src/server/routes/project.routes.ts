import { Router, Request, Response } from 'express';
import { projectContextService } from '../project-context.service.js';

const router = Router();

interface SwitchRequest {
  path: string;
}

interface SwitchResponse {
  success: boolean;
  path?: string;
  name?: string;
  error?: string;
}

interface CurrentResponse {
  path: string | null;
  name: string | null;
}

interface ValidateRequest {
  path: string;
}

interface ValidateResponse {
  valid: boolean;
  name?: string;
  error?: string;
}

/**
 * POST /api/project/switch
 *
 * Switches the project context for the current session.
 * Validates that the path exists and contains an agent-os/ subdirectory.
 *
 * Request body: { path: string }
 * Response: { success: boolean, path?: string, name?: string, error?: string }
 *
 * @param req.body.path - The absolute path to the project directory
 */
router.post('/switch', (req: Request, res: Response) => {
  const { path: projectPath } = req.body as SwitchRequest;

  if (!projectPath) {
    return res.status(400).json({
      success: false,
      error: 'Path is required'
    } as SwitchResponse);
  }

  // For REST API, use a session ID from header or generate from request
  // In production, this would come from authentication/session middleware
  const sessionId = req.headers['x-session-id'] as string || 'default-session';

  const result = projectContextService.switchProject(sessionId, projectPath);

  if (!result.success) {
    // Determine appropriate HTTP status based on error
    let status = 400;
    if (result.error?.includes('does not exist')) {
      status = 404;
    }

    return res.status(status).json({
      success: false,
      error: result.error
    } as SwitchResponse);
  }

  return res.status(200).json({
    success: true,
    path: result.project?.path,
    name: result.project?.name
  } as SwitchResponse);
});

/**
 * GET /api/project/current
 *
 * Gets the current project context for the session.
 *
 * Response: { path: string | null, name: string | null }
 */
router.get('/current', (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string || 'default-session';

  const current = projectContextService.getCurrentProject(sessionId);

  return res.status(200).json({
    path: current?.path || null,
    name: current?.name || null
  } as CurrentResponse);
});

/**
 * POST /api/project/validate
 *
 * Validates a project path without switching context.
 * Checks that the path exists and contains an agent-os/ subdirectory.
 *
 * Request body: { path: string }
 * Response: { valid: boolean, name?: string, error?: string }
 *
 * @param req.body.path - The path to validate
 */
router.post('/validate', (req: Request, res: Response) => {
  const { path: projectPath } = req.body as ValidateRequest;

  if (!projectPath) {
    return res.status(400).json({
      valid: false,
      error: 'Path is required'
    } as ValidateResponse);
  }

  const result = projectContextService.validateProject(projectPath);

  return res.status(200).json({
    valid: result.valid,
    name: result.name,
    error: result.error
  } as ValidateResponse);
});

export default router;
