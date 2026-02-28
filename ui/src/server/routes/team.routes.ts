import { Router, Request, Response } from 'express';
import { skillsReaderService } from '../services/skills-reader.service.js';
import { mcpConfigReaderService } from '../services/mcp-config-reader.service.js';
import { SkillsListResponse, SkillDetailResponse, SkillUpdateResponse, McpConfigResponse } from '../../shared/types/team.protocol.js';

const router = Router();

/**
 * GET /api/team/:projectPath/mcp-config
 *
 * Returns the MCP server configuration for a project.
 * Reads .mcp.json from project root or parent directory.
 * SECURITY: env fields are stripped from server entries.
 *
 * @param projectPath - URL-encoded project path
 * @returns McpConfigResponse with servers array
 */
router.get('/:projectPath/mcp-config', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;

    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: 'projectPath parameter is required',
      } as McpConfigResponse);
    }

    const projectFullPath = decodeURIComponent(projectPath);
    const result = await mcpConfigReaderService.readConfig(projectFullPath);

    return res.json({
      success: true,
      servers: result.servers,
      message: result.message,
    } as McpConfigResponse);

  } catch (error) {
    console.error('Error reading MCP config:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    } as McpConfigResponse);
  }
});

/**
 * GET /api/team/:projectPath/skills
 *
 * Lists all skills for a project by reading .claude/skills/ directory.
 *
 * @param projectPath - URL-encoded project path
 * @returns SkillsListResponse with skills array
 */
router.get('/:projectPath/skills', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;

    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: 'projectPath parameter is required',
      } as SkillsListResponse);
    }

    const projectFullPath = decodeURIComponent(projectPath);
    const skills = await skillsReaderService.listSkills(projectFullPath);

    return res.json({
      success: true,
      skills,
    } as SkillsListResponse);

  } catch (error) {
    console.error('Error listing skills:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    } as SkillsListResponse);
  }
});

/**
 * GET /api/team/:projectPath/skills/:skillId
 *
 * Returns detailed information about a single skill.
 *
 * @param projectPath - URL-encoded project path
 * @param skillId - Skill directory name (e.g., "backend-express")
 * @returns SkillDetailResponse with full skill data
 */
router.get('/:projectPath/skills/:skillId', async (req: Request, res: Response) => {
  try {
    const { projectPath, skillId } = req.params;

    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: 'projectPath parameter is required',
      } as SkillDetailResponse);
    }

    if (!skillId) {
      return res.status(400).json({
        success: false,
        error: 'skillId parameter is required',
      } as SkillDetailResponse);
    }

    const projectFullPath = decodeURIComponent(projectPath);
    const skill = await skillsReaderService.getSkillDetail(projectFullPath, skillId);

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: `Skill "${skillId}" not found`,
      } as SkillDetailResponse);
    }

    return res.json({
      success: true,
      skill,
    } as SkillDetailResponse);

  } catch (error) {
    console.error('Error getting skill detail:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    } as SkillDetailResponse);
  }
});

/**
 * PUT /api/team/:projectPath/skills/:skillId
 *
 * Updates the SKILL.md content for a skill.
 *
 * @param projectPath - URL-encoded project path
 * @param skillId - Skill directory name (e.g., "backend-express")
 * @body { content: string } - New SKILL.md content
 * @returns SkillUpdateResponse
 */
router.put('/:projectPath/skills/:skillId', async (req: Request, res: Response) => {
  try {
    const { projectPath, skillId } = req.params;
    const { content, mcpTools } = req.body as { content?: string; mcpTools?: string[] };

    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: 'projectPath parameter is required',
      } as SkillUpdateResponse);
    }

    if (!skillId) {
      return res.status(400).json({
        success: false,
        error: 'skillId parameter is required',
      } as SkillUpdateResponse);
    }

    if (typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'content field is required and must be a string',
      } as SkillUpdateResponse);
    }

    if (mcpTools !== undefined && !Array.isArray(mcpTools)) {
      return res.status(400).json({
        success: false,
        error: 'mcpTools must be an array of strings',
      } as SkillUpdateResponse);
    }

    const projectFullPath = decodeURIComponent(projectPath);
    await skillsReaderService.updateSkillContent(projectFullPath, skillId, content, mcpTools);

    return res.json({
      success: true,
    } as SkillUpdateResponse);

  } catch (error) {
    console.error('Error updating skill:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    } as SkillUpdateResponse);
  }
});

/**
 * DELETE /api/team/:projectPath/skills/:skillId
 *
 * Deletes a skill directory and all its contents.
 *
 * @param projectPath - URL-encoded project path
 * @param skillId - Skill directory name (e.g., "backend-express")
 * @returns SkillUpdateResponse
 */
router.delete('/:projectPath/skills/:skillId', async (req: Request, res: Response) => {
  try {
    const { projectPath, skillId } = req.params;

    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: 'projectPath parameter is required',
      } as SkillUpdateResponse);
    }

    if (!skillId) {
      return res.status(400).json({
        success: false,
        error: 'skillId parameter is required',
      } as SkillUpdateResponse);
    }

    const projectFullPath = decodeURIComponent(projectPath);
    await skillsReaderService.deleteSkill(projectFullPath, skillId);

    return res.json({
      success: true,
    } as SkillUpdateResponse);

  } catch (error) {
    console.error('Error deleting skill:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    } as SkillUpdateResponse);
  }
});

export default router;
