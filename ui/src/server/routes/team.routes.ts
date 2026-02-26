import { Router, Request, Response } from 'express';
import { skillsReaderService } from '../services/skills-reader.service.js';
import { SkillsListResponse, SkillDetailResponse, SkillUpdateResponse } from '../../shared/types/team.protocol.js';

const router = Router();

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
    const { content } = req.body as { content?: string };

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

    const projectFullPath = decodeURIComponent(projectPath);
    await skillsReaderService.updateSkillContent(projectFullPath, skillId, content);

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

export default router;
